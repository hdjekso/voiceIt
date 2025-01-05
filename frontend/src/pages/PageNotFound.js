import React from 'react';
import { Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const PageNotFound = () => {
  const navigate = useNavigate();

  return (
    <Container sx={{ textAlign: 'center', mt: 5 }}>
      <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
        404 - Page Not Found
      </Typography>
      <Typography variant="h5" sx={{ mt: 2 }}>
        Sorry, the page you're looking for doesn't exist.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 4, fontSize: '1.25rem' }}
        onClick={() => navigate('/')}
      >
        Go to Home
      </Button>
    </Container>
  );
};

export default PageNotFound;
