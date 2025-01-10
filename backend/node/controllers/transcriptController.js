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

//new version with separated summary
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
    })
      .then(response => {
        let transcriptionData = '';
        let summary = '';
        let isFirstChunk = true;  // Track whether it's the first chunk

        response.data.on('data', (chunk) => {
          let chunkStr = chunk.toString().replace(/\n/g, ' ');  // Clean up the chunk data
          console.log('Received chunk:', chunkStr);
          
          // Add a space before the chunk unless it's the first one OR summary
          if (!isFirstChunk && !chunkStr.startsWith('SUMMARY:')) {
            chunkStr = ' ' + chunkStr;
          } else {
            isFirstChunk = false;  // After the first chunk, set the flag to false
          }

          // Add a newline after the last period in the chunk
          const periodIndex = chunkStr.lastIndexOf('.');
          if (periodIndex !== -1) {
            // Remove the space after the last period (if it exists)
            chunkStr = chunkStr.slice(0, periodIndex + 1) + '\n\n' + chunk.slice(periodIndex + 2);
          }
          chunkStr = chunkStr.slice(0, -1); //remove last char of chunk (whitespace)      

          if (chunkStr.startsWith('SUMMARY:')) {
            console.log("summary detected")
            // Capture the summary
            summary = chunkStr.replace('SUMMARY:', '').trim();
          } else if (chunkStr.trim() === "transcription complete") { //append '.' to transcript
            transcriptionData += '.';
            res.write(JSON.stringify({ type: 'transcript', data: '.' }) + '\n');
          } else { 
            // Stream transcript chunks
            transcriptionData += chunkStr;
            res.write(JSON.stringify({ type: 'transcript', data: chunkStr }) + '\n');
          }
        });
    
        response.data.on('end', () => {
          console.log('Python process closed');
          //transcriptionData += '.';
          //res.write(JSON.stringify({ type: 'transcript', data: '.' }) + '\n');
          res.write(JSON.stringify({ type: 'summary', data: summary }) + '\n');
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

          // Delete up the uploaded file
          try {
            if (fs.existsSync(audioFilePath)) {
              fs.unlinkSync(audioFilePath); // Delete the uploaded file
              console.log(`File ${audioFilePath} deleted successfully.`);
            }
          } catch (err) {
            console.error(`Failed to delete file ${audioFilePath}:`, err);
          }
        });
      })
      .catch((error) => {
        console.error('Error during API call:', error);
        res.status(500).json({ error: 'Error processing audio' });
      });
    /*console.log(audioFilePath)

    const pythonRootDir = path.resolve(__dirname, '../../python');
    const pythonScriptPath = path.join(pythonRootDir, 'smart_transcriber2.py');
    const pythonVenvPath = path.join(pythonRootDir, 'venv/Scripts/python.exe');

    const pythonProcess = spawn(
      pythonVenvPath,
      [pythonScriptPath, audioFilePath],
      {
        env: {
          ...process.env,
          PYTHONPATH: `${pythonRootDir}${path.delimiter}${path.join(pythonRootDir, 'recasepunc')}`
        },
        cwd: pythonRootDir
      }
    );*/

    /*pythonProcess.stdout.on('data', (data) => {
      //const chunk = data.toString();
      let chunk = data.toString().replace(/\n/g, ' ');  // Remove newline characters
      console.log('Received chunk:', chunk);

      // Add a space before the chunk unless it's the first one OR summary
      if (!isFirstChunk && !chunk.startsWith('SUMMARY:')) {
        chunk = ' ' + chunk;
      } else {
        isFirstChunk = false;  // After the first chunk, set the flag to false
      }

      // Add a newline after the last period in the chunk
      const periodIndex = chunk.lastIndexOf('.');
      if (periodIndex !== -1) {
        // Remove the space after the last period (if it exists)
        chunk = chunk.slice(0, periodIndex + 1) + '\n\n' + chunk.slice(periodIndex + 2);
      }
      chunk = chunk.slice(0, -1); //remove last char of chunk (whitespace)      

      if (chunk.startsWith('SUMMARY:')) {
        console.log("summary detected")
        // Capture the summary
        summary = chunk.replace('SUMMARY:', '').trim();
      } else {
        // Stream transcript chunks
        transcriptionData += chunk;
        res.write(JSON.stringify({ type: 'transcript', data: chunk }) + '\n');
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python error: ${data.toString()}`);
    });

    pythonProcess.on('close', async (code) => {
      console.log('Python process closed with code:', code);
      transcriptionData += '.';
      res.write(JSON.stringify({ type: 'transcript', data: '.' }) + '\n');
      //res.write(JSON.stringify({ type: 'end', message: 'Transcription completed' }) + '\n');
      res.write(JSON.stringify({ type: 'summary', data: summary }) + '\n');
      res.end();

        // Delete up the uploaded file
        try {
          if (fs.existsSync(audioFilePath)) {
            fs.unlinkSync(audioFilePath); // Delete the uploaded file
            console.log(`File ${audioFilePath} deleted successfully.`);
          }
        } catch (err) {
          console.error(`Failed to delete file ${audioFilePath}:`, err);
        }

      if (code === 0) {
        try {
          const userId = req.user?.sub || 'default_user';
          await createTranscriptService({
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
      } else {
        console.error('Error processing audio file');
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      res.status(500).json({ error: 'Failed to start processing' });
    });*/
  } catch (error) {
    console.error('Error in uploadAudioFile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getTranscripts,
  getTranscript,
  createTranscript,
  deleteTranscript,
  updateTranscript,
  uploadAudioFile
}


