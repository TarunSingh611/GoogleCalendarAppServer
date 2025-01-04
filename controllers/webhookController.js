// server/controllers/webhookController.js
const User = require('../models/User');
const googleEventService = require('../services/googleEventService');
const Event = require('../models/Event');

// controllers/webhookController.js

exports.handleCalendarWebhook = async (req, res) => {
  try {
    const channelId = req.headers['x-goog-channel-id'];
    const resourceState = req.headers['x-goog-resource-state'];

    // Find user associated with this channel
    const user = await User.findOne({ watchChannelId: channelId });
    if (!user) {
      console.log('No user found for channel:', channelId);
      return res.status(404).send('Channel not found');
    }

    // Handle different resource states
    switch (resourceState) {
      case 'sync':
        // Initial sync completed
        console.log('Sync notification received');
        await syncCalendarWithDatabase(user._id);
        break;

      case 'exists':
      case 'update':
        // Calendar was updated
        console.log('Calendar update notification received');
        await syncCalendarWithDatabase(user._id);
        break;

      case 'not_exists':
        console.log('Resource does not exist');
        break;

      default:
        console.log('Unknown resource state:', resourceState);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).send('Internal Server Error');
  }
};

async function syncCalendarWithDatabase(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

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
          description: googleEvent.description,
          startDateTime: googleEvent.startDateTime,
          endDateTime: googleEvent.endDateTime
        });
      } else {
        // Update existing event if changed
        const needsUpdate =
          existingEvent.title !== googleEvent.title ||
          existingEvent.description !== googleEvent.description ||
          new Date(existingEvent.startDateTime).getTime() !== new Date(googleEvent.startDateTime).getTime() ||
          new Date(existingEvent.endDateTime).getTime() !== new Date(googleEvent.endDateTime).getTime();

        if (needsUpdate) {
          await Event.findByIdAndUpdate(existingEvent._id, {
            title: googleEvent.title,
            description: googleEvent.description,
            startDateTime: googleEvent.startDateTime,
            endDateTime: googleEvent.endDateTime
          });
        }
      }
    }
  } catch (error) {
    console.error('Sync calendar with database error:', error);
    throw error;
  }
}

exports.setupWebhook = async (req, res) => {
  try {
    const { userId } = req.body;

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Setup webhook with Google Calendar
    const watchResponse = await googleEventService.setupWatch(userId);

    // Update user with webhook details
    user.watchChannelId = watchResponse.id;
    user.resourceId = watchResponse.resourceId;
    await user.save();

    res.json({
      success: true,
      channelId: watchResponse.id,
      expiration: watchResponse.expiration
    });
  } catch (error) {
    console.error('Webhook setup error:', error);
    res.status(500).json({ error: 'Failed to setup webhook' });
  }
};

exports.stopWebhook = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.watchChannelId || !user.resourceId) {
      return res.status(404).json({ error: 'No active webhook found' });
    }

    // Stop watching the calendar
    await googleEventService.stopWatch(user.watchChannelId, user.resourceId);

    // Clear webhook details from user
    user.watchChannelId = undefined;
    user.resourceId = undefined;
    await user.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Stop webhook error:', error);
    res.status(500).json({ error: 'Failed to stop webhook' });
  }
};