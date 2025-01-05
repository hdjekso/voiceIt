require('dotenv').config()

const express = require('express')
const mongoose = require('mongoose')
const transcriptRoutes = require('./routes/transcriptRoutes')
const profileRoutes = require('./routes/profileRoutes')
const cors = require('cors')

// express app
const app = express()

// Allow requests from React app
app.use(cors({
  origin: process.env.APP_URL, // Allow React app
  methods: 'GET,POST,PATCH,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
}));

// middleware
app.use(express.json())

app.use((req, res, next) => {
  console.log(req.path, req.method)
  next()
})

// routes
app.use('/api/transcripts', transcriptRoutes)
app.use('/api', profileRoutes)

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