// server/controllers/eventController.js
const googleCalendarService = require('../services/googleCalendar');

exports.getEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch events directly from Google Calendar
    const events = await googleCalendarService.listEvents(userId);
    res.json({
      statusCode: 200, 
      message: 'Events fetched successfully', 
      data: events
    });
  } catch (error) {
    console.error('Fetch events error:', error);
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
    const newEvent = await googleCalendarService.createEvent(userId, {
      title,
      description: description || '',
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString()
    });

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
    const { userId, ...updateData } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Update directly in Google Calendar
    const updatedEvent = await googleCalendarService.updateEvent(userId, eventId, updateData);
    res.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Delete directly from Google Calendar
    await googleCalendarService.deleteEvent(userId, eventId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};