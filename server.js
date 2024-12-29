// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const webhookRoutes = require('./routes/webhook');
const { statusHTML } = require('./statusHTML');
const cron = require('node-cron');
const User = require('./models/User');
const googleCalendarService = require('./services/googleCalendar');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
const allowedOrigins = [
    'https://google-calendar-app-liard.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173', 
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/status', (req, res) => {
  res.send({ status: 'OK' });})
// Add root route handler
app.get('/', (req, res) => {
  res.send(statusHTML);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/webhook', webhookRoutes);


cron.schedule('0 */12 * * *', async () => {
  try {
    const users = await User.find({ watchChannelId: { $exists: true } });
    
    for (const user of users) {
      try {
        // Stop existing webhook
        await googleCalendarService.stopWatch(user.watchChannelId, user.resourceId);
        
        // Setup new webhook
        const watchResponse = await googleCalendarService.setupWatch(user._id);
        
        // Update user with new webhook details
        user.watchChannelId = watchResponse.id;
        user.resourceId = watchResponse.resourceId;
        await user.save();
      } catch (error) {
        console.error(`Failed to renew webhook for user ${user._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Webhook renewal cron job failed:', error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});