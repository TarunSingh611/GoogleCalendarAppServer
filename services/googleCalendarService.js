// services/googleCalendarService.js
const { google } = require('googleapis');
const User = require('../models/User');
const Event = require('../models/Event');

class GoogleCalendarService {
    constructor() {
        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            throw new Error('Missing Google OAuth credentials');
        }

        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.FRONTEND_URL}/auth/google/callback`
        );
    }

    async setupWatch(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');
            
            this.oauth2Client.setCredentials({
                access_token: user.accessToken,
                refresh_token: user.refreshToken,
            });

            const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
            const webhookBaseUrl = process.env.NODE_ENV === 'development' 
                ? process.env.NGROK_URL 
                : process.env.SERVER_URL;

            if (!webhookBaseUrl) throw new Error('Webhook base URL not configured');

            const watchRequest = {
                id: `channel-${userId}-${Date.now()}`,
                type: 'web_hook',
                address: `${webhookBaseUrl}/api/webhook/calendar`,
                params: { ttl: '86400' }
            };

            const response = await calendar.events.watch({
                calendarId: 'primary',
                requestBody: watchRequest
            });

            return {
                id: response.data.id,
                resourceId: response.data.resourceId,
                expiration: response.data.expiration
            };
        } catch (error) {
            console.error('Setup watch error:', error);
            throw new Error(`Failed to setup calendar watch: ${error.message}`);
        }
    }

    async stopWatch(channelId, resourceId) {
        try {
            const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
            await calendar.channels.stop({
                requestBody: {
                    id: channelId,
                    resourceId: resourceId
                }
            });
            return true;
        } catch (error) {
            console.error('Stop watch error:', error);
            throw new Error('Failed to stop calendar watch');
        }
    }

    async processEvents(googleEvents, userId) {
        for (const googleEvent of googleEvents) {
            const existingEvent = await Event.findOne({
                googleEventId: googleEvent.id,
                userId,
            });

            const eventData = {
                googleEventId: googleEvent.id,
                userId,
                title: googleEvent.summary,
                description: googleEvent.description || '',
                startDateTime: googleEvent.start.dateTime || googleEvent.start.date,
                endDateTime: googleEvent.end.dateTime || googleEvent.end.date,
            };

            if (!existingEvent) {
                await Event.create(eventData);
            } else {
                const needsUpdate = this.checkIfEventNeedsUpdate(existingEvent, eventData);
                if (needsUpdate) {
                    await Event.findByIdAndUpdate(existingEvent._id, eventData);
                }
            }
        }
    }

    checkIfEventNeedsUpdate(existingEvent, newEventData) {
        return existingEvent.title !== newEventData.title ||
            existingEvent.description !== newEventData.description ||
            new Date(existingEvent.startDateTime).getTime() !== new Date(newEventData.startDateTime).getTime() ||
            new Date(existingEvent.endDateTime).getTime() !== new Date(newEventData.endDateTime).getTime();
    }
}

module.exports = new GoogleCalendarService();