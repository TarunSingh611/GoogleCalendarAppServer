// services/googleCalendar.js
const { google } = require('googleapis');
const User = require('../models/User');

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

    async refreshAccessToken(user) {
        try {
            if (!user.refreshToken) {
                throw new Error('No refresh token available');
            }

            this.oauth2Client.setCredentials({
                refresh_token: user.refreshToken
            });

            const { tokens } = await this.oauth2Client.refreshAccessToken();

            // Update user's tokens in database
            user.accessToken = tokens.access_token;
            if (tokens.refresh_token) {
                user.refreshToken = tokens.refresh_token;
            }
            await user.save();

            return tokens.access_token;
        } catch (error) {
            console.error('Token refresh error:', error);
            throw new Error('Failed to refresh access token');
        }
    }

    async createEvent(userId, eventData) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            if (!user.accessToken) {
                throw new Error('User not properly authenticated with Google Calendar');
            }

            // Set credentials
            this.oauth2Client.setCredentials({
                access_token: user.accessToken,
                refresh_token: user.refreshToken
            });

            const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

            const event = {
                summary: eventData.title,
                description: eventData.description || '',
                start: {
                    dateTime: new Date(eventData.startDateTime).toISOString(),
                    timeZone: 'UTC'
                },
                end: {
                    dateTime: new Date(eventData.endDateTime).toISOString(),
                    timeZone: 'UTC'
                }
            };

            try {
                const response = await calendar.events.insert({
                    calendarId: 'primary',
                    requestBody: event  // Changed from resource to requestBody
                });

                return {
                    googleEventId: response.data.id,
                    title: response.data.summary,
                    description: response.data.description || '',
                    startDateTime: response.data.start.dateTime,
                    endDateTime: response.data.end.dateTime
                };
            } catch (error) {
                if (error.response?.status === 401) {
                    // Token expired, try refreshing
                    console.log('Refreshing expired token...');
                    const newAccessToken = await this.refreshAccessToken(user);

                    // Update credentials with new token
                    this.oauth2Client.setCredentials({
                        access_token: newAccessToken,
                        refresh_token: user.refreshToken
                    });

                    // Retry the request
                    const retryResponse = await calendar.events.insert({
                        calendarId: 'primary',
                        requestBody: event
                    });

                    return {
                        googleEventId: retryResponse.data.id,
                        title: retryResponse.data.summary,
                        description: retryResponse.data.description || '',
                        startDateTime: retryResponse.data.start.dateTime,
                        endDateTime: retryResponse.data.end.dateTime
                    };
                }
                throw error;
            }
        } catch (error) {
            console.error('Google Calendar create event error:', error);
            throw new Error(`Failed to create event in Google Calendar: ${error.message}`);
        }
    }

    async updateEvent(userId, eventId, updateData) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            this.oauth2Client.setCredentials({
                access_token: user.accessToken,
                refresh_token: user.refreshToken
            });

            const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

            // First get the existing event
            const existingEvent = await calendar.events.get({
                calendarId: 'primary',
                eventId: eventId
            });

            // Prepare the update payload
            const event = {
                summary: updateData.title || existingEvent.data.summary,
                description: updateData.description || existingEvent.data.description,
                start: {
                    dateTime: updateData.startDateTime
                        ? new Date(updateData.startDateTime).toISOString()
                        : existingEvent.data.start.dateTime,
                    timeZone: 'UTC'
                },
                end: {
                    dateTime: updateData.endDateTime
                        ? new Date(updateData.endDateTime).toISOString()
                        : existingEvent.data.end.dateTime,
                    timeZone: 'UTC'
                }
            };

            try {
                const response = await calendar.events.update({
                    calendarId: 'primary',
                    eventId: eventId,
                    requestBody: event
                });

                return {
                    id: response.data.id,
                    title: response.data.summary,
                    description: response.data.description || '',
                    startDateTime: response.data.start.dateTime,
                    endDateTime: response.data.end.dateTime
                };
            } catch (error) {
                if (error.response?.status === 401) {
                    // Token expired, try refreshing
                    console.log('Refreshing expired token...');
                    const newAccessToken = await this.refreshAccessToken(user);

                    // Update credentials with new token
                    this.oauth2Client.setCredentials({
                        access_token: newAccessToken,
                        refresh_token: user.refreshToken
                    });

                    // Retry the request
                    const retryResponse = await calendar.events.update({
                        calendarId: 'primary',
                        eventId: eventId,
                        requestBody: event
                    });

                    return {
                        id: retryResponse.data.id,
                        title: retryResponse.data.summary,
                        description: retryResponse.data.description || '',
                        startDateTime: retryResponse.data.start.dateTime,
                        endDateTime: retryResponse.data.end.dateTime
                    };
                }
                throw error;
            }
        } catch (error) {
            console.error('Google Calendar update event error:', error);
            throw new Error(`Failed to update event in Google Calendar: ${error.message}`);
        }
    }

    async deleteEvent(userId, eventId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            this.oauth2Client.setCredentials({
                access_token: user.accessToken,
                refresh_token: user.refreshToken
            });

            const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

            try {
                await calendar.events.delete({
                    calendarId: 'primary',
                    eventId: eventId
                });
                return true;
            } catch (error) {
                if (error.response?.status === 401) {
                    // Token expired, try refreshing
                    console.log('Refreshing expired token...');
                    const newAccessToken = await this.refreshAccessToken(user);

                    // Update credentials with new token
                    this.oauth2Client.setCredentials({
                        access_token: newAccessToken,
                        refresh_token: user.refreshToken
                    });

                    // Retry the request
                    await calendar.events.delete({
                        calendarId: 'primary',
                        eventId: eventId
                    });
                    return true;
                }
                throw error;
            }
        } catch (error) {
            console.error('Google Calendar delete event error:', error);
            throw new Error(`Failed to delete event from Google Calendar: ${error.message}`);
        }
    }

    async setupWatch(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

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
            throw new Error('Failed to setup calendar watch');
        }
    }

    async syncEvents(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            this.oauth2Client.setCredentials({
                access_token: user.accessToken,
                refresh_token: user.refreshToken
            });

            const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

            // Get all events from Google Calendar
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                maxResults: 100,
                singleEvents: true,
                orderBy: 'startTime'
            });

            const googleEvents = response.data.items;

            // Get existing events from database
            const existingEvents = await Event.find({ userId });
            const existingEventMap = new Map(
                existingEvents.map(event => [event.googleEventId, event])
            );

            // Process each Google Calendar event
            for (const googleEvent of googleEvents) {
                const existingEvent = existingEventMap.get(googleEvent.id);

                if (!existingEvent) {
                    // Create new event
                    await Event.create({
                        googleEventId: googleEvent.id,
                        userId,
                        title: googleEvent.summary,
                        description: googleEvent.description || '',
                        startDateTime: googleEvent.start.dateTime || googleEvent.start.date,
                        endDateTime: googleEvent.end.dateTime || googleEvent.end.date
                    });
                } else {
                    // Update existing event if changed
                    const needsUpdate =
                        existingEvent.title !== googleEvent.summary ||
                        existingEvent.description !== (googleEvent.description || '') ||
                        new Date(existingEvent.startDateTime).getTime() !== new Date(googleEvent.start.dateTime || googleEvent.start.date).getTime() ||
                        new Date(existingEvent.endDateTime).getTime() !== new Date(googleEvent.end.dateTime || googleEvent.end.date).getTime();

                    if (needsUpdate) {
                        await Event.findByIdAndUpdate(existingEvent._id, {
                            title: googleEvent.summary,
                            description: googleEvent.description || '',
                            startDateTime: googleEvent.start.dateTime || googleEvent.start.date,
                            endDateTime: googleEvent.end.dateTime || googleEvent.end.date
                        });
                    }
                }

                // Remove from map to track deletions
                existingEventMap.delete(googleEvent.id);
            }

            // Delete events that no longer exist in Google Calendar
            for (const [googleEventId, event] of existingEventMap) {
                await Event.findByIdAndDelete(event._id);
            }

            return true;
        } catch (error) {
            console.error('Sync events error:', error);
            throw new Error('Failed to sync events');
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

    async listEvents(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

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
                orderBy: 'startTime'
            });

            return response.data.items.map(event => ({
                id: event.id,
                title: event.summary,
                description: event.description || '',
                startDateTime: event.start.dateTime || event.start.date,
                endDateTime: event.end.dateTime || event.end.date
            }));
        } catch (error) {
            console.error('List events error:', error);
            throw new Error('Failed to list events');
        }
    }
}

module.exports = new GoogleCalendarService();