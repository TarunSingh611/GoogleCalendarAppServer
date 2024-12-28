// server/routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/google', authController.googleAuth);
router.post('/logout', authController.logout);
router.post('/:userId/refresh-token', auth, authController.refreshToken);

module.exports = router;