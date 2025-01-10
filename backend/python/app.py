from flask import Flask, request, jsonify, Response
from pydub import AudioSegment
from pydub.utils import which
import json
import ffmpeg
import sys
import traceback
import os
import sys
from pydub import AudioSegment
from io import BytesIO
import json
from dotenv import load_dotenv
import os
from flask_cors import CORS
import psutil
import time
import requests


def log_memory_usage(stage):
    """Logs memory usage at different stages."""
    process = psutil.Process()
    mem_info = process.memory_info()
    print(f"[{stage}] RAM usage: {mem_info.rss / (1024 * 1024):.2f} MB")

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
        print("Processor initialized successfully.")
    else:
        print("Processor already initialized.")

class ChunkedAudioProcessor:
    def __init__(self):
        self.FRAME_RATE = 16000
        self.CHANNELS = 1
        self.summarizer = None
        AudioSegment.converter = which("ffmpeg")
        self.current_dir = os.path.dirname(os.path.abspath(__file__))

    def transcribe_audio_in_chunks(self, filename):
        mp3_filename = None
        try:

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

            # Export processed audio to a temporary file
            temp_audio_path = "temp_audio.wav"
            audio.export(temp_audio_path, format="wav")

            TRANSCRIPTION_API_URL = "https://api-inference.huggingface.co/models/openai/whisper-large-v3"
            HUGGING_TOKEN = os.getenv('HUGGING_TOKEN')
            headers = {"Authorization": f"Bearer {HUGGING_TOKEN}"}
            with open(temp_audio_path, "rb") as f:
                data = f.read()
            response = requests.post(TRANSCRIPTION_API_URL, headers=headers, data=data)
            print(response.json(), file=sys.stderr)
            result = response.json()
            if isinstance(result, dict) and "text" in result:
                print((result['text']).strip(), file=sys.stderr)
                yield (result['text']).strip()
            else:
                # Handle unexpected response format
                error_message = {
                    "error": "Unexpected response format",
                    "response": result
                }
                print(json.dumps(error_message), file=sys.stderr)
                yield json.dumps(error_message)
            full_transcript = (result['text']).strip()

            log_memory_usage("after transcription")
            # Summarize the full transcript
            summary = self.summarize_text(full_transcript)
            yield f"SUMMARY:{summary}"
            print("summary completed", file=sys.stderr)
            log_memory_usage("after summary")

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
        print(f"received transcript to summarize: {transcript}")
        payload = {
            "inputs": transcript
        }
        SUMMARIZATION_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"
        HUGGING_TOKEN = os.getenv('HUGGING_TOKEN')
        headers = {"Authorization": f"Bearer {HUGGING_TOKEN}"}
        response = requests.post(SUMMARIZATION_API_URL, headers=headers, json=payload)
        print(f"summarized response body: {response.json()}", file=sys.stderr)
        result = response.json()
        if isinstance(result, list) and len(result) > 0:
            print(result[0]['summary_text'], file=sys.stderr)
            return (result[0]['summary_text']).strip()
        else:
            # Handle unexpected response format
            error_message = {
                "error": "Unexpected response format",
                "response": result
            }
            print(json.dumps(error_message), file=sys.stderr)
            return json.dumps(error_message)


@app.route('/initialize', methods=['GET'])
def initialize():
    initialize_processor()
    return jsonify({"status": "Processor initialized successfully"})

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
                #yield json.dumps(chunk) + "\n"
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