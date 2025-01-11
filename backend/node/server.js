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

