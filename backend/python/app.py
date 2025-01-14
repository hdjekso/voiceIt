from flask import Flask, request, jsonify, Response
from pydub import AudioSegment
from pydub.utils import which
import json
import ffmpeg
import sys
import traceback
import os
from io import BytesIO
from dotenv import load_dotenv
from flask_cors import CORS
import psutil
import time
import requests

def log_memory_usage(stage):
    process = psutil.Process()
    mem_info = process.memory_info()
    print(f"[{stage}] RAM usage: {mem_info.rss / (1024 * 1024):.2f} MB", file=sys.stderr)

load_dotenv()

app = Flask(__name__)
NODE_URL = os.getenv('NODE_URL')
LOCALHOST_URL = os.getenv('LOCALHOST_URL')
CORS(app, resources={r"/*": {"origins": [NODE_URL, LOCALHOST_URL]}})

CHUNK_SIZE = 45 * 1 * 1000  # 1 min in milliseconds
MAX_WORKERS = 3  # Limit concurrent processing

class ChunkedAudioProcessor:
    def __init__(self):
        self.FRAME_RATE = 16000
        self.CHANNELS = 1
        AudioSegment.converter = which("ffmpeg")
        self.current_dir = os.path.dirname(os.path.abspath(__file__))
        
    def process_audio_chunk(self, chunk):
        retries=3
        backoff_factor=2
        """Process a single audio chunk."""
        temp_chunk_path = f"temp_chunk_{time.time()}.wav"
        chunk.export(temp_chunk_path, format="wav")
        
        TRANSCRIPTION_API_URL = "https://api-inference.huggingface.co/models/openai/whisper-large-v3"
        headers = {"Authorization": f"Bearer {os.getenv('HUGGING_TOKEN')}"}
        
        with open(temp_chunk_path, "rb") as f:
            data = f.read()
        
        for attempt in range(retries):
            try:
                response = requests.post(TRANSCRIPTION_API_URL, headers=headers, data=data, timeout=30)
                if response.status_code == 200:
                    result = response.json()
                    transcript_chunk = result["text"].strip()
                    if isinstance(result, dict) and "text" in result:
                        return transcript_chunk
                else:
                    print(f"API returned status {response.status_code}. Retrying...", file=sys.stderr)
            except requests.exceptions.RequestException as e:
                print(f"Request failed: {e}. Retrying...", file=sys.stderr)
            time.sleep(backoff_factor ** attempt)
        
        error_msg = {
            "type": "error",
            "code": "TIMEOUT",
            "data": f"The transcription service timed out or encountered an error: {str(e)}"
        }
        return json.dumps(error_msg) + '\n'
        raise Exception("Max retries reached for chunk transcription")
        '''response = requests.post(TRANSCRIPTION_API_URL, headers=headers, data=data)
        result = response.json()
        
        if isinstance(result, dict) and "text" in result:
            return result["text"].strip()
        return ""'''

    def transcribe_audio_in_chunks(self, filename):
        wav_filename = None
        try:
            # Convert input file to standard format
            audio = AudioSegment.from_file(filename)
            audio = audio.set_channels(self.CHANNELS)
            audio = audio.set_frame_rate(self.FRAME_RATE)

            SUPPORTED_FORMATS = {'mp3', 'wav', 'flac', 'aac', 'ogg'}
            file_extension = filename.split('.')[-1].lower()
            if file_extension == 'webm':
                # Convert WebM to MP3
                wav_filename = filename.rsplit('.', 1)[0] + '.wav'
                ffmpeg.input(filename).output(wav_filename, acodec='pcm_s16le').run()
                audio = AudioSegment.from_file(wav_filename) # Load the wav file
                audio = audio.set_channels(self.CHANNELS)
                audio = audio.set_frame_rate(self.FRAME_RATE)
            elif file_extension not in SUPPORTED_FORMATS:
                print(json.dumps({
                    "error": f"Unsupported file format: {file_extension}",
                    "supported_formats": list(SUPPORTED_FORMATS)
                }), file=sys.stderr) 
                return

            # Process audio in chunks
            length_ms = len(audio)
            full_transcript = []
            
            for i in range(0, length_ms, CHUNK_SIZE):
                print(f"transcribing chunk {i}", file=sys.stderr)
                chunk = audio[i:min(i + CHUNK_SIZE, length_ms)]
                
                # Process chunk and get transcription
                chunk_transcript = self.process_audio_chunk(chunk)
                if chunk_transcript:
                    print(f"Type of chunk_transcript: {type(chunk_transcript)}")  # Debugging
                    if isinstance(chunk_transcript, str):
                        full_transcript.append(chunk_transcript)
                    else:
                        print(f"Unexpected type: {type(chunk_transcript)}", file=sys.stderr)
                    # Yield intermediate results
                    yield f"{chunk_transcript}\n"
                    print(f"chunk {i} transcription complete", file=sys.stderr)
                
                # Free up memory
                del chunk
                
                # Log memory usage
                log_memory_usage(f"chunk_{i}")
            
            # Combine all transcripts
            complete_transcript = " ".join(full_transcript)
            
            # Generate summary only after all chunks are processed
            if complete_transcript:
                summary = self.summarize_text(complete_transcript)
                yield f"SUMMARY:{summary}\n"
            
        except Exception as e:
            error_msg = {
                "error": f"Transcription failed: {str(e)}",
                "traceback": traceback.format_exc()
            }
            print(json.dumps(error_msg), file=sys.stderr)
            yield json.dumps(error_msg)
        
        current_directory = os.getcwd()

        # Loop through all files in the directory
        for file_name in os.listdir(current_directory):
            # Check if the file has a .wav extension
            if file_name.endswith('.wav'):
                file_path = os.path.join(current_directory, file_name)
                try:
                    # Delete the file
                    os.remove(file_path)
                    print(f"Deleted: {file_name}")
                except Exception as e:
                    print(f"Error deleting {file_name}: {e}")

        print("All .wav files have been deleted.")

    def summarize_text(self, transcript):
        # Break long transcripts into smaller chunks for summarization
        max_chunk_length = 4000  # Maximum characters per chunk
        chunks = [transcript[i:i + max_chunk_length] 
                 for i in range(0, len(transcript), max_chunk_length)]
        
        summaries = []
        SUMMARIZATION_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"
        headers = {"Authorization": f"Bearer {os.getenv('HUGGING_TOKEN')}"}
        
        for chunk in chunks:
            payload = {"inputs": chunk}
            response = requests.post(SUMMARIZATION_API_URL, headers=headers, json=payload)
            result = response.json()
            
            if isinstance(result, list) and len(result) > 0:
                summaries.append(result[0]['summary_text'].strip())
        
        # Combine chunk summaries
        return " ".join(summaries)

processor = None

def initialize_processor():
    global processor
    if processor is None:
        print("Initializing models...")
        processor = ChunkedAudioProcessor()
        print("Processor initialized successfully.")

@app.route('/process', methods=['POST'])
def process_audio():
    initialize_processor()
    log_memory_usage("before request")
    
    if processor is None:
        return jsonify({"error": "Processor not initialized."}), 400

    audio_file = request.files.get('audio_file')
    if not audio_file:
        return jsonify({"error": "No audio file provided."}), 400

    # Save file with unique timestamp to prevent conflicts
    timestamp = int(time.time())
    audio_file_path = os.path.join("/tmp", f"audio_{timestamp}_{audio_file.filename}")
    audio_file.save(audio_file_path)

    def generate():
        try:
            for chunk in processor.transcribe_audio_in_chunks(audio_file_path):
                yield chunk
        except Exception as e:
            error_msg = {
                "error": f"Processing failed: {str(e)}",
                "traceback": traceback.format_exc()
            }
            yield json.dumps(error_msg)
        
            try:
                os.remove(audio_file_path)
            except Exception as e:
                print(f"Cleanup error: {e}", file=sys.stderr)

    return Response(generate(), content_type='text/plain;charset=utf-8', status=200)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
