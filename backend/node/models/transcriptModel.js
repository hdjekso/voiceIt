const mongoose = require('mongoose')

const Schema = mongoose.Schema

const transcriptSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  snippet: {
    type: String,
    required: true
  },
  transcription: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: false
  },
  userId: { // Auth0 User ID
    type: String,
    required: true 
  }
}, { timestamps: true })

module.exports = mongoose.model('Transcript', transcriptSchema)