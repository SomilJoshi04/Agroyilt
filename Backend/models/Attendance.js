const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  workerAssignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkerAssignment',
    required: true
  },
  date: {
    type: String, // Stored as YYYY-MM-DD for easy querying
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'leave'],
    required: true
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor', // The contractor who marked it
    required: true
  },
  editHistory: [{
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    editedAt: { type: Date, default: Date.now },
    oldStatus: String,
    newStatus: String
  }]
}, { timestamps: true });

// Composite index for fast lookup and preventing duplicates per day
attendanceSchema.index({ workerAssignmentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
