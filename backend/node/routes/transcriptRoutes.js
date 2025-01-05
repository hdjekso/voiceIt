const express = require('express')
const router = express.Router()
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const checkJwt = require('../middleware/checkJwt');
const checkOwnership = require('../middleware/checkOwnership');

const {
  getTranscripts, 
  getTranscript, 
  createTranscript, 
  deleteTranscript, 
  updateTranscript,
  uploadAudioFile
} = require('../controllers/transcriptController')

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create uploads directory if it doesn't exist
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)){
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, 'uploads/'); // Save files in 'uploads' folder
  },
  filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Unique filename with timestamp
  }
});
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
      console.log('Received file:', file.originalname);
      console.log('Mimetype:', file.mimetype);
      // Accept audio files
      if (file.mimetype.startsWith('audio/')) {
          cb(null, true);
      } else {
          cb(new Error('Invalid file type'));
      }
  }
});

// Apply middleware to all routes
router.use(checkJwt);

// GET all audio transcripts (title, date, snippet)
router.get('/', getTranscripts)

// GET a single transcript
router.get('/:id', checkOwnership, getTranscript)

// DELETE a transcript
router.delete('/:id', checkOwnership, deleteTranscript)

// UPDATE a transcript (rename/ add summary)
router.patch('/:id', checkOwnership, updateTranscript)

//POST the audio file to the python script
router.post('/upload', upload.single('audioFile'), uploadAudioFile)

// POST a new transcript
router.post('/', createTranscript)

module.exports = router


