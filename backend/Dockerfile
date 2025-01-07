# Stage 1: Build Python environment
FROM python:3.10-slim AS builder

# Install dependencies
RUN apt-get update && apt-get install -y build-essential

# Install your Python packages
COPY python/requirements.txt .
RUN python3 -m pip install --no-cache-dir -r requirements.txt

# Stage 2: Build Node.js environment
FROM node:16

# Install dependencies for Python
COPY --from=builder /usr/local /usr/local

# Copy Node.js project files and install dependencies
COPY node/package*.json ./node/
RUN cd node && npm install

#Copy all files
COPY . .

# Expose port for the application
EXPOSE 4000

# Set environment variable
ENV NODE_ENV=production

# Set the working directory to the Node.js app directory and run the application
WORKDIR /app/node
CMD ["npm", "start"]
