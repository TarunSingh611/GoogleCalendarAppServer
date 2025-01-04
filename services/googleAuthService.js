// services/googleAuthService.js
const { google } = require('googleapis');

class GoogleAuthService {
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

    getAuthenticatedClient(user) {
        if (!user.accessToken) {
            throw new Error('No access token available');
        }

        this.oauth2Client.setCredentials({
            access_token: user.accessToken,
            refresh_token: user.refreshToken
        });

        return google.calendar({ version: 'v3', auth: this.oauth2Client });
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
}

module.exports = new GoogleAuthService();