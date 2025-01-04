// server/controllers/authController.js
const User = require('../models/User');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const googleCalendarService = require('../services/googleCalendarService.js');
const { exchangeCodeForTokens } = require('../services/getTokens.js');

const client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
exports.googleAuth = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({
        error: 'Missing authorization code',
      });
    }

    // Exchange code for tokens
    const tokenPayload = await exchangeCodeForTokens(code);
    const { id_token: tokenId, access_token, refresh_token } = tokenPayload;

    // Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const ticketPayload = ticket.getPayload();
    const { sub: googleId, email } = ticketPayload;

    // Find or create user
    let user = await User.findOne({ googleId });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = new User({
        googleId,
        email,
        accessToken: access_token,
        refreshToken: refresh_token,
      });
    } else {
      user.accessToken = access_token;
      if (refresh_token) { // Only update refresh token if provided
        user.refreshToken = refresh_token;
      }
    }

    // Save user first to ensure we have a valid user._id
    try {
      await user.save();
    } catch (error) {
      console.error('Failed to save user:', error);
      return res.status(500).json({
        error: 'Failed to save user data',
        details: error.message,
      });
    }

    // Setup webhook for real-time updates
    try {
      const watchResponse = await googleCalendarService.setupWatch(user._id);
      user.watchChannelId = watchResponse.id;
      user.resourceId = watchResponse.resourceId;
      await user.save();
    } catch (error) {
      console.error('Failed to setup webhook:', error);
      // Don't fail the auth process if webhook setup fails
    }

    // Sync calendar events
    try {
      await googleCalendarService.syncEvents(user._id);
    } catch (error) {
      console.error('Failed to sync events during login:', error);
      // Don't fail the auth process if sync fails
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Send response
    res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        isNewUser
      },
    });

  } catch (error) {
    console.error('Authentication error:', error);

    // Handle specific error types
    if (error.message.includes('Invalid token')) {
      return res.status(401).json({
        error: 'Invalid authentication token',
        details: error.message,
      });
    }

    if (error.message.includes('Token expired')) {
      return res.status(401).json({
        error: 'Authentication token expired',
        details: error.message,
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Authentication failed',
      details: error.message,
    });
  }
};
exports.refreshToken = async (req, res) => {
  try {
    const { userId } = req.params;
    const { refreshToken } = req.body;

    // Validate inputs
    if (!userId || !refreshToken) {
      return res.status(400).json({
        error: 'Missing required parameters',
        details: 'User ID and refresh token are required'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Verify refresh token matches
    if (user.refreshToken !== refreshToken) {
      return res.status(401).json({
        error: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Update user's refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Failed to refresh token',
      details: error.message
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(userId, {
      $unset: { accessToken: 1, refreshToken: 1 }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
};