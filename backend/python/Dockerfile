# Use an appropriate Python base image
FROM python:3.10-slim

RUN apt-get update && apt-get install -y curl

# Ensure pip is installed for Python 3.10
RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python3.10 get-pip.py && \
    rm get-pip.py

# Set the working directory
WORKDIR /app/backend/python

#Copy all files
COPY . .

# Download the checkpoint file from S3 during build process
RUN mkdir -p /app/backend/python/recasepunc && \
    curl -o /app/backend/python/recasepunc/checkpoint https://recasepunc-checkpoint-bucket.s3.us-west-2.amazonaws.com/checkpoint

# Create the Python virtual environment
#RUN python3.10 -m venv backend/python/venv

# Install Python dependencies
#RUN backend/python/venv/bin/pip install --no-cache-dir -r backend/python/requirements.txt

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Install venv + dependencies
RUN python3.10 -m venv backend/python/venv && \
    . backend/python/venv/bin/activate && \
    pip install --no-cache-dir -r backend/python/requirements.txt

# Set environment variables
ENV MODEL_DIR=/app/backend/python/models
ENV VOSK_MODEL_NAME=vosk-model-en-us-0.22
#ENV VOSK_MODEL_NAME=vosk-model-small-en-us-0.15

# Download and prepare the Vosk model
RUN mkdir -p $MODEL_DIR \
    && apt-get update && apt-get install -y wget unzip \
    && wget -O $MODEL_DIR/$VOSK_MODEL_NAME.zip https://alphacephei.com/vosk/models/$VOSK_MODEL_NAME.zip \
    && unzip $MODEL_DIR/$VOSK_MODEL_NAME.zip -d $MODEL_DIR \
    && rm $MODEL_DIR/$VOSK_MODEL_NAME.zip

# Set model path in your Python code
ENV VOSK_MODEL_PATH=$MODEL_DIR/$VOSK_MODEL_NAME

# Set correct permissions for venv
RUN chmod -R 755 /app/backend/python/venv

# Expose port for the application
EXPOSE 5000

# Set the working directory to the Node.js app directory and run the application
WORKDIR /app/backend/python
CMD ["flask", "run"]
