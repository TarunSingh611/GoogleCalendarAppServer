// server/controllers/authController.js
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleAuth = async (req, res) => {
  try {
    const { tokenId } = req.body;
      const ticket = await client.verifyIdToken({
          idToken: tokenId,
          audience: process.env.GOOGLE_CLIENT_ID
      });

      const { sub: googleId, email } = ticket.getPayload();

      let user = await User.findOne({ googleId });

      if (!user) {
          // Create new user
          user = new User({
              googleId,
              email,
              accessToken: tokenId,
        // Don't set refreshToken initially
          });
      } else {
      // For existing users
      user.accessToken = tokenId;
      if (req.body.refreshToken) {
        user.refreshToken = req.body.refreshToken;
          }
      }

      await user.save();

      // Generate JWT
      const token = jwt.sign(
          { userId: user._id },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
      );

      res.json({
          token,
          user: {
              _id: user._id,
              email: user.email
          }
      });
  } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({
          error: 'Authentication failed',
          details: error.message
      });
  }
};
// Add a separate endpoint to update refresh token
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