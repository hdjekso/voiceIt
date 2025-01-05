import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Typography, Container, Paper, CircularProgress, IconButton, Box, TextField, Button, Tabs, Tab } from '@mui/material';
import { ArrowBack, Edit, Save } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { FetchClient } from '../utils/fetchClient';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const TranscriptDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate(); 

  const [transcript, setTranscript] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('transcript');
  const [isDisabled, setIsDisabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const { isAuthenticated, loginWithRedirect, isLoading, getAccessTokenSilently } = useAuth0();

  const handleCopyToClipboard = () => {
    // Copy value to clipboard
    let textToCopy = ''
    if (activeTab === 'transcript'){
      textToCopy = transcript
    }else{
      textToCopy = summary
    }
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        // Disable the button for 3 seconds
        setIsDisabled(true);
        setTimeout(() => {
          setIsDisabled(false);
        }, 2000);
      })
      .catch((error) => {
        console.error('Error copying text to clipboard:', error);
      });
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

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        // Get token
        const fetchClient = new FetchClient(
          getAccessTokenSilently,
          process.env.REACT_APP_AUTH0_AUDIENCE
        );
        
        // Get transcript
        const response = await fetchClient.fetch(
          `${process.env.REACT_APP_API_URL}/api/transcripts/${id}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch transcript');
        }

        const json = await response.json();
        setTranscript(json.transcription);
        setSummary(json.summary);
        setNewTitle(json.title); // Initialize newTitle with the current title
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch transcript details');
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [getAccessTokenSilently, id]);

  const handleRename = async () => {
    try {
      const fetchClient = new FetchClient(
        getAccessTokenSilently,
        process.env.REACT_APP_AUTH0_AUDIENCE
      );

      const response = await fetchClient.fetch(
        `${process.env.REACT_APP_API_URL}/api/transcripts/${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: newTitle }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to rename transcript');
      }

      const updatedTranscript = await response.json();
      setNewTitle(updatedTranscript.title);
      setIsRenaming(false);
    } catch (err) {
      setError('Failed to rename transcript');
    }
  };

  const handleDelete = async () => {
    try {
      const fetchClient = new FetchClient(
        getAccessTokenSilently,
        process.env.REACT_APP_AUTH0_AUDIENCE
      );
  
      const response = await fetchClient.fetch(
        `${process.env.REACT_APP_API_URL}/api/transcripts/${id}`,
        {
          method: 'DELETE',
        }
      );
  
      if (!response.ok) {
        throw new Error('Failed to delete transcript');
      }
      navigate('/dashboard', { state: { newTitle } }); // Redirect to dashboard after deletion
    } catch (err) {
      setError('Failed to delete transcript');
    }
  };

  if (loading || isLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

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
      {/* Back button */}
      <Box sx={{ alignSelf: 'flex-start', m: 3, mb: 0}}>
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
          {transcript && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between', // Space between title and buttons
                  gap: 2,
                }}
              >
                {/* Title Section */}
                {isRenaming ? (
                  <TextField
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    variant="outlined"
                    size="medium"
                    sx={{
                      fontSize: '1rem',
                      flexGrow: 1,
                      mr: 2,
                      '& .MuiOutlinedInput-input': {
                        fontSize: '1.8rem',
                        padding: '8px 12px',
                      },
                    }}
                  />
                ) : (
                  <Typography gutterBottom sx={{ fontSize: '3rem', flexGrow: 1 }}>
                    {newTitle}
                  </Typography>
                )}

                {/* Buttons Section */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  {isRenaming ? (
                    <>
                      {/* Cancel Button */}
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => setIsRenaming(false)}
                        sx={{
                          width: 100,
                          height: 40,
                          fontSize: '1.2rem',
                          '& .MuiSvgIcon-root': { fontSize: 20 },
                        }}
                      >
                        Cancel
                      </Button>

                      {/* Save Button */}
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Save />}
                        onClick={handleRename}
                        sx={{
                          width: 90,
                          height: 40,
                          fontSize: '1.2rem',
                        }}
                      >
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Copy Button*/}
                      <IconButton
                        onClick={handleCopyToClipboard}
                        disabled={isDisabled}
                        sx={{
                          width: 40,
                          height: 40,
                          '& .MuiSvgIcon-root': { fontSize: 20 },
                        }}
                      >
                        <ContentCopyIcon />
                      </IconButton>
                      {/* Edit Button */}
                      <IconButton
                        onClick={() => setIsRenaming(true)}
                        sx={{
                          width: 40,
                          height: 40,
                          '& .MuiSvgIcon-root': { fontSize: 20 },
                        }}
                      >
                        <Edit />
                      </IconButton>

                      {/* Delete Button */}
                      <IconButton
                        onClick={handleDelete}
                        color="error"
                        sx={{
                          width: 40,
                          height: 40,
                          '& .MuiSvgIcon-root': { fontSize: 20 },
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>
              <Tabs
                value={activeTab}
                onChange={(event, newValue) => setActiveTab(newValue)}
                sx={{ mb: 2, fontSize: '1.5rem' }}
              >
                <Tab label="Transcript" value="transcript" sx={{ fontSize: 'inherit'}}/>
                <Tab label="Summary" value="summary" sx={{ fontSize: 'inherit'}}/>
              </Tabs>
              {renderContent()}
            </>
          )}
        </Paper>
      </Container>
    </div>
  );
};

export default TranscriptDetails;
