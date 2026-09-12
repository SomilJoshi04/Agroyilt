const WorkerGroupRequest = require('../../models/WorkerGroupRequest');
const Worker = require('../../models/Worker');
const Team = require('../../models/Team');
const Booking = require('../../models/Booking');
const Notification = require('../../models/Notification');
const { getIO } = require('../../sockets');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toMins = (t) => {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return h * 60 + m;
};

const hasTimeConflict = async (workerId, scheduledDate, startTime, endTime) => {
  const dateStart = new Date(scheduledDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setHours(23, 59, 59, 999);

  const bookingConflict = await Booking.findOne({
    workerId,
    scheduledDate: { $gte: dateStart, $lte: dateEnd },
    status: { $nin: ['cancelled', 'rejected', 'expired'] },
    'timeSlot.start': { $lt: endTime },
    'timeSlot.end':   { $gt: startTime }
  });
  if (bookingConflict) return true;

  // Check group requests where this worker is already selected
  const groupConflict = await WorkerGroupRequest.findOne({
    selectedWorkers: workerId,
    scheduledDate: { $gte: dateStart, $lte: dateEnd },
    status: { $in: ['confirmed', 'selection_pending', 'collecting_members'] },
    startTime: { $lt: endTime },
    endTime:   { $gt: startTime }
  });
  return !!groupConflict;
};

const emitSafe = (room, event, data) => {
  try {
    const io = getIO();
    if (io) io.to(room).emit(event, data);
  } catch (e) {
    console.warn('[Socket] emit failed:', e.message);
  }
};

const notify = async ({ recipientType, recipientId, type, title, message, relatedId, relatedType, data }) => {
  try {
    const notifDoc = { type, title, message, relatedId, relatedType, data: data || {} };
    if (recipientType === 'user')   notifDoc.userId   = recipientId;
    if (recipientType === 'worker') notifDoc.workerId = recipientId;

    const notif = await Notification.create(notifDoc);
    const room = recipientType === 'user' ? `user_${recipientId}` : `worker_${recipientId}`;
    emitSafe(room, 'notification', notif);
    emitSafe(room, 'worker_group_update', { requestId: relatedId, type });
  } catch (e) {
    console.warn('[Notify] failed:', e.message);
  }
};

// ─── Farmer: List Team Leaders ────────────────────────────────────────────────

/**
 * GET /user/team-leaders
 * List approved team leaders with their team info.
 */
exports.listTeamLeaders = async (req, res) => {
  try {
    const { skill, minRating, maxRate, minTeamSize } = req.query;

    const query = {
      workerType: 'TEAM_LEADER',
      approvalStatus: { $in: ['approved', 'pending'] },
      status: { $in: ['active', 'offline', 'online'] }
    };
    if (skill)     query.skills = { $in: [new RegExp(skill, 'i')] };
    if (minRating) query.rating = { $gte: Number(minRating) };
    if (maxRate)   query.dailyRate = { $lte: Number(maxRate) };

    let leaders = await Worker.find(query)
      .select('name profilePhoto skills serviceCategories specializedExperience rating totalJobs completedJobs dailyRate hourlyRate address teamId status')
      .populate('teamId', 'name memberCount maxCapacity location')
      .sort({ rating: -1, completedJobs: -1 })
      .limit(40);

    // Filter by team size if needed
    if (minTeamSize) {
      leaders = leaders.filter(l => (l.teamId?.memberCount || 0) >= Number(minTeamSize));
    }

    return res.json({ success: true, data: leaders });
  } catch (err) {
    console.error('[listTeamLeaders]', err);
    return res.status(500).json({ success: false, message: 'Failed to load team leaders.' });
  }
};

/**
 * GET /user/team-leader/:leaderId
 * Full profile of a team leader including live available member count.
 */
exports.getTeamLeaderDetail = async (req, res) => {
  try {
    const leader = await Worker.findOne({
      _id: req.params.leaderId,
      workerType: 'TEAM_LEADER',
      approvalStatus: 'approved',
      isActive: true
    })
      .select('-password -mpin')
      .populate('teamId', 'name memberCount maxCapacity location');

    if (!leader) return res.status(404).json({ success: false, message: 'Team leader not found.' });
    return res.json({ success: true, data: leader });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load leader profile.' });
  }
};

// ─── Farmer: Create Group Request ────────────────────────────────────────────

/**
 * POST /user/group-request
 * Farmer sends a group booking request to a Team Leader.
 */
exports.createGroupRequest = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const {
      teamLeaderId, workCategory, workTitle, workDescription,
      requiredSkills, additionalInstructions,
      scheduledDate, startTime, endTime, rateUnit,
      location, farmerOfferedRatePerWorker, requiredWorkers
    } = req.body;

    // Validation
    if (!teamLeaderId || !scheduledDate || !startTime || !endTime || !requiredWorkers || farmerOfferedRatePerWorker === undefined) {
      return res.status(400).json({ success: false, message: 'teamLeaderId, scheduledDate, startTime, endTime, requiredWorkers, and farmerOfferedRatePerWorker are required.' });
    }
    if (Number(requiredWorkers) < 1) {
      return res.status(400).json({ success: false, message: 'At least 1 worker is required.' });
    }
    if (Number(farmerOfferedRatePerWorker) <= 0) {
      return res.status(400).json({ success: false, message: 'Offered rate must be greater than 0.' });
    }
    if (toMins(endTime) <= toMins(startTime)) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }
    const scheduledDateObj = new Date(scheduledDate);
    if (isNaN(scheduledDateObj.getTime()) || scheduledDateObj < new Date(new Date().setHours(0,0,0,0))) {
      return res.status(400).json({ success: false, message: 'Invalid or past scheduled date.' });
    }

    // Validate team leader
    const leader = await Worker.findOne({ _id: teamLeaderId, workerType: 'TEAM_LEADER', approvalStatus: 'approved', isActive: true });
    if (!leader) return res.status(404).json({ success: false, message: 'Team leader not found or unavailable.' });
    if (!leader.teamId) return res.status(400).json({ success: false, message: 'This leader has no active team.' });

    // Prevent duplicate pending request
    const duplicate = await WorkerGroupRequest.findOne({
      farmerId, teamLeaderId, status: 'pending',
      scheduledDate: { $gte: new Date(scheduledDate).setHours(0,0,0,0), $lte: new Date(scheduledDate).setHours(23,59,59,999) }
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'You already have a pending group request to this team for this date.' });
    }

    // Validate required workers vs team capacity
    const team = await Team.findById(leader.teamId);
    if (!team || team.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Leader team is not active.' });
    }
    if (Number(requiredWorkers) > team.memberCount + 1) { // +1 for leader himself
      return res.status(400).json({ success: false, message: `This team only has ${team.memberCount} members. Cannot fulfill ${requiredWorkers} workers.` });
    }

    const leaderRate = (rateUnit === 'hourly' ? leader.hourlyRate : leader.dailyRate) || 0;

    const request = await WorkerGroupRequest.create({
      farmerId,
      teamLeaderId,
      teamId: leader.teamId,
      workCategory:   workCategory || '',
      workTitle:      workTitle || '',
      workDescription: workDescription || '',
      requiredSkills:  requiredSkills || [],
      additionalInstructions: additionalInstructions || '',
      scheduledDate:  scheduledDateObj,
      startTime, endTime,
      rateUnit:       rateUnit || 'daily',
      location:       location || {},
      requiredWorkers: Number(requiredWorkers),
      leaderRate,
      farmerOfferedRatePerWorker: Number(farmerOfferedRatePerWorker),
      negotiation: [{
        by: 'farmer',
        rate: Number(farmerOfferedRatePerWorker),
        message: `Farmer's opening offer: ₹${farmerOfferedRatePerWorker}/worker`
      }]
    });

    await notify({
      recipientType: 'worker', recipientId: teamLeaderId,
      type: 'group_booking_request',
      title: 'Group Work Request',
      message: `New group request for ${requiredWorkers} workers on ${scheduledDateObj.toDateString()}. Work: ${workTitle || workCategory || 'unspecified'}.`,
      relatedId: request._id, relatedType: 'worker_group_request'
    });

    return res.status(201).json({ success: true, message: 'Group request sent to team leader.', data: request });
  } catch (err) {
    console.error('[createGroupRequest]', err);
    return res.status(500).json({ success: false, message: 'Failed to send group request.' });
  }
};

/**
 * GET /user/group-requests
 * Farmer gets their group requests.
 */
exports.getMyGroupRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { farmerId: req.user._id };
    if (status) query.status = status;

    const requests = await WorkerGroupRequest.find(query)
      .populate('teamLeaderId', 'name profilePhoto skills rating dailyRate')
      .populate('teamId', 'name memberCount')
      .populate('selectedWorkers', 'name profilePhoto skills rating dailyRate')
      .populate('memberRequests.workerId', 'name profilePhoto skills')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load group requests.' });
  }
};

/**
 * PATCH /user/group-request/:id/respond
 * Farmer responds to a counter offer from the team leader.
 * body: { action: 'accept' | 'reject' | 'counter', rate? }
 */
exports.farmerRespondToGroupCounter = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { action, rate, message } = req.body;

    const request = await WorkerGroupRequest.findOne({ _id: req.params.id, farmerId });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
    }
    const lastStep = request.negotiation[request.negotiation.length - 1];
    if (!lastStep || lastStep.by !== 'leader') {
      return res.status(400).json({ success: false, message: 'No leader counter offer to respond to.' });
    }

    if (action === 'accept') {
      request.agreedRatePerWorker = lastStep.rate;
      // Leader already accepted the request; now send to members
      request.status = 'leader_accepted';
      request.negotiation.push({ by: 'farmer', rate: lastStep.rate, message: 'Farmer accepted leader rate.' });
      await request.save();

      await notify({
        recipientType: 'worker', recipientId: request.teamLeaderId,
        type: 'group_booking_accepted',
        title: 'Rate Accepted',
        message: `Farmer accepted your rate of ₹${lastStep.rate}/worker. Please dispatch your team members.`,
        relatedId: request._id, relatedType: 'worker_group_request'
      });
      return res.json({ success: true, message: 'Rate accepted. Waiting for leader to dispatch members.', data: request });

    } else if (action === 'reject') {
      request.status = 'rejected';
      await request.save();
      await notify({
        recipientType: 'worker', recipientId: request.teamLeaderId,
        type: 'group_booking_rejected',
        title: 'Offer Rejected',
        message: `Farmer rejected your counter offer. Request closed.`,
        relatedId: request._id, relatedType: 'worker_group_request'
      });
      return res.json({ success: true, message: 'Counter offer rejected.', data: request });

    } else if (action === 'counter') {
      if (!rate || Number(rate) <= 0) {
        return res.status(400).json({ success: false, message: 'Valid counter rate required.' });
      }
      request.negotiation.push({ by: 'farmer', rate: Number(rate), message: message || '' });
      await request.save();
      await notify({
        recipientType: 'worker', recipientId: request.teamLeaderId,
        type: 'group_booking_counter',
        title: 'Counter Offer',
        message: `Farmer countered with ₹${rate}/worker.`,
        relatedId: request._id, relatedType: 'worker_group_request'
      });
      return res.json({ success: true, message: 'Counter offer sent.', data: request });

    } else {
      return res.status(400).json({ success: false, message: 'Invalid action.' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to respond.' });
  }
};

/**
 * DELETE /user/group-request/:id
 * Farmer cancels a pending group request.
 */
exports.cancelGroupRequest = async (req, res) => {
  try {
    const request = await WorkerGroupRequest.findOne({ _id: req.params.id, farmerId: req.user._id });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (!['pending'].includes(request.status)) {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${request.status} request.` });
    }
    request.status = 'cancelled';
    await request.save();

    await notify({
      recipientType: 'worker', recipientId: request.teamLeaderId,
      type: 'group_booking_rejected',
      title: 'Request Cancelled',
      message: 'The farmer cancelled their group work request.',
      relatedId: request._id, relatedType: 'worker_group_request'
    });

    return res.json({ success: true, message: 'Group request cancelled.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to cancel.' });
  }
};

// ─── Team Leader Side ─────────────────────────────────────────────────────────

/**
 * GET /worker/group-requests
 * Team leader views incoming group requests.
 */
exports.getLeaderGroupRequests = async (req, res) => {
  try {
    const leaderId = req.user._id;
    const { status } = req.query;
    const query = { teamLeaderId: leaderId };
    if (status) query.status = status;

    const requests = await WorkerGroupRequest.find(query)
      .populate('farmerId', 'name phone profilePhoto')
      .populate('selectedWorkers', 'name profilePhoto skills rating')
      .populate('memberRequests.workerId', 'name profilePhoto skills rating')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load requests.' });
  }
};

/**
 * PATCH /worker/group-request/:id/respond
 * Team leader accepts, rejects, or counter-offers.
 * body: { action: 'accept' | 'reject' | 'counter', rate?, message? }
 */
exports.leaderRespondToRequest = async (req, res) => {
  try {
    const leaderId = req.user._id;
    const { action, rate, message } = req.body;

    const request = await WorkerGroupRequest.findOne({ _id: req.params.id, teamLeaderId: leaderId });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
    }
    if (request.expiresAt && request.expiresAt < new Date()) {
      request.status = 'expired';
      await request.save();
      return res.status(410).json({ success: false, message: 'Request has expired.' });
    }

    if (action === 'accept') {
      // Use last farmer offered rate
      const lastStep = request.negotiation[request.negotiation.length - 1];
      const agreedRate = lastStep?.rate || request.farmerOfferedRatePerWorker;
      request.agreedRatePerWorker = agreedRate;
      request.status = 'leader_accepted';
      request.negotiation.push({ by: 'leader', rate: agreedRate, message: 'Leader accepted farmer offer.' });
      await request.save();

      await notify({
        recipientType: 'user', recipientId: request.farmerId,
        type: 'group_booking_accepted',
        title: 'Team Leader Accepted',
        message: `Team leader accepted your group request at ₹${agreedRate}/worker. They will now gather their team.`,
        relatedId: request._id, relatedType: 'worker_group_request'
      });
      return res.json({ success: true, message: 'Request accepted. Now dispatch team members.', data: request });

    } else if (action === 'reject') {
      request.status = 'rejected';
      request.rejectionReason = message || 'Leader rejected the request.';
      await request.save();

      await notify({
        recipientType: 'user', recipientId: request.farmerId,
        type: 'group_booking_rejected',
        title: 'Request Rejected',
        message: 'The team leader declined your group work request. Try another team.',
        relatedId: request._id, relatedType: 'worker_group_request'
      });
      return res.json({ success: true, message: 'Request rejected.', data: request });

    } else if (action === 'counter') {
      if (!rate || Number(rate) <= 0) {
        return res.status(400).json({ success: false, message: 'Valid counter rate required.' });
      }
      request.negotiation.push({ by: 'leader', rate: Number(rate), message: message || '' });
      await request.save();

      await notify({
        recipientType: 'user', recipientId: request.farmerId,
        type: 'group_booking_counter',
        title: 'Counter Offer',
        message: `Team leader countered with ₹${rate}/worker. Review and respond.`,
        relatedId: request._id, relatedType: 'worker_group_request'
      });
      return res.json({ success: true, message: 'Counter offer sent.', data: request });

    } else {
      return res.status(400).json({ success: false, message: 'Invalid action.' });
    }
  } catch (err) {
    console.error('[leaderRespondToRequest]', err);
    return res.status(500).json({ success: false, message: 'Failed to respond.' });
  }
};

/**
 * POST /worker/group-request/:id/dispatch-members
 * After leader accepts, dispatch the request to eligible team members.
 */
exports.dispatchToMembers = async (req, res) => {
  try {
    const leaderId = req.user._id;
    const request = await WorkerGroupRequest.findOne({
      _id: req.params.id, teamLeaderId: leaderId, status: 'leader_accepted'
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found or not in leader_accepted state.' });

    // Find active team members (excluding leader if not including himself)
    const Worker = require('../../models/Worker');
    const members = await Worker.find({
      teamId: request.teamId,
      workerType: 'WORKER',
      isActive: true,
      approvalStatus: 'approved'
    }).select('_id');

    if (members.length === 0) {
      return res.status(400).json({ success: false, message: 'No eligible team members found.' });
    }

    // Filter out members with time conflicts
    const eligibleMembers = [];
    for (const m of members) {
      const conflict = await hasTimeConflict(m._id, request.scheduledDate, request.startTime, request.endTime);
      if (!conflict) eligibleMembers.push(m._id);
    }

    if (eligibleMembers.length === 0) {
      return res.status(400).json({ success: false, message: 'All team members have conflicting bookings for this time.' });
    }

    // Set memberRequests
    request.memberRequests = eligibleMembers.map(id => ({ workerId: id, status: 'pending' }));
    request.status = 'collecting_members';
    await request.save();

    // Notify each member
    for (const memberId of eligibleMembers) {
      await notify({
        recipientType: 'worker', recipientId: memberId,
        type: 'group_member_request',
        title: 'Team Work Request',
        message: `Your team leader has a group job on ${request.scheduledDate.toDateString()}. Please respond.`,
        relatedId: request._id, relatedType: 'worker_group_request'
      });
    }

    return res.json({
      success: true,
      message: `Request dispatched to ${eligibleMembers.length} team members.`,
      data: request
    });
  } catch (err) {
    console.error('[dispatchToMembers]', err);
    return res.status(500).json({ success: false, message: 'Failed to dispatch.' });
  }
};

/**
 * PATCH /worker/group-request/:id/member-respond
 * A team member accepts or rejects the group request.
 * body: { action: 'accept' | 'reject' }
 */
exports.memberRespondToRequest = async (req, res) => {
  try {
    const workerId = req.user._id.toString();
    const { action } = req.body;
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be accept or reject.' });
    }

    const request = await WorkerGroupRequest.findOne({
      _id: req.params.id,
      status: 'collecting_members',
      'memberRequests.workerId': workerId
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });

    const memberEntry = request.memberRequests.find(m => m.workerId.toString() === workerId);
    if (!memberEntry) return res.status(404).json({ success: false, message: 'You are not part of this request.' });
    if (memberEntry.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'You have already responded.' });
    }

    memberEntry.status = action === 'accept' ? 'accepted' : 'rejected';
    memberEntry.respondedAt = new Date();

    // Check if all members have responded
    const allResponded = request.memberRequests.every(m => m.status !== 'pending');
    if (allResponded) {
      request.status = 'selection_pending';
    }

    await request.save();

    // Notify leader
    await notify({
      recipientType: 'worker', recipientId: request.teamLeaderId,
      type: action === 'accept' ? 'group_member_accepted' : 'group_member_rejected',
      title: `Team Member ${action === 'accept' ? 'Accepted' : 'Declined'}`,
      message: `A team member ${action === 'accept' ? 'accepted' : 'declined'} the group work request.`,
      relatedId: request._id, relatedType: 'worker_group_request'
    });

    return res.json({ success: true, message: `Response recorded.`, data: { status: memberEntry.status } });
  } catch (err) {
    console.error('[memberRespondToRequest]', err);
    return res.status(500).json({ success: false, message: 'Failed to respond.' });
  }
};

/**
 * PATCH /worker/group-request/:id/select-workers
 * Team leader finalizes which workers to submit.
 * body: { workerIds: [...] }  ← must NOT exceed request.requiredWorkers
 */
exports.leaderSelectWorkers = async (req, res) => {
  try {
    const leaderId = req.user._id;
    const { workerIds } = req.body;

    if (!Array.isArray(workerIds) || workerIds.length === 0) {
      return res.status(400).json({ success: false, message: 'workerIds must be a non-empty array.' });
    }

    const request = await WorkerGroupRequest.findOne({
      _id: req.params.id,
      teamLeaderId: leaderId,
      status: { $in: ['selection_pending', 'collecting_members'] }
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found or not ready for selection.' });

    // SECURITY: Backend enforces max workers
    if (workerIds.length > request.requiredWorkers) {
      return res.status(400).json({
        success: false,
        message: `Cannot select more than ${request.requiredWorkers} workers. Farmer only requested ${request.requiredWorkers}.`
      });
    }

    // SECURITY: All selected workers must have accepted THIS request and belong to this team
    const acceptedIds = request.memberRequests
      .filter(m => m.status === 'accepted')
      .map(m => m.workerId.toString());

    // Leader himself can be included if he's in workerIds
    const leaderIdStr = leaderId.toString();

    for (const wid of workerIds) {
      if (wid.toString() !== leaderIdStr && !acceptedIds.includes(wid.toString())) {
        return res.status(400).json({
          success: false,
          message: `Worker ${wid} did not accept this request or does not belong to this team.`
        });
      }
    }

    // Final availability re-check for all selected workers
    for (const wid of workerIds) {
      const conflict = await hasTimeConflict(wid, request.scheduledDate, request.startTime, request.endTime);
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `Worker ${wid} now has a conflicting booking. Please reselect.`
        });
      }
    }

    request.selectedWorkers = workerIds;
    request.status = 'confirmed';
    await request.save();

    // Notify selected workers
    for (const wid of workerIds) {
      await notify({
        recipientType: 'worker', recipientId: wid,
        type: 'group_member_selected',
        title: 'You\'re Selected!',
        message: `You have been selected for the group work on ${request.scheduledDate.toDateString()}.`,
        relatedId: request._id, relatedType: 'worker_group_request'
      });
    }

    // Notify rejected (accepted but not selected)
    const notSelected = acceptedIds.filter(id => !workerIds.map(w => w.toString()).includes(id));
    for (const wid of notSelected) {
      await notify({
        recipientType: 'worker', recipientId: wid,
        type: 'group_member_not_selected',
        title: 'Not Selected',
        message: 'You accepted but were not selected for this group job. Thank you for responding.',
        relatedId: request._id, relatedType: 'worker_group_request'
      });
    }

    // Notify farmer
    await notify({
      recipientType: 'user', recipientId: request.farmerId,
      type: 'group_booking_confirmed',
      title: 'Workers Selected!',
      message: `The team leader selected ${workerIds.length} workers for your group request. Booking confirmed!`,
      relatedId: request._id, relatedType: 'worker_group_request'
    });

    // Calculate final backend-authoritative total
    const totalAmount = (request.agreedRatePerWorker || request.farmerOfferedRatePerWorker) * workerIds.length;

    return res.json({
      success: true,
      message: `${workerIds.length} workers selected. Booking confirmed.`,
      data: {
        request,
        selectedCount: workerIds.length,
        agreedRatePerWorker: request.agreedRatePerWorker || request.farmerOfferedRatePerWorker,
        totalAmount
      }
    });
  } catch (err) {
    console.error('[leaderSelectWorkers]', err);
    return res.status(500).json({ success: false, message: 'Failed to select workers.' });
  }
};

/**
 * GET /worker/group-request/:id/members
 * Leader views member responses for a group request.
 */
exports.getMemberResponses = async (req, res) => {
  try {
    const leaderId = req.user._id;
    const request = await WorkerGroupRequest.findOne({
      _id: req.params.id, teamLeaderId: leaderId
    }).populate('memberRequests.workerId', 'name profilePhoto skills rating dailyRate');

    if (!request) return res.status(404).json({ success: false, message: 'Request not found.' });
    return res.json({
      success: true,
      data: {
        requiredWorkers: request.requiredWorkers,
        memberRequests: request.memberRequests,
        acceptedCount: request.memberRequests.filter(m => m.status === 'accepted').length,
        rejectedCount: request.memberRequests.filter(m => m.status === 'rejected').length,
        pendingCount:  request.memberRequests.filter(m => m.status === 'pending').length,
        selectedWorkers: request.selectedWorkers
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to load member responses.' });
  }
};
