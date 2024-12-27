// server/controllers/authController.js
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
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
      user = new User({
        googleId,
        email,
        accessToken: tokenId,
        refreshToken: req.body.refreshToken
      });
      await user.save();
    } else {
      user.accessToken = tokenId;
      if (req.body.refreshToken) {
        user.refreshToken = req.body.refreshToken;
      }
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { _id: user._id, email: user.email } });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Implement Google token refresh logic here
    // Use refresh token to get new access token

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Token refresh failed' });
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