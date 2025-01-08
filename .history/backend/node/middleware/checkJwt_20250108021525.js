const { auth } = require('express-oauth2-jwt-bearer');

const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

module.exports = (req, res, next) => {
  checkJwt(req, res, (err) => {
    if (err) {
      console.error('JWT Verification Error:', err);
      return res.status(401).json({ error: 'Unauthorized', message: err.message });
    }

    // If token is valid, make sure decoded payload is attached to req.user
    if (req.auth && req.auth.payload) {
      req.user = req.auth.payload;
    } else {
      return res.status(401).json({ error: 'No user data in token' });
    }

    next();
  });
};