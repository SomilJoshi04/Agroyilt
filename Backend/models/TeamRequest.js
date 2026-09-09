const mongoose = require('mongoose');

const teamRequestSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker', // Sender is always a TEAM_LEADER
    required: true,
    index: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker', // Target Worker or smaller TEAM_LEADER
    required: true,
    index: true
  },
  sourceTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null, // Populated for MERGE_TEAM and MIGRATION_TRANSFER
    index: true
  },
  targetTeamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['JOIN_WORKER', 'MERGE_TEAM', 'MIGRATION_TRANSFER'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
    default: 'PENDING',
    index: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
  }
}, {
  timestamps: true
});

// Indexes for race condition / duplicate request prevention
// A worker cannot have multiple PENDING requests of the same type from the same team
teamRequestSchema.index({ receiverId: 1, targetTeamId: 1, type: 1, status: 1 });
teamRequestSchema.index({ senderId: 1, receiverId: 1, status: 1 });

module.exports = mongoose.model('TeamRequest', teamRequestSchema);
