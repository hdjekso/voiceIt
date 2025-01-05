import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Button, Typography, List, ListItem, ListItemText } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CancelIcon from '@mui/icons-material/Cancel';

const PythonTest = () => {
  const [transcription, setTranscription] = useState('hi');
  const [audioFile, setAudioFile] = useState(null);
  const {isAuthenticated, loginWithRedirect, isLoading, getAccessTokenSilently} = useAuth0();

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
    }
  };

  const handleTranscribe = async () => {
    if (!audioFile) {
      console.error('No audio file selected');
      return;
    }
  
    try {
      // Prepare FormData with the audio file
      const formData = new FormData();
      formData.append('audioFile', audioFile);
  
      // Get the token
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUDIENCE,
        },
      });
  
      // Make the API request
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/transcripts/upload`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload audio file: ${errorText}`);
      }
  
      // Handle streamed response
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let transcriptionText = '';
  
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          transcriptionText += decoder.decode(value, { stream: true });
          setTranscription(transcriptionText); // Update transcription as chunks are received
        }
      } else {
        throw new Error('No response body found');
      }
  
    } catch (error) {
      console.error('Error during transcription:', error.message);
      setTranscription(`Error: ${error.message}`);
    }
  };  

  const handleFileRemove = () => {
    setAudioFile(null);
  }

  const handleUploadClick = () => {
    document.getElementById('audio-upload-input').click();
  };

  return (
    <div>
      <Box sx={{ border: '1px dashed gray', padding: 3, borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Upload an Audio File
        </Typography>
        <input
          id="audio-upload-input"
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={handleUploadClick}
          sx={{fontSize: '1.5rem'}}
        >
          Choose File
        </Button>
        {audioFile && (
          <div>
            <List sx={{ display: 'flex', justifyContent: 'center' }}>
              <ListItem sx={{ textAlign: 'center', justifyContent: 'center', width: '100%' }}>
                <ListItemText 
                  primary={audioFile.name}
                  secondary={(audioFile.size / 1024).toFixed(2) + ' KB'}
                  sx={{
                    '& .MuiListItemText-primary': { fontSize: '1.5rem' }, // Adjust primary text size
                    '& .MuiListItemText-secondary': { fontSize: '1.2rem' }, // Adjust secondary text size
                    textAlign: 'center'
                  }}
                />
              </ListItem>
            </List>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={handleFileRemove}
                sx={{ fontSize: '1.5rem' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                sx={{ fontSize: '1.5rem' }}
                onClick={handleTranscribe}
              >
                Transcribe
              </Button>
            </div>
          </div>
        )}
      </Box>
      <div style={{padding: '4rem', margin: '4rem', fontSize: "2rem"}}>{transcription}</div>
    </div>

  );
};

export default PythonTest;
