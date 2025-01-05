import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !shouldRedirect) {
      setShouldRedirect(true);
      loginWithRedirect({
        appState: { returnTo: window.location.pathname }
      });
    }
  }, [isLoading, isAuthenticated, loginWithRedirect, shouldRedirect]);

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </div>
    );
  }

  // If authenticated, show the protected content
  if (isAuthenticated) {
    return children;
  }

  // If not authenticated and not loading, show nothing while redirect happens
  return null;
};

export default ProtectedRoute;