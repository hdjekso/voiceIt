const Transcript = require('../models/transcriptModel');

// Middleware to ensure the user owns the transcript
const checkOwnership = async (req, res, next) => {
  const userId = req.user.sub; // Extracted from Auth0 token
  const { id } = req.params; // Transcript ID from route params

  try {
    const transcript = await Transcript.findById(id);
    if (!transcript) {
      return res.status(404).json({ message: 'Transcript not found' });
    }

    if (transcript.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized: Not your transcript' });
    }

    next(); // User owns the transcript, proceed
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = checkOwnership;
