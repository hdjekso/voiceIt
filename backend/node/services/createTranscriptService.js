const Transcript = require('../models/transcriptModel');

async function createTranscriptService({ title, snippet, transcription, summary, userId }) {
  try {
    const transcript = await Transcript.create({
      title,
      snippet,
      transcription,
      summary,
      userId,
    });
    return transcript;
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = { createTranscriptService };