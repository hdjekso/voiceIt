import React, { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Typography, Container, Paper, CircularProgress, IconButton, Box, Tabs, Tab } from '@mui/material';
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

  const audioFile = location.state?.audioFile;
  const [title, setTitle] = useState(location.state?.title || 'Untitled Transcript');

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

    if (activeTab === 'transcript') {
      return (
        <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '1.75rem' }}>
          {transcript}
        </Typography>
      );
    } else if (activeTab === 'summary') {
      return (
        <Typography sx={{ whiteSpace: 'pre-wrap', fontSize: '1.75rem' }}>
          {summary || 'Summary will be displayed here once available.'}
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
      </Container>
    </div>
  );
};

export default NewTranscript;