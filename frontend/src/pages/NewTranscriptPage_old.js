import React, { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Typography, Container, Paper, CircularProgress, IconButton, Box } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { FetchClient } from '../utils/fetchClient';

//does not separate transcript and summary
const NewTranscript = () => {
  const location = useLocation();
  const navigate = useNavigate(); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const {isAuthenticated, loginWithRedirect, getAccessTokenSilently, isLoading} = useAuth0();
  const [transcript, setTranscript] = useState('');

  const audioFile = location.state?.audioFile;
  const [title, setTitle] = useState(location.state?.title || 'Untitled Transcript');

  const handleTranscribe = useCallback(async () => {
    if (!audioFile) {
      console.error('No audio file passed');
      return;
    }

    try {
      setLoading(true);

      // Get token using FetchClient
      const fetchClient = new FetchClient(
        getAccessTokenSilently,
        process.env.REACT_APP_AUTH0_AUDIENCE
      );

      // Prepare FormData
      const formData = new FormData();
      formData.append('audioFile', audioFile);

      // Make the request using the token from FetchClient
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUDIENCE,
          scope: 'openid profile email offline_access'
        },
      });

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

      // Stream transcript updates
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let transcriptText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          transcriptText += chunk;
          setTranscript((prev) => prev + chunk); // Update transcript in real-time
        }
      }

    } catch (error) {
      console.error('Error during transcription:', error.message);
      setTranscript(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [audioFile, getAccessTokenSilently]);

  useEffect(() => {
    if (!audioFile) {
      console.error('No audio file passed, redirecting...');
      loginWithRedirect();
      return;
    }
    handleTranscribe();
  }, [handleTranscribe, audioFile]);

  if (!isAuthenticated) {
    loginWithRedirect();
    return <div>Redirecting...</div>;
  }

  if (error) {
    return (
      <Container>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <div>
      <Box sx={{ alignSelf: 'flex-start', m: 3 }}>
        <IconButton 
          onClick={() => navigate(-1)} 
          size="large"
          sx={{ 
            bgcolor: 'white',
            '&:hover': { bgcolor: 'grey.100' },
            boxShadow: 1,
            width: 48,
            height: 48,
            '& .MuiSvgIcon-root': {
              fontSize: 24
            }
          }}
        >
          <ArrowBack />
        </IconButton>
      </Box>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography gutterBottom sx={{ fontSize: '3.5rem' }}>
            {title}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '1.75rem' }}>
            {transcript}
          </Typography>
          {loading && (
            <Container sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
              <CircularProgress />
              <Typography 
                sx={{ 
                  color: 'gray', 
                  fontSize: '1.3rem', 
                  mt: 1 
                }}
              >
                Transcribing...
              </Typography>
            </Container>
          )}
        </Paper>
      </Container>
    </div>
  );
};

export default NewTranscript;