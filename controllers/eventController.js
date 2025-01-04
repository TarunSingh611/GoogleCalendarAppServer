// server/controllers/eventController.js
const googleEventService = require('../services/googleEventService');
const Event = require('../models/Event');

async function syncCalendarWithDatabase(userId) {
  try {
    // Get all events from Google Calendar
    const googleEvents = await googleEventService.listEvents(userId);
    const googleEventIds = new Set(googleEvents.map(event => event.id));

    // Get all events from database
    const dbEvents = await Event.find({ userId });

    // Delete events that exist in DB but not in Google Calendar
    for (const dbEvent of dbEvents) {
      if (!googleEventIds.has(dbEvent.googleEventId)) {
        await Event.findByIdAndDelete(dbEvent._id);
        console.log(`Deleted event ${dbEvent.googleEventId} from database`);
      }
    }

    // Update or create events from Google Calendar
    for (const googleEvent of googleEvents) {
      const existingEvent = await Event.findOne({
        googleEventId: googleEvent.id,
        userId
      });

      if (!existingEvent) {
        // Create new event
        await Event.create({
          googleEventId: googleEvent.id,
          userId,
          title: googleEvent.title,
          description: googleEvent.description || '',
          startDateTime: googleEvent.startDateTime,
          endDateTime: googleEvent.endDateTime
        });
      } else {
        // Update existing event if changed
        const needsUpdate =
          existingEvent.title !== googleEvent.title ||
          existingEvent.description !== (googleEvent.description || '') ||
          new Date(existingEvent.startDateTime).getTime() !== new Date(googleEvent.startDateTime).getTime() ||
          new Date(existingEvent.endDateTime).getTime() !== new Date(googleEvent.endDateTime).getTime();

        if (needsUpdate) {
          await Event.findByIdAndUpdate(existingEvent._id, {
            title: googleEvent.title,
            description: googleEvent.description || '',
            startDateTime: googleEvent.startDateTime,
            endDateTime: googleEvent.endDateTime
          });
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Sync calendar with database error:', error);
    throw error;
  }
}

exports.getEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // First sync with Google Calendar to ensure data is up to date
    await syncCalendarWithDatabase(userId);

    // Fetch events from database
    const events = await Event.find({ userId }).sort({ startDateTime: 1 });

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
    const newEvent = await googleEventService.createEvent(userId, {
      title,
      description: description || '',
      startDateTime: startDate.toISOString(),
      endDateTime: endDate.toISOString()
    });

    res.status(201).json({ success: true, event: newEvent });
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
    const updatedEvent = await googleEventService.updateEvent(userId, eventId, updateData);
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
    await googleEventService.deleteEvent(userId, eventId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};