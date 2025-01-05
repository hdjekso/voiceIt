const express = require('express')
const router = express.Router()
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const checkJwt = require('../middleware/checkJwt');
const { getMgmtApiToken } = require('../services/getMgmtToken');

// Apply middleware to all routes
router.use(checkJwt);

//update user profile name
router.patch('/update-profile', async (req, res) => {
  try {
    const { user_id, name } = req.body;
    const managementToken = await getMgmtApiToken(); //get mgmt token

    const response = await fetch(`https://${process.env.AUTH0_DOMAIN}/api/v2/users/${user_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managementToken}`
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.statusText}`);
    }

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Endpoint for handling image uploads
/*router.post('/upload-profile-picture', upload.single('picture'), async (req, res) => {
  try {
    // Handle image upload to your preferred storage (e.g., S3)
    const pictureUrl = // URL of uploaded image
    res.json({ pictureUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload image' });
  }
});*/

module.exports = router