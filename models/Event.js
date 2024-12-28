// server/models/Event.js
const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  googleEventId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  startDateTime: {
    type: Date,
    required: true
  },
  endDateTime: {
    type: Date,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);