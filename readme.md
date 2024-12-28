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
Installation
Clone the repository:
bash
Copy Code
git clone https://github.com/yourusername/google-calendar-server.git
cd google-calendar-server
Install dependencies:
bash
Copy Code
npm install
Start the server:
bash
Copy Code
# Development mode
npm run dev

# Production mode
npm start
API Endpoints
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
Google Calendar Integration
Create a project in Google Cloud Console
Enable Google Calendar API
Configure OAuth2 consent screen
Create OAuth2 credentials
Add authorized redirect URIs
Update environment variables with credentials
Webhook Setup
The server supports real-time calendar synchronization through webhooks:

Webhook notifications are received at /api/webhook/calendar
Setup webhook for a user using /api/webhook/setup
Webhook automatically syncs calendar changes
Stop webhook notifications using /api/webhook/stop
Error Handling
The server implements comprehensive error handling:

Authentication errors
API request validation
Google Calendar API errors
Database operation errors
Security Features
JWT-based authentication
OAuth2 token management
Request validation
CORS configuration
Environment variable protection
Development
bash
Copy Code
# Run in development mode
npm run dev

# Run in production mode
npm start
Deployment
The server can be deployed to various platforms:

Traditional Hosting:
Install Node.js
Setup MongoDB
Configure environment variables
Run npm start
Docker:
Build image: docker build -t google-calendar-server .
Run container: docker run -p 5000:5000 google-calendar-server
Cloud Platforms:
Deploy to Heroku, AWS, or Google Cloud
Configure environment variables
Setup MongoDB connection
Contributing
Fork the repository
Create your feature branch (git checkout -b feature/AmazingFeature)
Commit your changes (git commit -m 'Add some AmazingFeature')
Push to the branch (git push origin feature/AmazingFeature)

