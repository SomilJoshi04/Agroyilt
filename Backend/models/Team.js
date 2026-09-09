const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  leaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a team name'],
    trim: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'MIGRATING', 'CLOSED'],
    default: 'ACTIVE',
    index: true
  },
  memberCount: {
    type: Number,
    default: 0 // Only active Worker members of the team (excluding leader)
  },
  maxCapacity: {
    type: Number,
    default: 20
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  migrationToTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);
