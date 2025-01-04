// services/googleEventService.js
const User = require('../models/User');
const Event = require('../models/Event');
const googleAuthService = require('./googleAuthService');


class GoogleEventService {
    async createEvent(userId, eventData) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            const calendar = googleAuthService.getAuthenticatedClient(user);
            
            const event = {
                summary: eventData.title,
                description: eventData.description,
                start: {
                    dateTime: new Date(eventData.startDateTime).toISOString(),
                    timeZone: 'UTC'
                },
                end: {
                    dateTime: new Date(eventData.endDateTime).toISOString(),
                    timeZone: 'UTC'
                }
            };

            const response = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: event
            });

            return this.formatEventResponse(response.data);
        } catch (error) {
            console.error('Create event error:', error);
            throw new Error('Failed to create event');
        }
    }

    async updateEvent(userId, eventId, updateData) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            const calendar = googleAuthService.getAuthenticatedClient(user);
            const existingEvent = await calendar.events.get({
                calendarId: 'primary',
                eventId: eventId
            });

            const event = this.prepareEventUpdatePayload(existingEvent.data, updateData);
            
            try {
                const response = await calendar.events.update({
                    calendarId: 'primary',
                    eventId: eventId,
                    requestBody: event
                });
                return this.formatEventResponse(response.data);
            } catch (error) {
                if (error.response?.status === 401) {
                    const newAccessToken = await googleAuthService.refreshAccessToken(user);
                    calendar.setCredentials({ access_token: newAccessToken, refresh_token: user.refreshToken });
                    const retryResponse = await calendar.events.update({
                        calendarId: 'primary',
                        eventId: eventId,
                        requestBody: event
                    });
                    return this.formatEventResponse(retryResponse.data);
                }
                throw error;
            }
        } catch (error) {
            console.error('Update event error:', error);
            throw new Error(`Failed to update event: ${error.message}`);
        }
    }

    async deleteEvent(userId, eventId) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            const calendar = googleAuthService.getAuthenticatedClient(user);
            await calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId
            });
            return true;
        } catch (error) {
            console.error('Delete event error:', error);
            throw new Error('Failed to delete event');
        }
    }

    async listEvents(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            const calendar = googleAuthService.getAuthenticatedClient(user);
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: new Date().toISOString(),
                maxResults: 100,
                singleEvents: true,
                orderBy: 'startTime'
            });

            return response.data.items.map(event => this.formatEventResponse(event));
        } catch (error) {
            console.error('List events error:', error);
            throw new Error('Failed to list events');
        }
    }

    async syncCalendarWithDatabase(userId) {
        try {
          const user = await User.findById(userId);
          if (!user) throw new Error('User not found');
      
          // Get all events from Google Calendar
          const googleEvents = await this.listEvents(userId);
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

    formatEventResponse(event) {
        return {
            id: event.id,
            title: event.summary,
            description: event.description || '',
            startDateTime: event.start.dateTime || event.start.date,
            endDateTime: event.end.dateTime || event.end.date
        };
    }

    prepareEventUpdatePayload(existingEvent, updateData) {
        return {
            summary: updateData.title || existingEvent.summary,
            description: updateData.description || existingEvent.description,
            start: {
                dateTime: updateData.startDateTime
                    ? new Date(updateData.startDateTime).toISOString()
                    : existingEvent.start.dateTime,
                timeZone: 'UTC'
            },
            end: {
                dateTime: updateData.endDateTime
                    ? new Date(updateData.endDateTime).toISOString()
                    : existingEvent.end.dateTime,
                timeZone: 'UTC'
            }
        };
    }
}

module.exports = new GoogleEventService();