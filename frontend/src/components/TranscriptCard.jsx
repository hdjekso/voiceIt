import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { FetchClient } from '../utils/fetchClient';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import formatDistanceToNow from 'date-fns/formatDistanceToNow'
import { Typography, IconButton, Box, TextField } from '@mui/material';
import { Edit, Save } from '@mui/icons-material';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';

const TranscriptCard = ({ transcript, onDelete, onDeleteError, onTitleUpdate }) => {
  const navigate = useNavigate();
  const [id] = useState(transcript?._id);
  const [newTitle, setNewTitle] = useState(transcript?.title || 'Untitled');
  const [isRenaming, setIsRenaming] = useState(false);
  const { getAccessTokenSilently } = useAuth0();

  const handleViewDetails = () => {
    navigate(`/transcript/${transcript._id}`);
  };

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

      // After successful API call, update the parent component's state
      onTitleUpdate(id, newTitle);
      
      setIsRenaming(false);
    } catch (err) {
      onDeleteError?.(err);
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
  
      onDelete?.(id, newTitle);
    } catch (err) {
      onDeleteError?.(err);
    }
  };

  if (!transcript) {
    console.error('No transcript data provided');
    return null;
  }

  return (
    <Card sx={{ width: '100%' }}>
      <CardContent>
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}>
          {isRenaming ? (
            <TextField
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              variant="outlined"
              size="medium"
              sx={{
                fontSize: '1rem',
                flexGrow: 1,
                '& .MuiOutlinedInput-input': {
                  fontSize: '1.8rem',
                  padding: '8px 12px',
                },
              }}
            />
          ) : (
            <Typography
              variant="h4"
              component="div"
              sx={{
                fontWeight: 'medium',
                fontSize: '2.2rem',
                flexGrow: 1,
              }}
            >
              {newTitle || 'Untitled'}
            </Typography>
          )}
          
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
          }}>
            {isRenaming ? (
              <>
                <Button
                  variant="text"
                  color="error"
                  onClick={() => setIsRenaming(false)}
                  sx={{
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    padding: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    '& .MuiSvgIcon-root': { fontSize: 20 }
                  }}
                >
                  <CancelIcon />
                </Button>
                <Button
                  variant="text"
                  color="primary"
                  onClick={handleRename}
                  sx={{
                    width: 40,
                    height: 40,
                    minWidth: 40,
                    padding: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    '& .MuiSvgIcon-root': { fontSize: 20 }
                  }}
                >
                  <Save />
                </Button>
              </>
            ) : (
              <>
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
        
        <Typography sx={{
          color: 'text.secondary',
          mb: 1.5,
          fontSize: '1.3rem',
        }}>
          {transcript.createdAt ? formatDistanceToNow(new Date(transcript.createdAt), { addSuffix: true }) : 'Unknown date'}
        </Typography>
        
        <Typography variant="body2" sx={{
          fontSize: '1.5rem',
        }}>
          {transcript.snippet ? `${transcript.snippet}...` : 'No content available'}
        </Typography>
      </CardContent>
      
      <CardActions>
        <Button
          size="medium"
          sx={{
            fontSize: '1.25rem',
          }}
          onClick={handleViewDetails}
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
}

export default TranscriptCard;