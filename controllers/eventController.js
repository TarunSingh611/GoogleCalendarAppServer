// server/controllers/eventController.js
const Event = require('../models/Event');
const googleCalendarService = require('../services/googleCalendar');

exports.getEvents = async (req, res) => {
  try {
    const { userId } = req.params;
    const events = await Event.find({ userId }).sort({ startDateTime: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { userId, title, description, startDateTime, endDateTime } = req.body;
    
    const newEvent = await googleCalendarService.createEvent(userId, {
      title,
      description,
      startDateTime,
      endDateTime
    });

    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' });
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