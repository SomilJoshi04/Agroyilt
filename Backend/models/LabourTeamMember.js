const mongoose = require('mongoose');

const labourTeamMemberSchema = new mongoose.Schema({
  contractorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    index: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    default: null // Null if worker hasn't registered independently
  },
  name: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
    required: true
  },
  skillType: {
    type: String,
    default: 'General Labour'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'removed'],
    default: 'active'
  }
}, { timestamps: true });

module.exports = mongoose.model('LabourTeamMember', labourTeamMemberSchema);
