require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const transcriptRoutes = require('./routes/transcriptRoutes')
const profileRoutes = require('./routes/profileRoutes')
const cors = require('cors')
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// express app
const app = express()

//save the recasepunc checkpoint file here
const saveDirectory = path.join(__dirname, '../python/recasepunc');
// Define fileURL
const fileUrl = 'https://recasepunc-checkpoint-bucket.s3.us-west-2.amazonaws.com/checkpoint';

// Function to download the file
async function downloadFile() {
  try {
    // Ensure the directory exists
    if (!fs.existsSync(saveDirectory)) {
      fs.mkdirSync(saveDirectory, { recursive: true });
    }
    
    const filePath = path.join(saveDirectory, 'checkpoint');
    
    // Check if the file already exists
    if (fs.existsSync(filePath)) {
      console.log('File already exists, skipping download:', filePath);
      return; // Exit the function if the file exists
    }

    // Download the file
    console.log('File not found, downloading...');
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(filePath, response.data);

    console.log('File saved successfully:', filePath);
  } catch (err) {
    console.error('Error downloading file:', err.message);
  }
}

// Route to manually trigger the download
app.get('/retrieve-and-save', async (req, res) => {
  await downloadFile();
  res.status(200).json({ message: 'File download triggered.' });
});

// Middleware and routes setup
app.use(express.json());

// Allow requests from React app
app.use(cors({
  origin: process.env.APP_URL, // Allow React app
  methods: 'GET,POST,PATCH,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
}));

// routes
app.use('/api/transcripts', transcriptRoutes)
app.use('/api', profileRoutes)

//log all incming requests
app.use((req, res, next) => {
  console.log(req.path, req.method)
  next()
})

const flaskUrl = process.env.FLASK_URL

// Initialize python ai models (initialize route)
async function initializeModels() {
  console.log(process.env.FLASK_URL)
  try {
    const response = await axios.get(`${flaskUrl}/initialize`);
    console.log(response.data); // {"status": "Models initialized successfully"}
  } catch (error) {
    console.error('Error initializing models:', error.response ? error.response.data : error.message);
  }
}

async function startServer() {
  //FIXME: remove for production
  //await downloadFile(); //wait for checkpoint file to finish downloading

  initializeModels();

  // connect to db
  mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('connected to database')
    // listen to port
    app.listen(process.env.PORT, () => {
      console.log('listening for requests on port', process.env.PORT)
    })
  })
  .catch((err) => {
    console.log(err)
  }) 
}

//start server
startServer();

