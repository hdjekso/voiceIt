from flask import Flask, request, jsonify, Response
from vosk import Model, KaldiRecognizer
from pydub import AudioSegment
from pydub.utils import which
from transformers import pipeline
import json
import ffmpeg
import subprocess
import re
import sys
import traceback
import os
import sys
from pydub import AudioSegment
from io import BytesIO
import json
import re
from dotenv import load_dotenv
import os
from flask_cors import CORS

load_dotenv()

#NODE_URL = os.getenv('NODE_URL')
app = Flask(__name__)
CORS(app) #FIXME: allow reqs from node backend domain only for production

processor = None

def initialize_processor():
    global processor
    if processor is None:
        print("Initializing models...")
        processor = ChunkedAudioProcessor()
        processor.load_models()
        print("Models initialized successfully.")
    else:
        print("Processor already initialized.")

class ChunkedAudioProcessor:
    def __init__(self):
        self.FRAME_RATE = 16000
        self.CHANNELS = 1
        self.vosk_model = None
        self.summarizer = None
        self.is_initialized = False
        self.last_word = None # stores last word of previous chunk
        AudioSegment.converter = which("ffmpeg")
        self.current_dir = os.path.dirname(os.path.abspath(__file__))
        self.recasepunc_script = os.path.abspath(os.path.join(self.current_dir, 'recasepunc', 'recasepunc.py'))
        self.recasepunc_checkpoint = os.path.abspath(os.path.join(self.current_dir, 'recasepunc', 'checkpoint'))

    def load_models(self):
        try:
            print("Loading models...", file=sys.stderr)
            #self.vosk_model = Model(model_name="vosk-model-en-us-0.22")
            self.vosk_model = Model(model_name="vosk-model-small-en-us-0.15")
            self.summarizer = pipeline("summarization", model="t5-small")
            self.is_initialized = True
            print("Models loaded successfully", file=sys.stderr)
        except Exception as e:
            print(json.dumps({
                "error": f"Model loading failed: {str(e)}",
                "traceback": traceback.format_exc()
            }), file=sys.stderr)
            sys.exit(1)

    def remove_spaces(self, text):
        text = re.sub(r'\s+\.', '.', text) # remove spaces before '.'
        text = re.sub(r"\s*'\s*", "'", text) # remove spaces around '
        text = re.sub(r'\s+\?', '?', text) # remove spaces before '?'
        return text

    def clean_transcription(self, text):
        # First, remove any unnecessary spaces around apostrophes (if applicable)
        text = self.remove_spaces(text)
        # Remove duplicate last words caused by chunking, case insensitive, keeping the lowercase version
        cleaned_text = re.sub(r"(\b\w+\b)\s+(?i:\1)\b", lambda match: match.group(1).lower(), text)
        # Remove unnecessary period added by recasepunc
        cleaned_text = re.sub(r"\.\s*$", "", cleaned_text.strip())
        return cleaned_text

    def transcribe_audio_in_chunks(self, filename):
        if not self.is_initialized:
            return {"error": "Models not initialized"}
        mp3_filename = None
        try:
            rec = KaldiRecognizer(self.vosk_model, self.FRAME_RATE)
            rec.SetWords(True)

            audio = AudioSegment.from_file(filename)
            audio = audio.set_channels(self.CHANNELS)
            audio = audio.set_frame_rate(self.FRAME_RATE)

            SUPPORTED_FORMATS = {'mp3', 'wav', 'flac', 'aac', 'ogg'}
            file_extension = filename.split('.')[-1].lower()
            if file_extension == 'webm':
                # Convert WebM to MP3
                mp3_filename = filename.rsplit('.', 1)[0] + '.mp3'
                ffmpeg.input(filename).output(mp3_filename, acodec='libmp3lame').run()
                audio = AudioSegment.from_file(mp3_filename) # Load the MP3 file
                audio = audio.set_channels(self.CHANNELS)
                audio = audio.set_frame_rate(self.FRAME_RATE)
            elif file_extension not in SUPPORTED_FORMATS:
                print(json.dumps({
                    "error": f"Unsupported file format: {file_extension}",
                    "supported_formats": list(SUPPORTED_FORMATS)
                }), file=sys.stderr) 
                return

            step = 45000
            full_transcript = ""

            for i in range(0, len(audio), step):
                print(f"Progress: {i / len(audio) * 100:.2f}%", file=sys.stderr) 
                segment = audio[i:i + step]
                rec.AcceptWaveform(segment.raw_data)
                result = rec.Result()
                text = json.loads(result).get("text", "")

                if text.strip():
                    try: # Use sys.executable to ensure we use the same Python interpreter
                        cased = subprocess.check_output(
                            [sys.executable, self.recasepunc_script, "predict", self.recasepunc_checkpoint],
                            text=True,
                            input=text,
                            stderr=subprocess.PIPE # Capture stderr for better error reporting
                        )
                    except subprocess.CalledProcessError as e:
                        print(json.dumps({
                            "error": f"Recasepunc subprocess failed: {str(e)}",
                            "stderr": e.stderr.decode() if e.stderr else None
                        }), file=sys.stderr)
                        continue

                    punctuated = self.clean_transcription(self.remove_spaces(cased))
                    words = punctuated.split()
                    newLastWord = punctuated.split()[0].lower()
                    if self.last_word and newLastWord == self.last_word.lower():
                        punctuated = " ".join(words[1:])
                    self.last_word = words[-1] if words else None
                    full_transcript += f" {punctuated}"
                    yield f"{punctuated}"

            # Summarize the full transcript
            summary = self.summarize_text(full_transcript.strip())
            yield f"SUMMARY:{summary}"

        except Exception as e:
            print(json.dumps({
                "error": f"Transcription failed: {str(e)}",
                "traceback": traceback.format_exc()
            }), file=sys.stderr)
        
        finally:
            # Cleanup temporary MP3 file if it exists
            if mp3_filename and os.path.exists(mp3_filename):
                try:
                    os.remove(mp3_filename)
                except Exception as e:
                    print(f"Failed to delete temporary file {mp3_filename}: {str(e)}")

    def summarize_text(self, transcript):
        try:
            # Split into smaller chunks that respect sentence boundaries
            sentences = re.split('(?<=[.!?])\s+', transcript)
            current_chunk = []
            chunks = []
            current_length = 0
            
            for sentence in sentences:
                # Rough estimate of tokens (words)
                sentence_length = len(sentence.split())
                if current_length + sentence_length > 500:
                    if current_chunk:
                        chunks.append(' '.join(current_chunk))
                    current_chunk = [sentence]
                    current_length = sentence_length
                else:
                    current_chunk.append(sentence)
                    current_length += sentence_length
            # Add the last chunk if it exists
            if current_chunk:
                chunks.append(' '.join(current_chunk))
            # Process each chunk and combine summaries
            summaries = []
            for chunk in chunks:
                # Add safety check for minimum length
                if len(chunk.split()) < 30: # Skip very short chunks
                    summaries.append(chunk)
                    continue
                    
                try:
                    chunk_summary = self.summarizer(chunk, 
                        max_length=150, 
                        min_length=30, 
                        do_sample=False)
                    summaries.append(chunk_summary[0]['summary_text'])
                except Exception as e:
                    print(f"Warning: Failed to summarize chunk: {str(e)}", file=sys.stderr)
                    continue
            
            # Combine all summaries
            final_summary = ' '.join(summaries)
            # If the combined summary is still too long, summarize it again
            if len(final_summary.split()) > 500:
                try:
                    final_summary = self.summarizer(final_summary, 
                        max_length=150,
                        min_length=30,
                        do_sample=False)[0]['summary_text']
                except Exception as e:
                    print(f"Warning: Failed to create final summary: {str(e)}", file=sys.stderr)
            
            final_summary = self.remove_spaces(final_summary)
            return final_summary

        except Exception as e:
            return {
                "error": f"Summarization failed: {str(e)}",
                "traceback": traceback.format_exc()
            }

    def process_audio_file(self, audio_file_path):
        try:
            self.transcribe_audio_in_chunks(audio_file_path)
        except Exception as e:
            print(json.dumps({
                "error": f"Processing failed: {str(e)}",
                "traceback": traceback.format_exc()
            }), file=sys.stderr)


@app.route('/initialize', methods=['GET'])
def initialize():
    initialize_processor()
    return jsonify({"status": "Models initialized successfully"})

@app.route('/process', methods=['POST'])
def process_audio():
    if processor is None:
        return jsonify({"error": "Processor not initialized."}), 400

    audio_file = request.files.get('audio_file')
    if not audio_file:
        return jsonify({"error": "No audio file provided."}), 400

    audio_file_path = os.path.join("/tmp", audio_file.filename)
    audio_file.save(audio_file_path)
    jsonify({"status": "audio file saved."})

    def generate():
        try:
            # Yield the transcription and summary in chunks
            for chunk in processor.transcribe_audio_in_chunks(audio_file_path):
                yield chunk + "\n"
        except Exception as e:
            print(json.dumps({
                "error": f"Processing failed: {str(e)}",
                "traceback": traceback.format_exc()
            }), file=sys.stderr)
            yield json.dumps({
                "error": f"Processing failed: {str(e)}",
                "traceback": traceback.format_exc()
            })

    # Return the Response object with chunked data
    return Response(generate(), content_type='text/plain;charset=utf-8', status=200)



if __name__ == "__main__":
    #FIXME: change host for production
    app.run(debug=True, host="0.0.0.0", port=5000)