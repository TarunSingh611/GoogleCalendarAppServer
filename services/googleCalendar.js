// server/services/googleCalendar.js
const { google } = require('googleapis');
const User = require('../models/User');
const Event = require('../models/Event');

class GoogleCalendarService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.FRONTEND_URL}/auth/google/callback`
        );
    }

    async setupWatch(userId) {
        const user = await User.findById(userId);
        this.oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        });

        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        const response = await calendar.events.watch({
            calendarId: 'primary',
            requestBody: {
                id: `channel-${userId}`,
                type: 'web_hook',
                address: `${process.env.FRONTEND_URL}/api/webhook/calendar`,
            },
        });

        await User.findByIdAndUpdate(userId, {
            watchChannelId: response.data.id,
            resourceId: response.data.resourceId
        });

        return response.data;
    }

    async createEvent(userId, eventData) {
        const user = await User.findById(userId);
        this.oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        });

        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        const event = {
            summary: eventData.title,
            description: eventData.description,
            start: {
                dateTime: eventData.startDateTime,
                timeZone: 'UTC',
            },
            end: {
                dateTime: eventData.endDateTime,
                timeZone: 'UTC',
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });

        const newEvent = new Event({
            googleEventId: response.data.id,
            userId,
            title: eventData.title,
            description: eventData.description,
            startDateTime: eventData.startDateTime,
            endDateTime: eventData.endDateTime,
        });

        await newEvent.save();
        return newEvent;
    }

    async syncEvents(userId) {
        const user = await User.findById(userId);
        this.oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        });

        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = response.data.items;

        // Update local database with Google Calendar events
        for (const event of events) {
            await Event.findOneAndUpdate(
                { googleEventId: event.id },
                {
                    title: event.summary,
                    description: event.description,
                    startDateTime: event.start.dateTime,
                    endDateTime: event.end.dateTime,
                    status: event.status,
                },
                { upsert: true }
            );
        }

        return await Event.find({ userId });
    }

    // server/services/googleCalendar.js
    // Add these methods to the existing GoogleCalendarService class

    async setupWatch(userId) {
        const user = await User.findById(userId);
        this.oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        });

        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        const watchRequest = {
            id: `channel-${userId}-${Date.now()}`, // Unique channel ID
            type: 'web_hook',
            address: `${process.env.SERVER_URL}/api/webhook/calendar`, // Your webhook endpoint
            params: {
                ttl: '86400' // 24 hours in seconds
            }
        };

        try {
            const response = await calendar.events.watch({
                calendarId: 'primary',
                requestBody: watchRequest
            });

            return response.data;
        } catch (error) {
            console.error('Setup watch error:', error);
            throw new Error('Failed to setup calendar watch');
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

    async syncEvents(userId) {
        const user = await User.findById(userId);
        this.oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        });

        const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

        try {
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                maxResults: 100,
                singleEvents: true,
                orderBy: 'startTime'
            });

            const events = response.data.items;

            // Update local database
            for (const event of events) {
                await Event.findOneAndUpdate(
                    { googleEventId: event.id, userId },
                    {
                        title: event.summary,
                        description: event.description || '',
                        startDateTime: event.start.dateTime || event.start.date,
                        endDateTime: event.end.dateTime || event.end.date,
                        status: event.status
                    },
                    { upsert: true, new: true }
                );
            }

            return events;
        } catch (error) {
            console.error('Sync events error:', error);
            throw new Error('Failed to sync calendar events');
        }
    }
}

module.exports = new GoogleCalendarService();