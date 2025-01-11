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

CHUNK_SIZE = 60 * 15 * 100  # 1.5 min in milliseconds
MAX_WORKERS = 3  # Limit concurrent processing

class ChunkedAudioProcessor:
    def __init__(self):
        self.FRAME_RATE = 16000
        self.CHANNELS = 1
        AudioSegment.converter = which("ffmpeg")
        self.current_dir = os.path.dirname(os.path.abspath(__file__))
        
    def process_audio_chunk(self, chunk):
        """Process a single audio chunk."""
        temp_chunk_path = f"temp_chunk_{time.time()}.wav"
        try:
            chunk.export(temp_chunk_path, format="wav")
            
            TRANSCRIPTION_API_URL = "https://api-inference.huggingface.co/models/openai/whisper-large-v3"
            headers = {"Authorization": f"Bearer {os.getenv('HUGGING_TOKEN')}"}
            
            with open(temp_chunk_path, "rb") as f:
                data = f.read()
            response = requests.post(TRANSCRIPTION_API_URL, headers=headers, data=data)
            result = response.json()
            
            if isinstance(result, dict) and "text" in result:
                return result["text"].strip()
            return ""
            
        finally: #delete all audio files
            '''if os.path.exists(temp_chunk_path):
                os.remove(temp_chunk_path)'''
            # Get the current directory
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

    def transcribe_audio_in_chunks(self, filename):
        try:
            # Convert input file to standard format
            audio = AudioSegment.from_file(filename)
            audio = audio.set_channels(self.CHANNELS)
            audio = audio.set_frame_rate(self.FRAME_RATE)

            # Process audio in chunks
            length_ms = len(audio)
            full_transcript = []
            
            for i in range(0, length_ms, CHUNK_SIZE):
                chunk = audio[i:min(i + CHUNK_SIZE, length_ms)]
                
                # Process chunk and get transcription
                chunk_transcript = self.process_audio_chunk(chunk)
                if chunk_transcript:
                    full_transcript.append(chunk_transcript)
                    # Yield intermediate results
                    yield f"{chunk_transcript}\n"
                
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
        
        finally:
            # Cleanup
            if os.path.exists(filename):
                os.remove(filename)

    def summarize_text(self, transcript):
        # Break long transcripts into smaller chunks for summarization
        max_chunk_length = 1000  # Maximum characters per chunk
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

    return Response(generate(), content_type='text/plain;charset=utf-8', status=200)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)