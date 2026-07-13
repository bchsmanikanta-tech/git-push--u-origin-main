const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a notification title']
  },
  message: {
    type: String,
    required: [true, 'Please add notification body content']
  },
  type: {
    type: String,
    enum: ['Broadcast', 'Direct'],
    default: 'Broadcast'
  },
  channels: [{
    type: String,
    enum: ['System', 'Email', 'Push'],
    default: 'System'
  }],
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
    required: true
  },
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
