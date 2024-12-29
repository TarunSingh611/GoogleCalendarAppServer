// server/controllers/webhookController.js
const User = require('../models/User');
const googleCalendarService = require('../services/googleCalendar');

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
          break;
  
        case 'exists':
        case 'update':
          // Calendar was updated
          console.log('Calendar update notification received');
          await googleCalendarService.syncEvents(user._id);
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
          break;
  
        case 'exists':
        case 'update':
          // Calendar was updated
          console.log('Calendar update notification received');
          await googleCalendarService.syncEvents(user._id);
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

exports.setupWebhook = async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Validate user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Setup webhook with Google Calendar
        const watchResponse = await googleCalendarService.setupWatch(userId);

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
        await googleCalendarService.stopWatch(user.watchChannelId, user.resourceId);

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