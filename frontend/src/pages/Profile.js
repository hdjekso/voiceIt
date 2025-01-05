import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigation } from "../components/navigation";
import { FetchClient } from '../utils/fetchClient';
import { 
  Card, 
  CardContent, 
  CardHeader,
  Avatar,
  Typography,
  Button,
  CircularProgress,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  TextField,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Email,
  CheckCircle,
  Language,
  Update,
  Logout,
  Edit,
  PhotoCamera,
  Save,
  Cancel
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { isAuthenticated, loginWithRedirect, isLoading, user, logout, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [jwtToken, setJwtToken] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(null);
  const [updatedName, setUpdatedName] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  useEffect(() => {
    const savedName = localStorage.getItem('updatedName');
    if (savedName) {
      setUpdatedName(savedName);
    }
  }, []);

  useEffect(() => {
    if (user) {
      //setEditedName(user.name);
      setPreviewUrl(user.picture);
    }
  }, [user]);

  useEffect(() => {
    const fetchToken = async () => {
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: process.env.REACT_APP_AUTH0_AUDIENCE
            }
          });
          setJwtToken(token);
        } catch (error) {
          console.error('Error fetching JWT token:', error);
        }
      }
    };
    
    fetchToken();
  }, [isAuthenticated, getAccessTokenSilently]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setSnackbar({ open: true, message: 'Updating profile...', severity: 'info' });
      
      // First, handle image upload if there's a new image
      /*let newPictureUrl = user.picture;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('picture', selectedFile);
        
        const uploadResponse = await fetch('/api/upload-profile-picture', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
          body: formData
        });
        
        if (!uploadResponse.ok) throw new Error('Failed to upload image');
        const { pictureUrl } = await uploadResponse.json();
        newPictureUrl = pictureUrl;
      }*/

      const fetchClient = new FetchClient(
        getAccessTokenSilently,
        process.env.REACT_APP_AUTH0_AUDIENCE
      );
      // Update user profile in Auth0
      const response = await fetchClient.fetch(
        `${process.env.REACT_APP_API_URL}/api/update-profile`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.sub,
            name: editedName,
            //picture: newPictureUrl,
          })
        }
      );

      if (!response.ok) throw new Error('Failed to update profile');

      // Re-fetch user information after profile update
      const userInfoResponse = await fetchClient.fetch(
        `https://${process.env.REACT_APP_AUTH0_DOMAIN}/userinfo`
      );

      if (!userInfoResponse.ok) throw new Error('Failed to fetch updated user info');

      const updatedUser = await userInfoResponse.json();
      setUpdatedName(updatedUser.name);  // Update local state with new name
      // Save updated name to localStorage
      localStorage.setItem('updatedName', updatedUser.name);
      

      setSnackbar({
        open: true,
        message: 'Profile updated successfully!',
        severity: 'success'
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update profile. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (updatedName){
      setEditedName(updatedName);
    }else{
      setEditedName(user.name);
    }
    setPreviewUrl(user.picture);
    setSelectedFile(null);
  };

  if (isLoading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    loginWithRedirect();
    return (
      <Box textAlign="center" p={4}>
        <Typography>Redirecting to login...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navigation />
      <Box 
        sx={{ 
          flexGrow: 1,
          bgcolor: 'grey.100', 
          p: 4,
          paddingTop: '84px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Card sx={{ maxWidth: 600, width: '100%' }}>
          <CardHeader
            avatar={
              <Box position="relative">
                <Avatar 
                  src={previewUrl || user.picture}
                  alt={user.name}
                  sx={{ width: 72, height: 72 }}
                />
                {/*{isEditing && (
                  <IconButton
                    color="primary"
                    aria-label="upload picture"
                    component="label"
                    sx={{
                      position: 'absolute',
                      bottom: -10,
                      right: -10,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <input
                      hidden
                      accept="image/*"
                      type="file"
                      onChange={handleFileSelect}
                    />
                    <PhotoCamera />
                  </IconButton>
                )}*/}
              </Box>
            }
            action={
              !isEditing && (
                <IconButton onClick={() => setIsEditing(true)} >
                  <Edit sx={{ fontSize: 20 }}/>
                </IconButton>
              )
            }
            title={
              isEditing ? (
                <TextField
                  value={editedName || updatedName || user.name} //display first non-null value
                  onChange={(e) => setEditedName(e.target.value)}
                  variant="standard"
                  fullWidth
                  sx={{ 
                    mt: 1,
                    width: '300px', // or any specific width
                    '& .MuiInputBase-input': {
                      fontSize: '1.5rem', // Adjusts the input text size
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: '2rem', // Adjusts the label text size
                    }
                  }}
                />
              ) : (
                <Typography sx={{fontSize: '2rem'}}>
                  {updatedName ? updatedName : user.name}
                </Typography>
              )
            }
          />
          <CardContent>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Email />
                </ListItemIcon>
                <ListItemText 
                  primary={user.email} 
                  primaryTypographyProps={{ fontSize: '1.5rem' }}
                />
              </ListItem>

              {user.email_verified && (
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Email verified" 
                    sx={{ color: 'success.main' }}
                  />
                </ListItem>
              )}

              {user.locale && (
                <ListItem>
                  <ListItemIcon>
                    <Language />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Locale: ${user.locale}`}
                    primaryTypographyProps={{ fontSize: '1.5rem' }}
                  />
                </ListItem>
              )}

              {user.updated_at && (
                <ListItem>
                  <ListItemIcon>
                    <Update />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Last updated: ${new Date(user.updated_at).toLocaleDateString()}`}
                    primaryTypographyProps={{ fontSize: '1.5rem' }}
                  />
                </ListItem>
              )}
              <Divider sx={{ my: 2 }} variant="middle" component="li"/>
            </List>

            {isEditing ? (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  color='error'
                  variant="outlined"
                  onClick={handleCancel}
                  startIcon={<Cancel />}
                  fullWidth
                  sx={{fontSize: '1.2rem'}}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleUpdateProfile}
                  startIcon={<Save />}
                  fullWidth
                  sx={{fontSize: '1.2rem'}}
                >
                  Save Changes
                </Button>
              </Box>
            ) : (
              <Button
                variant="contained"
                color="error"
                fullWidth
                startIcon={<Logout />}
                onClick={() => {
                  // Remove updatedName from localStorage
                  localStorage.removeItem('updatedName');
                  
                  // Log out the user
                  logout({ returnTo: window.location.origin });
                }}
              >
                Log Out
              </Button>
            )}
          </CardContent>
        </Card>
      </Box>
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '1.2rem' }}>
            {JSON.stringify(user, null, 2)}
          </Typography>
          {jwtToken && (
            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '1.2rem' }}>
              {jwtToken}
            </Typography>
          )}
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%', fontSize: '1.1rem' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;