// server/controllers/eventController.js
const Event = require('../models/Event');
const googleCalendarService = require('../services/googleCalendar');

exports.getEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const events = await Event.find({ userId }).sort({ startDateTime: 1 });
    res.json({statusCode: 200, message: 'Events fetched successfully', data: events});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { userId, title, description, startDateTime, endDateTime } = req.body;

    // Input validation
    if (!userId || !title || !startDateTime || !endDateTime) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['userId', 'title', 'startDateTime', 'endDateTime']
      });
    }

    // Validate date formats
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format',
        format: 'ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)'
      });
    }

    // Check if end date is after start date
    if (endDate <= startDate) {
      return res.status(400).json({
        error: 'End date must be after start date'
      });
    }

    // Create event in Google Calendar
    const googleEvent = await googleCalendarService.createEvent(userId, {
      title,
      description: description || '',
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString()
    });

    if (!googleEvent || !googleEvent.googleEventId) {
      throw new Error('Failed to create event in Google Calendar');
    }

    // Create event in local database
    const newEvent = new Event({
      googleEventId: googleEvent.googleEventId,
      userId,
      title,
      description: description || '',
      startDateTime: startDate,
      endDateTime: endDate
    });

    await newEvent.save();

    res.status(201).json(newEvent);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ 
      error: 'Failed to create event',
      details: error.message 
    });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const updateData = req.body;
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Update in Google Calendar
    await googleCalendarService.updateEvent(event.userId, eventId, updateData);
    
    // Update in local database
    const updatedEvent = await Event.findByIdAndUpdate(eventId, updateData, { new: true });
    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Delete from Google Calendar
    await googleCalendarService.deleteEvent(event.userId, event.googleEventId);
    
    // Delete from local database
    await Event.findByIdAndDelete(eventId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
};