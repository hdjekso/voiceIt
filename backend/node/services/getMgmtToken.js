const axios = require('axios');

let managementApiToken = null;
let tokenExpiry = null;

async function getMgmtApiToken() {
  if (!managementApiToken || Date.now() >= tokenExpiry) {
    console.log('Fetching new Auth0 Management API token...');

    try {
      const response = await axios.post(
        `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
        {
          "client_id": process.env.AUTH0_MTM_CLIENT_ID,
          "client_secret": process.env.AUTH0_MTM_CLIENT_SECRET,
          "audience": "https://dev-rfvu2m8zc0lcham1.us.auth0.com/api/v2/",
          "grant_type": "client_credentials"
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      managementApiToken = response.data.access_token;
      tokenExpiry = Date.now() + response.data.expires_in * 1000; // Expiry in milliseconds
    } catch (error) {
      throw new Error(`Failed to fetch token: ${error.message}`);
    }
  }

  return managementApiToken;
}

module.exports = { getMgmtApiToken };
