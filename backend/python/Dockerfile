# Base image with Python 3.10
FROM python:3.10-slim

# Install system dependencies
# Combine RUN commands to reduce layers and image size
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory to match the root directory
WORKDIR /app

# Copy only the requirements file first to leverage Docker cache
COPY requirements.txt .

# Create and activate virtual environment, then install dependencies
# Using a virtual environment in Docker is optional but can help isolate dependencies
RUN python3.10 -m venv venv && \
    . venv/bin/activate && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
# Do this after installing dependencies to leverage cache
COPY . .

# Set permissions for the virtual environment
RUN chmod -R 755 venv

# Expose the Flask port
EXPOSE 5000

# Set Flask environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Command to run the Flask application
# Using the virtual environment's Python to ensure we use the correct dependencies
CMD ["./venv/bin/flask", "run", "--host=0.0.0.0"]