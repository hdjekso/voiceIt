# Use the official Node.js 16 image as the base image
#root directory: backend/node
FROM node:18

RUN apt-get update && apt-get install -y curl

# Set the working directory
WORKDIR /app

#Copy all files
COPY . .

# Ensure uploaded files directory has proper permissions
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Add NodeSource repository for Node.js
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -

# Install Node.js (includes npm)
RUN apt-get install -y nodejs

#Install node dependencies
RUN npm install

#RUN ls -al /app/backend/python/models/vosk-model-en-us-0.22/

# Expose port for the application
EXPOSE 4000

# Set environment variable
ENV NODE_ENV=production

# Set the working directory to the Node.js app directory and run the application
CMD ["npm", "start"]
