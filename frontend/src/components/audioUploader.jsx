import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Button, Typography, List, ListItem, ListItemText, Container } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CancelIcon from '@mui/icons-material/Cancel';
import { useNavigate } from 'react-router-dom';
import { TextFields } from '@mui/icons-material';

const AudioUploader = ({ onError }) => {

  const [audioFile, setAudioFile] = useState(null);
  const [title, setTitle] = useState('Untitled Transcript'); // New state for title
  //const { getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate(); 
  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file.size > MAX_FILE_SIZE) {
      onError('File size exceeds the 20MB limit. Please try again with a smaller file.');
      return;
    }
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file);
    }
  };

  const handleFileRemove = (event) => {
    setAudioFile(null);
    document.getElementById('audio-upload-input').value = '';
  }

  const handleUploadClick = () => {
    document.getElementById('audio-upload-input').click();
  };

  //navigate to page to display new transcript, and pass in audio file for transcription
  const handleTranscribeNavigate = () => {
    if (!audioFile) {
      console.error('No audio file selected');
      return;
    }
    // Navigate to /transcript/:id and pass the file as state
    navigate(`/transcript/new`, { state: { audioFile, title } });
  };

  return (
    <Container maxWidth="m">
      <Box sx={{ 
        border: '1px dashed gray',
        padding: 4,
        borderRadius: 2,
        textAlign: 'center',
        backgroundColor: 'white',
      }}>
        <Typography variant="h4" gutterBottom sx={{marginBottom: 3}}>
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
          sx={{
            fontSize: '1.5rem',
            background: 'linear-gradient(to right, #550583 0%, #a848bb 100%)', // Gradient as background
            '&:hover': {
              background: 'linear-gradient(to right, #6c0d8c 0%, #c15bc2 100%)', // Optional hover gradient
            },
          }}
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
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem', fontSize: '1.5rem' }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={handleFileRemove}
                sx={{ fontSize: 'inherit' }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<TextFields />}
                onClick={handleTranscribeNavigate}
                sx={{fontSize: 'inherit'}}
              >
                Transcribe
              </Button>
            </div>
          </div>
        )}
      </Box>
    </Container>
  );
};

export default AudioUploader;
