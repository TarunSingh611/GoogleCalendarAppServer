// server/routes/webhook.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Route for Google Calendar webhook notifications
router.post('/calendar', webhookController.handleCalendarWebhook);

// Route to setup webhook for a user
router.post('/setup', webhookController.setupWebhook);

// Route to stop watching calendar changes
router.post('/stop', webhookController.stopWebhook);

module.exports = router;