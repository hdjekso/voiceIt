import React from "react";
import { useAuth0 } from '@auth0/auth0-react';
import { Logout } from '@mui/icons-material';
import { Button, AppBar, Toolbar, Typography, Stack, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export const Navigation = () => {
  const { logout } = useAuth0();
  let navigate = useNavigate(); 
  const routeChange = () =>{ 
    let path = `/profile`; 
    navigate(path);
  }
  
  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        backgroundColor: 'white',
        color: 'text.primary',
        boxShadow: 1
      }}
    >
      <Toolbar sx={{ minHeight: '64px' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            variant="h6"
            component="a"
            href="/"
            sx={{
              display: 'inline-block',
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 'bold',
              fontSize: '2rem'
            }}
          >
            VOICEIT
          </Typography>
        </ Box>
        <Stack 
          direction="row" 
          spacing={2} 
          alignItems="center"
          sx={{fontSize: '1.5rem'}}
        >
          {/*<Button
            color="inherit"
            component="a"
            href='/'
            sx={{ height: 36, fontSize: 'inherit' }}
          >
            Home
          </Button>*/}
          <Button
            color="inherit"
            component="a"
            href='/dashboard'
            sx={{ height: 36, fontSize: 'inherit' }}
          >
            Dashboard
          </Button>
          <Button
            color="inherit"
            onClick={routeChange}
            variant="text"
            sx={{fontSize: 'inherit'}}
          >
            Profile
          </Button>
          <Button
            variant="text"
            color="error"
            startIcon={<Logout />}
            onClick={() => {
              // Remove updatedName from localStorage
              localStorage.removeItem('updatedName');
              
              // Log out the user
              const returnToUrl = process.env.NODE_ENV === 'production'
                ? 'https://voice-it-nine.vercel.app'
                : 'http://localhost:3000';

              logout({ returnTo: returnToUrl });
            }}
            sx={{ 
              height: 36,
              '& .MuiButton-startIcon': {
                margin: 0,
                marginRight: '8px',
                display: 'flex',
                alignItems: 'center',
              }
            }}
          >
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};
