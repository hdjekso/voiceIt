import React, { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Typography, Container, Paper, CircularProgress, IconButton, Box, Tabs, Tab, Snackbar, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { FetchClient } from '../utils/fetchClient';

const NewTranscript = () => {
  const location = useLocation();
  const navigate = useNavigate(); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated, loginWithRedirect, getAccessTokenSilently } = useAuth0();

  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [activeTab, setActiveTab] = useState('transcript');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const audioFile = location.state?.audioFile;
  const [title, setTitle] = useState(location.state?.title || 'Untitled Transcript');

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  //background color
  useEffect(() => {
    // Set background color for the entire page
    document.body.style.backgroundColor = '#f5f5f5'; // Set desired color

    return () => {
      // Reset background color when component unmounts
      document.body.style.backgroundColor = ''; // Reset to default
    };
  }, []);

  const handleTranscribe = useCallback(async () => {
    if (!audioFile) {
      console.error('No audio file passed');
      return;
    }

    try {
      setLoading(true);
      setTranscript(''); // Reset transcript at start
      setSummary(''); // Reset summary at start

      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: process.env.REACT_APP_AUTH0_AUDIENCE,
          scope: 'openid profile email offline_access'
        },
      });

      const formData = new FormData();
      formData.append('audioFile', audioFile);

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

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.trim().split('\n');

          for (const line of lines) {
            if (!line) continue;

            try {
              const parsed = JSON.parse(line);
              
              if (parsed.type === 'transcript') {
                // Append new transcript chunk
                setTranscript(prev => prev + parsed.data);
              } else if (parsed.type === 'summary') {
                // Update summary separately
                setSummary(parsed.data);
              } else if (parsed.type === 'error') {
                // Handle different error types
                let message = '';
                let severity = 'error';
                let shouldNavigate = false;
      
                switch (parsed.code) {
                  case 'TIMEOUT':
                    //message = 'The transcription took too long. Please try again with a shorter audio file.';
                    message = 'The transcription service is currently busy. Please try again in a few minutes.';
                    severity = 'error';
                    shouldNavigate = true;
                    break;
                  case 'BUSY':
                    message = 'The transcription service is currently busy. Please try again in a few minutes.';
                    severity = 'warning';
                    shouldNavigate = true;
                    break;
                  case 'CONNECTION_ERROR':
                    message = 'Lost connection to the transcription service. Please check your internet and try again.';
                    severity = 'error';
                    shouldNavigate = true;
                    break;
                  case 'TRANSCRIPTION_ERROR':
                    message = 'There was an error transcribing your audio. Please try again.';
                    severity = 'error';
                    shouldNavigate = true;
                    break;
                  case 'SERVER_ERROR':
                    message = 'An internal server error occurred. Please try again later.';
                    severity = 'error';
                    shouldNavigate = true;
                    break;
                  default:
                    // For backwards compatibility with the old error format
                    if (parsed.data.includes('too busy')) {
                      message = 'Models are busy, please try again later.';
                      severity = 'warning';
                      shouldNavigate = true;
                    } else {
                      message = parsed.data || 'An unknown error occurred.';
                      severity = 'error';
                      shouldNavigate = true;
                    }
                }
      
                setSnackbar({
                  open: true,
                  message,
                  severity
                });
      
                if (shouldNavigate) {
                  // Wait for 3 seconds before navigating
                  setTimeout(() => {
                    navigate('/dashboard');
                  }, 3000);
                }
              }
            } catch (err) {
              console.warn('Failed to parse chunk:', err.message);
            }
          }
        }
      }

    } catch (error) {
      console.error('Error during transcription:', error.message);
      setError(`Error: ${error.message}`);
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

  const renderContent = () => {
    if (loading && !transcript && !summary) {
      return (
        <Container sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4, pb: 6 }}>
          <CircularProgress sx={{ mt: 2 }}/>
          <Typography sx={{ color: 'gray', fontSize: '1.75rem', mt: 1 }}>
            Transcribing...
          </Typography>
        </Container>
      );
    }
    if (loading && activeTab === 'transcript'){
      return (
        <>
          <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '1.75rem' }}>
            {transcript}
          </Typography>
          <Container sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4, pb: 6 }}>
            <CircularProgress sx={{ mt: 2 }}/>
            <Typography sx={{ color: 'gray', fontSize: '1.75rem', mt: 1 }}>
              Transcribing...
            </Typography>
          </Container>
        </>
      );
    }
    if (activeTab === 'summary' && summary) {
      return (
        <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '1.75rem' }}>
          {summary || 'Summary will be displayed here once available.'}
        </Typography>
      );
    } else if (activeTab === 'summary') {
      return (
        <Container sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4, pb: 6 }}>
          <CircularProgress sx={{ mt: 2 }}/>
          <Typography sx={{ color: 'gray', fontSize: '1.75rem', mt: 1 }}>
            Summarizing...
          </Typography>
        </Container>
      );
    }

    if (activeTab === 'transcript') {
      return (
        <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '1.75rem' }}>
          {transcript}
        </Typography>
      );
    }
  };

  return (
    <div>
      <Box sx={{ alignSelf: 'flex-start', m: 3, mb: 0, backgroundColor: '#f5f5f5' }}>
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
      <Container maxWidth="lg" sx={{ mt: 4, pb: 6 }}>
        <Paper sx={{ p: 3 }}>
          <Typography gutterBottom sx={{ fontSize: '3rem' }}>
            {title}
          </Typography>

          <Tabs
            value={activeTab}
            onChange={(event, newValue) => setActiveTab(newValue)}
            sx={{ mb: 2, fontSize: '1.5rem' }}
          >
            <Tab label="Transcript" value="transcript" sx={{ fontSize: 'inherit'}}/>
            <Tab label="Summary" value="summary" sx={{ fontSize: 'inherit'}}/>
          </Tabs>

          {renderContent()}
        </Paper>
        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={6000} 
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert 
            onClose={handleSnackbarClose} 
            severity={snackbar.severity}
            sx={{ 
              width: '100%',
              fontSize: '1.4rem'
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
        {activeTab === 'summary' && (
          <Typography variant="h6" sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '1.25rem' }}>
            Note: the summary may not be accurate for overly short audio files/recordings.
          </Typography>
        )}
      </Container>
    </div>
  );
};

export default NewTranscript;