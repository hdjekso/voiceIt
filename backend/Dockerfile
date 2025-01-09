# Use the official Node.js 16 image as the base image
FROM node:18

RUN apt-get update && apt-get install -y curl

# Set the working directory
WORKDIR /app/backend/node

#Copy all files
COPY . .

# Ensure uploaded files directory has proper permissions
RUN mkdir -p /app/backend/node/uploads && chmod 777 /app/backend/node/uploads

# Add NodeSource repository for Node.js
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash -

# Install Node.js (includes npm)
RUN apt-get install -y nodejs

#Install node dependencies
RUN cd backend/node && npm install

#RUN ls -al /app/backend/python/models/vosk-model-en-us-0.22/

# Expose port for the application
EXPOSE 4000

# Set environment variable
ENV NODE_ENV=production

# Set the working directory to the Node.js app directory and run the application
WORKDIR /app/backend/node
CMD ["npm", "start"]
