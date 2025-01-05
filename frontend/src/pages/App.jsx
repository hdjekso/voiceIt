//auth0 implementation
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useAuth0, Auth0Provider } from "@auth0/auth0-react";
import ProtectedRoute from "../components/protectedRoute";
import Home from "./Home";
import Profile from "./Profile";
import Landing from "./Landing";
import TranscriptDetails from "./TranscriptDetails";
import SmoothScroll from "smooth-scroll";
import "./App.css";
import NewTranscript from "./NewTranscriptPage";
import PageNotFound from './PageNotFound'; 

export const scroll = new SmoothScroll('a[href*="#"]', {
  speed: 1000,
  speedAsDuration: true,
});

/*const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth0();

  //if (isLoading) return <div>Loading...</div>;

  return isAuthenticated ? children : <div>Please log in to access this page.</div>;
};*/

const App = () => {
  return (
    <Auth0Provider
      domain={process.env.REACT_APP_AUTH0_DOMAIN}
      clientId={process.env.REACT_APP_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin + '/dashboard',
        audience: process.env.REACT_APP_AUTH0_AUDIENCE,
        appState: { returnTo: window.location.pathname },
        scope: 'openid profile email offline_access'
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/transcript/:id" element={
            <ProtectedRoute>
              <TranscriptDetails />
            </ProtectedRoute>            
          } />
          <Route path="/transcript/new" element={
            <ProtectedRoute>
              <NewTranscript />
            </ProtectedRoute>            
          } />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </Auth0Provider>
  );
};

export default App;
