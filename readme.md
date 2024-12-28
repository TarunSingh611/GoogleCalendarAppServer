# Google Calendar API Server

A robust Node.js backend server that integrates with Google Calendar API, providing seamless calendar management and event synchronization capabilities.

## Features

- 🔐 Google OAuth2 Authentication
- 📅 Calendar Event Management (CRUD operations)
- 🔄 Real-time Calendar Synchronization
- 🎯 Webhook Integration for Live Updates
- 🔒 JWT-based Authentication
- 📦 MongoDB Integration

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Google Calendar API
- JWT Authentication
- Webhook Integration

## Prerequisites

Before you begin, ensure you have:

- Node.js (v14 or higher)
- MongoDB installed and running
- Google Cloud Console Project with Calendar API enabled
- Google OAuth2 credentials

## Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=your_frontend_url
SERVER_URL=your_server_url
```
Installation
Clone the repository:
```
git clone https://github.com/yourusername/google-calendar-server.git
cd google-calendar-server
```
Install dependencies:
```
npm install
```
Start the server:
```
# Development mode
npm run dev

# Production mode
npm start

```

*API Endpoints*


Authentication

POST /api/auth/google - Google OAuth authentication
POST /api/auth/refresh-token - Refresh access token
POST /api/auth/logout - User logout


Events

GET /api/events/:userId - Get user's events
POST /api/events - Create new event
PUT /api/events/:eventId - Update existing event
DELETE /api/events/:eventId - Delete event


Webhooks

POST /api/webhook/calendar - Handle calendar notifications
POST /api/webhook/setup - Setup webhook for user
POST /api/webhook/stop - Stop webhook notifications

```
Project Structure
├── config/
│   └── db.js
├── controllers/
│   ├── authController.js
│   ├── eventController.js
│   └── webhookController.js
├── middleware/
│   └── auth.js
├── models/
│   ├── Event.js
│   └── User.js
├── routes/
│   ├── auth.js
│   ├── events.js
│   └── webhook.js
├── services/
│   └── googleCalendar.js
├── .env
├── .gitignore
├── package.json
└── server.js
```

Google Calendar Integration
```
1.Create a project in Google Cloud Console
2.Enable Google Calendar API
3.Configure OAuth2 consent screen
4.Create OAuth2 credentials
5.Add authorized redirect URIs
6.Update environment variables with credentials
```

Webhook Setup
```
The server supports real-time calendar synchronization through webhooks:

1.Webhook notifications are received at /api/webhook/calendar
2.Setup webhook for a user using /api/webhook/setup
3.Webhook automatically syncs calendar changes
4.Stop webhook notifications using /api/webhook/stop
```

Error Handling
```
The server implements comprehensive error handling:

1.Authentication errors
2.API request validation
3.Google Calendar API errors
4.Database operation errors
```
Security Features
```
1.JWT-based authentication
2.OAuth2 token management
3.Request validation
4.CORS configuration
5.Environment variable protection
```
Development
```
# Run in development mode
npm run dev

# Run in production mode
npm start
```

Contributing
```
Fork the repository
1.Create your feature branch (git checkout -b feature/AmazingFeature)
2.Commit your changes (git commit -m 'Add some AmazingFeature')
3.Push to the branch (git push origin feature/AmazingFeature)
```
