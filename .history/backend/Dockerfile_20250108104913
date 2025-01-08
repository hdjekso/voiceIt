# Use the official Node.js 16 image as the base image
FROM node:18

# Install required dependencies for building Python from source
RUN apt-get update && apt-get install -y \
    build-essential \
    zlib1g-dev \
    libncurses5-dev \
    libgdbm-dev \
    libnss3-dev \
    libssl-dev \
    libreadline-dev \
    libffi-dev \
    curl \
    libbz2-dev \
    liblzma-dev \
    tk-dev \
    sudo 

# Download Python 3.10 and install it
RUN curl -o /tmp/Python-3.10.0.tgz https://www.python.org/ftp/python/3.10.0/Python-3.10.0.tgz && \
    tar -xvzf /tmp/Python-3.10.0.tgz -C /tmp && \
    cd /tmp/Python-3.10.0 && \
    ./configure --enable-optimizations && \
    make -j 4 && \
    make altinstall

# Ensure pip is installed for Python 3.10
RUN curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py && \
    python3.10 get-pip.py && \
    rm get-pip.py

# Set the working directory
WORKDIR /app

#Copy all files
COPY . .

# Download the checkpoint file from S3 during build process
RUN mkdir -p /app/python/recasepunc && \
    curl -o /app/python/recasepunc/checkpoint https://recasepunc-checkpoint-bucket.s3.us-west-2.amazonaws.com/checkpoint

RUN ls -al /app
RUN ls -al /app/backend/python
RUN ls -al /app/backend/node

# Create the Python virtual environment
#RUN python3.10 -m venv backend/python/venv

# Install Python dependencies
#RUN backend/python/venv/bin/pip install --no-cache-dir -r backend/python/requirements.txt

# Install ffmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Install vosk model
RUN python3.10 -m venv backend/python/venv && \
    . backend/python/venv/bin/activate && \
    pip install --no-cache-dir -r backend/python/requirements.txt
    #python -m vosk.model_downloader vosk-model-en-us-0.22

# Make sure Python script is executable
RUN chmod +x /app/backend/python/smart_transcriber2.py

# Set correct permissions for venv
RUN chmod -R 755 /app/backend/python/venv

# Ensure uploaded files directory has proper permissions
RUN mkdir -p /app/backend/node/uploads && chmod 777 /app/backend/node/uploads

#Install node dependencies
RUN cd backend/node && npm install

# Expose port for the application
EXPOSE 4000

# Set environment variable
ENV NODE_ENV=production

# Set the working directory to the Node.js app directory and run the application
WORKDIR /app/backend/node
CMD ["npm", "start"]
