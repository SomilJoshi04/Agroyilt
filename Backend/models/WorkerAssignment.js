const mongoose = require('mongoose');

const workerAssignmentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  contractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  labourTeamMemberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabourTeamMember',
    required: true
  },
  assignedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['assigned', 'active', 'completed', 'replaced'],
    default: 'assigned'
  }
}, { timestamps: true });

workerAssignmentSchema.index({ bookingId: 1, contractorId: 1 });

module.exports = mongoose.model('WorkerAssignment', workerAssignmentSchema);
