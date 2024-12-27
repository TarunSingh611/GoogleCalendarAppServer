// server/routes/events.js
const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const auth = require('../middleware/auth');

router.get('/:userId', auth, eventController.getEvents);
router.post('/', auth, eventController.createEvent);
router.put('/:eventId', auth, eventController.updateEvent);
router.delete('/:eventId', auth, eventController.deleteEvent);

module.exports = router;