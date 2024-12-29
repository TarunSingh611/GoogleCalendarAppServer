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
                // if (error.response?.status === 401) {
                //     // Token expired, try refreshing
                //     console.log('Refreshing expired token...');
                //     const newAccessToken = await this.refreshAccessToken(user);
                    
                //     // Update credentials with new token
                //     this.oauth2Client.setCredentials({
                //         access_token: newAccessToken,
                //         refresh_token: user.refreshToken
                //     });

                //     // Retry the request
                //     const retryResponse = await calendar.events.insert({
                //         calendarId: 'primary',
                //         requestBody: event
                //     });

                //     return {
                //         googleEventId: retryResponse.data.id,
                //         title: retryResponse.data.summary,
                //         description: retryResponse.data.description || '',
                //         startDateTime: retryResponse.data.start.dateTime,
                //         endDateTime: retryResponse.data.end.dateTime
                //     };
                // }
                throw error;
            }
        } catch (error) {
            console.error('Google Calendar create event error:', error);
            throw new Error(`Failed to create event in Google Calendar: ${error.message}`);
        }
    }
}

module.exports = new GoogleCalendarService();