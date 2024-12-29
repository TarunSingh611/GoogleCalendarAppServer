const { google } = require('googleapis'); // Import the 'google' object from 'googleapis'

const oath2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.FRONTEND_URL}` // Redirect URI
);

async function exchangeCodeForTokens(code) {
  try {
    const { tokens } = await oath2Client.getToken(code); // Exchange the code for tokens
    return tokens;
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    throw error;
  }
}

module.exports = {
  exchangeCodeForTokens,
};