const mongoose = require('mongoose');
const LabourTeamMember = require('../../models/LabourTeamMember');
const WorkerAssignment = require('../../models/WorkerAssignment');
const Attendance = require('../../models/Attendance');

// MUSTER ROLL
exports.addTeamMember = async (req, res) => {
  try {
    const contractorId = req.user.id;
    const { name, mobile, skillType, workerId } = req.body;
    const member = await LabourTeamMember.create({ contractorId, workerId, name, mobile, skillType });
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    console.error('addTeamMember error:', err);
    res.status(500).json({ success: false, message: 'Failed to add team member' });
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const contractorId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const members = await LabourTeamMember.find({ contractorId, status: { $ne: 'removed' } })
      .skip(skip).limit(limit).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: members });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch team members' });
  }
};

exports.editTeamMember = async (req, res) => {
  try {
    const contractorId = req.user.id;
    const member = await LabourTeamMember.findOneAndUpdate(
      { _id: req.params.id, contractorId },
      req.body,
      { new: true }
    );
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    res.status(200).json({ success: true, data: member });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update member' });
  }
};

exports.removeTeamMember = async (req, res) => {
  try {
    const contractorId = req.user.id;
    const member = await LabourTeamMember.findOneAndUpdate(
      { _id: req.params.id, contractorId },
      { status: 'removed' },
      { new: true }
    );
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    res.status(200).json({ success: true, message: 'Member removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
};

// ASSIGNMENTS
exports.assignWorkersToBooking = async (req, res) => {
  try {
    const contractorId = req.user.id;
    const { bookingId } = req.params;
    const { labourTeamMemberIds } = req.body; 

    if (!Array.isArray(labourTeamMemberIds) || labourTeamMemberIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid members list' });
    }

    const assignments = [];
    for (const id of labourTeamMemberIds) {
      const member = await LabourTeamMember.findOne({ _id: id, contractorId });
      if (member) {
        assignments.push({ bookingId, contractorId, labourTeamMemberId: id });
      }
    }

    const created = await WorkerAssignment.insertMany(assignments);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to assign workers' });
  }
};

exports.getBookingAssignments = async (req, res) => {
  try {
    const contractorId = req.user.id;
    const { bookingId } = req.params;
    
    const assignments = await WorkerAssignment.find({ bookingId, contractorId, status: { $ne: 'replaced' } })
      .populate('labourTeamMemberId');
    res.status(200).json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch assignments' });
  }
};

exports.unassignWorker = async (req, res) => {
  try {
    const contractorId = req.user.id;
    const assignment = await WorkerAssignment.findOneAndDelete({ _id: req.params.id, contractorId });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.status(200).json({ success: true, message: 'Unassigned successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to unassign worker' });
  }
};

exports.replaceWorker = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const contractorId = req.user.id;
    const { id } = req.params; 
    const { newLabourTeamMemberId } = req.body;

    const oldAssignment = await WorkerAssignment.findOne({ _id: id, contractorId, status: { $ne: 'replaced' } }).session(session);
    if (!oldAssignment) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Active assignment not found' });
    }

    const newMember = await LabourTeamMember.findOne({ _id: newLabourTeamMemberId, contractorId }).session(session);
    if (!newMember) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'New team member not found' });
    }

    oldAssignment.status = 'replaced';
    await oldAssignment.save({ session });

    const newAssignment = new WorkerAssignment({
      bookingId: oldAssignment.bookingId,
      contractorId,
      labourTeamMemberId: newLabourTeamMemberId
    });
    await newAssignment.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ success: true, message: 'Worker replaced atomically', data: newAssignment });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('replaceWorker error:', err);
    res.status(500).json({ success: false, message: 'Failed to replace worker' });
  }
};

// ATTENDANCE
exports.markBatchAttendance = async (req, res) => {
  try {
    const contractorId = req.user.id;
    const { date, attendanceList } = req.body; 

    // Enforce 3 day backdate window
    const markDate = new Date(date);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    if (markDate < threeDaysAgo) {
      return res.status(400).json({ success: false, message: 'Cannot mark attendance older than 3 days' });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (const record of attendanceList) {
      try {
        const assignment = await WorkerAssignment.findOne({ _id: record.workerAssignmentId, contractorId });
        if (!assignment) {
          results.failed++;
          results.errors.push({ workerAssignmentId: record.workerAssignmentId, reason: 'Assignment not found or does not belong to you' });
          continue;
        }

        await Attendance.findOneAndUpdate(
          { workerAssignmentId: record.workerAssignmentId, date },
          { status: record.status, markedBy: contractorId },
          { upsert: true, new: true }
        );
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ workerAssignmentId: record.workerAssignmentId, reason: err.message });
      }
    }

    res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error('Batch attendance error:', err);
    res.status(500).json({ success: false, message: 'Batch attendance failed' });
  }
};

exports.getAttendanceHistory = async (req, res) => {
  try {
    const contractorId = req.user.id;
    const { bookingId, dateFrom, dateTo, page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required' });
    }

    const assignments = await WorkerAssignment.find({ bookingId, contractorId }).select('_id');
    const assignmentIds = assignments.map(a => a._id);

    const query = { workerAssignmentId: { $in: assignmentIds } };
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom; 
      if (dateTo) query.date.$lte = dateTo;
    }

    const attendance = await Attendance.find(query)
      .populate({
        path: 'workerAssignmentId',
        populate: { path: 'labourTeamMemberId', select: 'name mobile' }
      })
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({ success: true, data: attendance });
  } catch (err) {
    console.error('Get attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance history' });
  }
};

exports.editAttendanceRecord = async (req, res) => {
  try {
    const contractorId = req.user.id;
    const { id } = req.params;
    const { newStatus } = req.body;

    const record = await Attendance.findById(id).populate('workerAssignmentId');
    if (!record || record.workerAssignmentId.contractorId.toString() !== contractorId) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    record.editHistory.push({
      editedBy: contractorId,
      oldStatus: record.status,
      newStatus: newStatus
    });

    record.status = newStatus;
    await record.save();

    res.status(200).json({ success: true, data: record });
  } catch (err) {
    console.error('Edit attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to edit attendance' });
  }
};
