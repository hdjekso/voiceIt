// utils/fetchClient.js
//check access token is valid/ get new access token if expired
export class FetchClient {
  constructor(getAccessTokenSilently, audience) {
    this.getAccessTokenSilently = getAccessTokenSilently;
    this.audience = audience;
  }

  async fetch(url, options = {}) {
    try {
      const token = await this.getAccessTokenSilently({
        authorizationParams: {
          audience: this.audience,
          scope: 'openid profile email offline_access'
        },
      });

      let response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        // Try refresh
        const newToken = await this.getAccessTokenSilently({
          authorizationParams: {
            audience: this.audience,
            scope: 'openid profile email offline_access'
          },
          cacheMode: 'off'  // Force token refresh
        });

        // Retry with new token
        response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
            'Content-Type': 'application/json'
          }
        });

        // If the refresh token also failed (expired or invalid), redirect to login
        if (response.status === 401) {
          window.location.href = '/'; // Redirect user to the login page
          return;
        }
        return response;
      }
      
      return response;
    } catch (error) {
      console.error('FetchClient error:', error);
      throw error;
    }
  }
}