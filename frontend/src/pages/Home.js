import React from 'react';
import { useEffect, useState } from "react";
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, useLocation } from "react-router-dom";
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import MicIcon from '@mui/icons-material/Mic';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TranscriptCard from "../components/TranscriptCard";
import AudioUploader from '../components/audioUploader';
import AudioRecorder from '../components/audioRecorder';
import { FetchClient } from '../utils/fetchClient';
import { Navigation } from "../components/navigation";
import { 
  Typography, 
  Container, 
  Paper, 
  CircularProgress, 
  IconButton, 
  Box, 
  Tabs, 
  Tab,
  Snackbar,
  Alert,
  Pagination
} from '@mui/material';

const Home = () => {
  const location = useLocation();
  const { isAuthenticated, loginWithRedirect, isLoading, user, logout, getAccessTokenSilently } = useAuth0();
  const [transcripts, setTranscripts] = useState([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [updatedName, setUpdatedName] = useState(null);
  const [isLoadingTranscripts, setIsLoadingTranscripts] = useState(true);
  const [page, setPage] = useState(1);
  const [transcriptsPerPage] = useState(5);

  // Calculate pagination values
  const indexOfLastTranscript = page * transcriptsPerPage;
  const indexOfFirstTranscript = indexOfLastTranscript - transcriptsPerPage;
  const currentTranscripts = transcripts.slice(indexOfFirstTranscript, indexOfLastTranscript);
  const pageCount = Math.ceil(transcripts.length / transcriptsPerPage);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  let navigate = useNavigate();

  const loginWithRefresh = () => {
    loginWithRedirect({
      authorizationParams: {
        prompt: "login",
        scope: "openid profile email offline_access"
      }
    });
  };

  useEffect(() => {
    const savedName = localStorage.getItem('updatedName');
    if (savedName) {
      setUpdatedName(savedName);
    }
  }, []);

  const theme = createTheme({
    palette: {
      primary: {
        main: '#1976d2', // You can still use a fallback color
      },
      secondary: {
        main: '#550583', // Secondary color (adjust as needed)
      },
    },
  });

  useEffect(() => {
    const fetchTranscripts = async () => {
      if (!isAuthenticated) {
        return;
      }
      
      setIsLoadingTranscripts(true);
      
      try {
        const fetchClient = new FetchClient(
          getAccessTokenSilently,
          process.env.REACT_APP_AUTH0_AUDIENCE
        );
        const response = await fetchClient.fetch(
          `${process.env.REACT_APP_API_URL}/api/transcripts`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch transcripts: ${response.status}`);
        }

        const json = await response.json();
        setTranscripts(json);
      } catch (error) {
        console.error('Failed to fetch transcripts:', error);
        // Check specifically for refresh token errors
        if (error.message.includes('Missing Refresh Token')) {
          setSnackbar({
            open: true,
            message: 'Session expired. Please log in again.',
            severity: 'warning'
          });
          loginWithRefresh(); // Call the function here
        } else {
          setSnackbar({
            open: true,
            message: 'Failed to load transcripts',
            severity: 'error'
          });
        }
      } finally {
        setIsLoadingTranscripts(false);
      }
    };

    fetchTranscripts();
  }, [isAuthenticated, getAccessTokenSilently]);

  //show snackbar notif if transcript is deleted from details page
  useEffect(() => {
    if (location.state?.newTitle) {
      setSnackbar({
        open: true,
        message: `Transcript "${location.state?.newTitle}" has been deleted`,
        severity: 'success'
      });
    }
  }, [location.state])

  //pagination
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    // Scroll to top of transcript section
    window.scrollTo({
      top: document.querySelector('#transcripts-section').offsetTop,
      behavior: 'smooth'
    });
  };

  const handleTranscriptDelete = (deletedId, title) => {
    setTranscripts(prevTranscripts => {
      const newTranscripts = prevTranscripts.filter(transcript => transcript._id !== deletedId);
      return newTranscripts;
    });
    setSnackbar({
      open: true,
      message: `Transcript "${title}" has been deleted`,
      severity: 'success'
    });
  };

  const handleDeleteError = (error) => {
    console.error('Delete error:', error);
    setSnackbar({
      open: true,
      message: 'Failed to delete transcript',
      severity: 'error'
    });
  };

  // Add handler for title updates
  const handleTitleUpdate = (transcriptId, newTitle) => {
    setTranscripts(prevTranscripts => 
      prevTranscripts.map(transcript => 
        transcript._id === transcriptId 
          ? { ...transcript, title: newTitle }
          : transcript
      )
    );
  };

  const renderContent = () => {
    if (activeTab === 'upload') {
      return (
        <AudioUploader/>
      );
    } else if (activeTab === 'record') {
      return (
        <AudioRecorder/>
      );
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  if (isLoading) {
    //console.log('Auth0 is loading...');
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    //console.log('Not authenticated, redirecting...');
    loginWithRedirect();
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Typography>Redirecting to login...</Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        minHeight: '100vh',
        paddingTop: '64px',
        backgroundColor: '#f5f5f5'
      }}>
        <Navigation />
        <Typography sx={{
          fontSize: '2.2rem',
          p: 3,
          pb: 0,
          fontFamily: 'Salina',
          fontWeight: 'medium',
        }}>
            Welcome, {updatedName || user.name}.
          </Typography>
        <Container maxWidth="lg" sx={{ mt: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(event, newValue) => setActiveTab(newValue)}
            sx={{
              mb: 2,
              fontSize: '1.5rem',
              pl: 3,
              pr: 3,
              width: 'inherit',
              '& .MuiTabs-indicator': {
              backgroundColor: 'secondary.main', // Set indicator color (active tab)
              }
            }}>
            <Tab
              icon={<AudioFileIcon />}
              iconPosition="start"
              label="Upload"
              value="upload"
              sx={{
                fontSize: 'inherit',
                pb: 0,
                color: 'secondary.main', // Inactive tab color
                '&.Mui-selected': {
                  color: 'secondary.dark', // Active tab color
                },
              }}
            />
            <Tab
              icon={<MicIcon />}
              iconPosition="start"
              label="Record"
              value="record"
              sx={{
                fontSize: 'inherit',
                pb: 0,
                color: 'secondary.main', // Inactive tab color
                '&.Mui-selected': {
                  color: 'secondary.dark', // Active tab color
                },
              }}
            />
          </Tabs>
          {renderContent()}
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            py: 4
          }}>
            <Stack 
              spacing={2}
              direction="column"
              sx={{ width: '70%', maxWidth: '900px', alignItems: 'center' }}
            >
              {isLoadingTranscripts ? (
                <CircularProgress />
              ) : transcripts && transcripts.length > 0 ? (
                <>
                  {currentTranscripts.map(transcript => (
                    <TranscriptCard 
                      transcript={transcript} 
                      key={transcript._id}
                      onDelete={handleTranscriptDelete}
                      onDeleteError={handleDeleteError}
                      onTitleUpdate={handleTitleUpdate}
                    />
                  ))}
                  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                    <Pagination 
                      count={pageCount}
                      page={page}
                      onChange={handlePageChange}
                      color="secondary"
                      size="large"
                      sx={{
                        '& .MuiPaginationItem-root': {
                          fontSize: '1.2rem',
                        }
                      }}
                    />
                  </Box>
                </>
              ) : (
                <Typography variant="h6" sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '1.25rem' }}>
                  No transcripts found. Upload an audio file to get started.
                </Typography>
              )}
            </Stack>
          </Box>

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
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default Home;