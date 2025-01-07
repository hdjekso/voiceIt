# Use the official Node.js 16 image as the base image
FROM node:16

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

# Set the working directory
WORKDIR /app

#Copy all files
COPY . .

# Copy Python project files and install dependencies
RUN ls -al /app/python && RUN python3.10 -m pip install --no-cache-dir -r python/requirements.txt
RUN ls -al /app/node && RUN cd node && npm install

# Expose port for the application
EXPOSE 4000

# Set environment variable
ENV NODE_ENV=production

# Set the working directory to the Node.js app directory and run the application
WORKDIR /app/node
CMD ["npm", "start"]
