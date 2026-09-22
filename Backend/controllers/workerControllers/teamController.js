const mongoose = require('mongoose');
const Worker = require('../../models/Worker');
const Team = require('../../models/Team');
const TeamRequest = require('../../models/TeamRequest');
const Notification = require('../../models/Notification');

// Utility to create notifications
const sendTeamNotification = async (userId, title, message, relatedType, type) => {
  try {
    await Notification.create({
      workerId: userId,
      title,
      message,
      relatedType,
      type
    });
  } catch (error) {
    console.error('Notification error:', error);
  }
};

/**
 * Get My Team Details
 * If TEAM_LEADER: Returns team details, members, and pending requests
 * If WORKER: Returns their team details (if any)
 */
exports.getMyTeam = async (req, res) => {
  try {
    const worker = await Worker.findById(req.userId).populate('teamId');
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    if (worker.workerType === 'TEAM_LEADER') {
      if (!worker.teamId) {
        return res.status(200).json({ success: true, team: null, members: [] });
      }
      
      const team = worker.teamId;
      const members = await Worker.find({ teamId: team._id, _id: { $ne: req.userId } })
        .select('name phone status workerType skills rating profilePhoto dailyRate hourlyRate experience experienceYears serviceCategory serviceCategories');
      return res.status(200).json({ success: true, team, members });
    } else {
      // WORKER
      if (!worker.teamId) {
        return res.status(200).json({ success: true, team: null });
      }
      
      const team = worker.teamId;
      const leader = await Worker.findById(team.leaderId)
        .select('name phone status workerType skills rating profilePhoto dailyRate hourlyRate experience experienceYears serviceCategory serviceCategories');
      return res.status(200).json({ success: true, team, leader });
    }
  } catch (error) {
    console.error('getMyTeam error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Search Eligible Workers for Team Leader to Invite
 * Only TEAM_LEADER can search. 
 * Workers should not have a team. Team leaders can be searched for Merge.
 */
exports.searchEligibleWorkers = async (req, res) => {
  try {
    const { query } = req.query;
    let filter = { _id: { $ne: req.userId } };

    // If query is provided, filter by name or phone
    if (query && query.length >= 3) {
      filter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ];
    } else if (query && query.length > 0 && query.length < 3) {
      return res.status(400).json({ success: false, message: 'Search query must be at least 3 characters' });
    }

    // Only get eligible workers: 
    // 1. Regular workers without a team
    // 2. Team leaders (who can be merged)
    filter = {
      ...filter,
      $or: [
        { workerType: 'WORKER', teamId: null },
        { workerType: 'TEAM_LEADER' }
      ]
    };
    
    // If there was a search query, we need an $and to combine the search $or with the eligibility $or
    if (query && query.length >= 3) {
      filter = {
        _id: { $ne: req.userId },
        $and: [
          {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { phone: { $regex: query, $options: 'i' } }
            ]
          },
          {
            $or: [
              { workerType: 'WORKER', teamId: null },
              { workerType: 'TEAM_LEADER' }
            ]
          }
        ]
      };
    }

    const workers = await Worker.find(filter)
      .select('name phone workerType teamId status skills rating profilePhoto dailyRate hourlyRate experience experienceYears serviceCategory serviceCategories')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, workers });
  } catch (error) {
    console.error('searchEligibleWorkers error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Get Incoming and Outgoing Team Requests
 */
exports.getRequests = async (req, res) => {
  try {
    const incoming = await TeamRequest.find({ receiverId: req.userId, status: 'PENDING' })
      .populate('senderId', 'name phone')
      .populate('targetTeamId', 'name');
      
    const outgoing = await TeamRequest.find({ senderId: req.userId, status: 'PENDING' })
      .populate('receiverId', 'name phone')
      .populate('targetTeamId', 'name');

    res.status(200).json({ success: true, incoming, outgoing });
  } catch (error) {
    console.error('getRequests error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Send Team Request (Join / Merge / Migration)
 */
exports.sendRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { receiverId, type } = req.body;
    
    if (!['JOIN_WORKER', 'MERGE_TEAM'].includes(type)) {
      throw new Error('Invalid request type');
    }

    const sender = await Worker.findById(req.userId).session(session);
    if (sender.workerType !== 'TEAM_LEADER') {
      throw new Error('Only Team Leaders can send requests');
    }

    // Ensure sender has a team, create one if not
    let senderTeam = null;
    if (!sender.teamId) {
      const newTeam = await Team.create([{
        leaderId: sender._id,
        name: `${sender.name}'s Team`
      }], { session });
      senderTeam = newTeam[0];
      sender.teamId = senderTeam._id;
      await sender.save({ session });
    } else {
      senderTeam = await Team.findById(sender.teamId).session(session);
    }

    const receiver = await Worker.findById(receiverId).session(session);
    if (!receiver) throw new Error('Target worker not found');

    // Validation based on type
    if (type === 'JOIN_WORKER') {
      if (receiver.workerType !== 'WORKER') throw new Error('Target must be a WORKER');
      if (receiver.teamId) throw new Error('Worker is already in a team');
    } else if (type === 'MERGE_TEAM') {
      if (receiver.workerType !== 'TEAM_LEADER') throw new Error('Target must be a TEAM_LEADER');
      if (!receiver.teamId) throw new Error('Target team leader does not have an active team');
      if (receiver.teamId.toString() === sender.teamId.toString()) throw new Error('Cannot merge same team');
    }

    // Check existing pending request
    const existing = await TeamRequest.findOne({
      senderId: req.userId,
      receiverId,
      status: 'PENDING',
      type
    }).session(session);
    
    if (existing) throw new Error('A pending request already exists');

    // Create Request
    const request = await TeamRequest.create([{
      senderId: req.userId,
      receiverId,
      targetTeamId: senderTeam._id,
      sourceTeamId: type === 'MERGE_TEAM' ? receiver.teamId : null,
      type
    }], { session });

    // Send Notification
    await sendTeamNotification(
      receiverId,
      'New Team Invite',
      `${sender.name} invited you to join their team.`,
      'team_request',
      type === 'MERGE_TEAM' ? 'team_merge_request' : 'team_invite_received'
    );

    await session.commitTransaction();
    res.status(200).json({ success: true, message: 'Request sent successfully', request: request[0] });
  } catch (error) {
    await session.abortTransaction();
    console.error('sendRequest error:', error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Accept Team Request
 */
exports.acceptRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const request = await TeamRequest.findOne({ _id: req.params.id, receiverId: req.userId, status: 'PENDING' }).session(session);
    if (!request) throw new Error('Request not found or expired');

    const receiver = await Worker.findById(req.userId).session(session);
    const targetTeam = await Team.findById(request.targetTeamId).session(session);
    if (!targetTeam) throw new Error('Target team no longer exists');

    if (request.type === 'JOIN_WORKER') {
      if (receiver.teamId) throw new Error('You are already in a team');
      
      receiver.teamId = targetTeam._id;
      await receiver.save({ session });
      
      targetTeam.memberCount += 1;
      await targetTeam.save({ session });
      
      request.status = 'ACCEPTED';
      await request.save({ session });
      
      await sendTeamNotification(request.senderId, 'Invite Accepted', `${receiver.name} joined your team.`, 'team', 'team_member_joined');
    } else if (request.type === 'MERGE_TEAM') {
      const sourceTeam = await Team.findById(receiver.teamId).session(session);
      if (!sourceTeam) throw new Error('Your team no longer exists');
      
      // Target capacity check
      if (targetTeam.memberCount + sourceTeam.memberCount + 1 > targetTeam.maxCapacity) {
        throw new Error('Target team capacity exceeded');
      }

      // Convert Receiver to WORKER
      receiver.workerType = 'WORKER';
      receiver.teamId = targetTeam._id;
      await receiver.save({ session });
      
      // Update Target Team count (Source Team count + Leader)
      targetTeam.memberCount += (sourceTeam.memberCount + 1);
      await targetTeam.save({ session });
      
      // Trigger Migration for Source Team Members
      sourceTeam.status = 'MIGRATING';
      sourceTeam.migrationToTeamId = targetTeam._id;
      await sourceTeam.save({ session });
      
      // Find source team members and create MIGRATION_TRANSFER requests
      const members = await Worker.find({ teamId: sourceTeam._id, _id: { $ne: receiver._id } }).session(session);
      for (const member of members) {
        await TeamRequest.create([{
          senderId: request.senderId, // New leader
          receiverId: member._id,
          targetTeamId: targetTeam._id,
          sourceTeamId: sourceTeam._id,
          type: 'MIGRATION_TRANSFER'
        }], { session });
        
        await sendTeamNotification(member._id, 'Team Migration', `Your team leader merged with ${targetTeam.name}. Accept the transfer request to stay with your team.`, 'team_request', 'team_migration_request');
      }
      
      request.status = 'ACCEPTED';
      await request.save({ session });
      
      await sendTeamNotification(request.senderId, 'Merge Accepted', `${receiver.name} merged their team into yours.`, 'team', 'team_merge_accepted');
    } else if (request.type === 'MIGRATION_TRANSFER') {
      receiver.teamId = targetTeam._id;
      await receiver.save({ session });
      
      request.status = 'ACCEPTED';
      await request.save({ session });
      
      // Member count was already incremented during MERGE_TEAM, but we could handle differently. 
      // Actually, if we incremented it above, we shouldn't increment here. 
    }

    await session.commitTransaction();
    res.status(200).json({ success: true, message: 'Request accepted' });
  } catch (error) {
    await session.abortTransaction();
    console.error('acceptRequest error:', error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Reject Request
 */
exports.rejectRequest = async (req, res) => {
  try {
    const request = await TeamRequest.findOneAndUpdate(
      { _id: req.params.id, receiverId: req.userId, status: 'PENDING' },
      { status: 'REJECTED' },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    
    res.status(200).json({ success: true, message: 'Request rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Cancel Request
 */
exports.cancelRequest = async (req, res) => {
  try {
    const request = await TeamRequest.findOneAndUpdate(
      { _id: req.params.id, senderId: req.userId, status: 'PENDING' },
      { status: 'CANCELLED' },
      { new: true }
    );
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    
    res.status(200).json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Leave Team (Worker)
 */
exports.leaveTeam = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const worker = await Worker.findById(req.userId).session(session);
    if (!worker.teamId || worker.workerType === 'TEAM_LEADER') {
      throw new Error('Only active workers can leave teams');
    }
    
    const team = await Team.findById(worker.teamId).session(session);
    if (team) {
      team.memberCount = Math.max(0, team.memberCount - 1);
      await team.save({ session });
      await sendTeamNotification(team.leaderId, 'Member Left', `${worker.name} left the team.`, 'team', 'team_member_left');
    }
    
    worker.teamId = null;
    await worker.save({ session });
    
    await session.commitTransaction();
    res.status(200).json({ success: true, message: 'Left team successfully' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Remove Member (Team Leader)
 */
exports.removeMember = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { memberId } = req.body;
    const leader = await Worker.findById(req.userId).session(session);
    if (leader.workerType !== 'TEAM_LEADER' || !leader.teamId) {
      throw new Error('Unauthorized');
    }
    
    const member = await Worker.findById(memberId).session(session);
    if (!member || !member.teamId || member.teamId.toString() !== leader.teamId.toString()) {
      throw new Error('Member not found in your team');
    }
    
    const team = await Team.findById(leader.teamId).session(session);
    team.memberCount = Math.max(0, team.memberCount - 1);
    await team.save({ session });
    
    member.teamId = null;
    await member.save({ session });
    
    await sendTeamNotification(member._id, 'Removed from Team', `You have been removed from the team by the leader.`, 'team', 'team_member_removed');
    
    await session.commitTransaction();
    res.status(200).json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Get Public Profile DTO
 */
exports.getPublicProfile = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.workerId).select('-password');
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    
    let teamInfo = null;
    if (worker.teamId) {
      const team = await Team.findById(worker.teamId).select('name memberCount status');
      teamInfo = team;
    }
    
    res.status(200).json({ success: true, worker, teamInfo });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

/**
 * Upgrade to Team Leader
 */
exports.upgradeToLeader = async (req, res) => {
  try {
    const worker = await Worker.findById(req.userId);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });

    if (worker.workerType === 'TEAM_LEADER') {
      return res.status(400).json({ success: false, message: 'Already a Team Leader' });
    }
    if (worker.teamId) {
      return res.status(400).json({ success: false, message: 'Cannot upgrade while in a team. Leave first.' });
    }

    worker.workerType = 'TEAM_LEADER';
    const team = await Team.create({
      leaderId: worker._id,
      name: `${worker.name}'s Team`,
      memberCount: 1,
      status: 'ACTIVE'
    });
    worker.teamId = team._id;
    await worker.save();

    res.status(200).json({ success: true, message: 'Successfully upgraded to Team Leader!', team });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
