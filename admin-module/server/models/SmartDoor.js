const mongoose = require('mongoose');

const SmartDoorSchema = new mongoose.Schema({
  doorId: {
    type: String,
    required: [true, 'Please add a unique Door ID'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please add a name/label for the door'],
    trim: true
  },
  status: {
    type: String,
    enum: ['Online', 'Offline'],
    default: 'Offline'
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  lastSyncTime: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SmartDoor', SmartDoorSchema);
