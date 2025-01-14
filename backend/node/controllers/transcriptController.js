const Transcript = require('../models/transcriptModel');
const { createTranscriptService } = require('../services/createTranscriptService');
const mongoose = require('mongoose');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// get all transcripts (title and snippet only)
const getTranscripts = async (req, res) => {
  try {
    // Log to verify we have the user
    console.log('User from token:', req.user)
    
    const userId = req.user.sub
    const transcripts = await Transcript.find({ userId })
      .select('title snippet createdAt')
      .sort({createdAt: -1})
 
    // Log the result
    console.log('Found transcripts:', transcripts)
    
    res.status(200).json(transcripts)
  } catch (error) {
    // Log the full error
    console.error('Transcript retrieval error:', error)
    
    res.status(500).json({ 
      error: 'Failed to retrieve transcripts',
      details: error.message 
    })
  }
}

// get a single transcript
const getTranscript = async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({error: 'No such transcript'})
  }

  try{
    const transcript = await Transcript
      .findById(id)
      .select('title transcription summary')
    if (!transcript) {
      return res.status(404).json({error: 'No such transcript'})
    }
    res.status(200).json(transcript)
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve transcript' });
  }
}

// create a new transcript
const createTranscript = async (req, res) => {
  const {title, snippet, transcription, summary} = req.body
  const userId = req.user.sub

  let emptyFields = []

  if (!title) {
    emptyFields.push('title')
  }
  if (!snippet) {
    emptyFields.push('snippet')
  }
  if (!transcription) {
    emptyFields.push('transcription')
  }
  if (emptyFields.length > 0) {
    return res.status(400).json({ error: 'Missing the following fields: ', emptyFields })
  }

  // add to the database
  try {
    const transcript = await Transcript.create({
      title,
      snippet,
      transcription,
      summary,
      userId
    })
    res.status(201).json(transcript)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

// delete a transcript
const deleteTranscript = async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({error: 'No such transcript'})
  }

  const transcript = await Transcript.findOneAndDelete({_id: id})

  if(!transcript) {
    return res.status(400).json({error: 'No such transcript'})
  }

  res.status(200).json(transcript)
}

// update a transcript
const updateTranscript = async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({error: 'No such transcript'})
  }

  try {
    const transcript = await Transcript.findOneAndUpdate(
      {_id: id}, 
      {...req.body},
      {new: true}
    )
    if (!transcript) {
      return res.status(400).json({error: 'No such transcript'})
    }
  
    res.status(200).json(transcript)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transcript' });
  }

}

const uploadAudioFile = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Set headers for streaming
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');

    const audioFilePath = path.join(__dirname, '../uploads', req.file.filename);

    // Prepare the form data for sending the file to the Flask API
    const form = new FormData();
    form.append('audio_file', fs.createReadStream(audioFilePath));

    console.log("starting transcription...")
    //call flask api, process audio
    axios.post(`${process.env.FLASK_URL}/process`, form, {
      headers: {
        ...form.getHeaders(),
      },
      responseType: 'stream',
      timeout: 300000, // 5 minute timeout for the entire request
    })
      .then(response => {
        let transcriptionData = '';
        let summary = '';
        let summaryGenerated = false;

        response.data.on('data', (chunk) => {
          let chunkStr = chunk.toString();
          console.log('Received chunk:', chunkStr);
          
          try {
            // Try to parse the chunk as JSON to check for errors
            const jsonChunk = JSON.parse(chunkStr);
            if (jsonChunk.error) {
              // Enhanced error type checking
              if (jsonChunk.error.includes('timed out') || 
                  jsonChunk.error.includes('timeout') ||
                  jsonChunk.error.includes('TimeoutError')) {
                res.write(JSON.stringify({ 
                  type: 'error', 
                  code: 'TIMEOUT',
                  data: 'The transcription service timed out. Please try again with a shorter audio file or try later.'
                }) + '\n');
              } else if (jsonChunk.error.includes('too busy')) {
                res.write(JSON.stringify({ 
                  type: 'error', 
                  code: 'BUSY',
                  data: 'The service is currently too busy. Please try again in a few minutes.'
                }) + '\n');
              } else {
                res.write(JSON.stringify({ 
                  type: 'error', 
                  code: 'TRANSCRIPTION_ERROR',
                  data: 'An error occurred during transcription: ' + jsonChunk.error
                }) + '\n');
              }
              // Clean up and end the response
              cleanupUploads();
              res.end();
              return;
            }
          } catch (e) {
            // Not JSON, process as normal chunk
            if (chunkStr.startsWith('SUMMARY:') || summaryGenerated) {
              console.log("summary detected");
              summaryGenerated = true;
              summary += chunkStr.replace('SUMMARY:', '').trim();
            } else if (chunkStr.trim() === "transcription complete") {
              transcriptionData += '.';
              res.write(JSON.stringify({ type: 'transcript', data: '.' }) + '\n');
            } else {
              transcriptionData += chunkStr + '\n';
              res.write(JSON.stringify({ type: 'transcript', data: chunkStr + '\n' }) + '\n');
            }
          }
        });
    
        response.data.on('end', () => {
          console.log('Python process closed');
          if (summary) {
            res.write(JSON.stringify({ type: 'summary', data: summary }) + '\n');
          }
          res.end();
    
          try {
            const userId = req.user?.sub || 'default_user';
            createTranscriptService({
              title: 'Untitled Transcript',
              snippet: transcriptionData.substring(0, 100),
              transcription: transcriptionData,
              summary: summary,
              userId,
            });
            console.log('Transcript saved successfully');
          } catch (error) {
            console.error('Failed to save transcript:', error.message);
          }

          cleanupUploads();
        });
      })
      .catch((error) => {
        console.error('Error during API call:', error);
        // Enhanced axios error handling
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          res.write(JSON.stringify({ 
            type: 'error',
            code: 'TIMEOUT',
            data: 'The connection to the transcription service timed out. Please try again.'
          }) + '\n');
        } else {
          res.write(JSON.stringify({ 
            type: 'error',
            code: 'CONNECTION_ERROR',
            data: 'Error connecting to the transcription service. Please try again.'
          }) + '\n');
        }
        cleanupUploads();
        res.end();
      });
  } catch (error) {
    console.error('Error in uploadAudioFile:', error);
    res.write(JSON.stringify({ 
      type: 'error',
      code: 'SERVER_ERROR',
      data: 'Internal server error occurred. Please try again.'
    }) + '\n');
    cleanupUploads();
    res.end();
  }
};

// Helper function to clean up uploads folder
const cleanupUploads = () => {
  const uploadsFolder = path.join(__dirname, '../uploads');
  fs.readdir(uploadsFolder, (err, files) => {
    if (err) {
      console.error(`Error reading the directory: ${err.message}`);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(uploadsFolder, file);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting file ${file}: ${err.message}`);
        } else {
          console.log(`Deleted: ${file}`);
        }
      });
    });

    console.log('All files in the uploads folder have been deleted.');
  });
};

module.exports = {
  getTranscripts,
  getTranscript,
  createTranscript,
  deleteTranscript,
  updateTranscript,
  uploadAudioFile
}


