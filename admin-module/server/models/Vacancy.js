const mongoose = require('mongoose');

const VacancySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a vacancy title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  location: {
    type: String,
    required: [true, 'Please add a location']
  },
  rent: {
    type: Number,
    required: [true, 'Please add rent amount']
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Filled', 'Expired', 'Rejected'],
    default: 'Pending'
  },
  smartDoor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SmartDoor'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  }
});

module.exports = mongoose.model('Vacancy', VacancySchema);
