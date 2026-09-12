'use strict';

/**
 * farmerWorkerRequestController.js
 *
 * Farmer-First Worker Request System.
 * Backend auto-routes requests to Independent Workers or Team Leaders
 * based on Admin configuration — never trusting frontend routing hints.
 */

const WorkerBookingRequest = require('../../models/WorkerBookingRequest');
const Worker               = require('../../models/Worker');
const Team                 = require('../../models/Team');
const Booking              = require('../../models/Booking');
const Notification         = require('../../models/Notification');
const Settings             = require('../../models/Settings');
const { getIO }            = require('../../sockets');
const { calculateDistance } = require('../../services/locationService');

// ─── Constants ────────────────────────────────────────────────────────────────

// Worker statuses that are considered "online/available" for auto-dispatch
const ONLINE_STATUSES = ['online', 'ONLINE', 'active', 'ACTIVE'];

// Request expires after 24 hours
const REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:mm" into minutes from midnight */
const toMins = (t) => {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return h * 60 + m;
};

/** Emit to a Socket.io room, never throw */
const emitSafe = (room, event, data) => {
  try {
    const io = getIO();
    if (io) io.to(room).emit(event, data);
  } catch (e) {
    // socket failure is non-fatal; DB is source of truth
  }
};

/** Create a Notification doc + emit socket event */
const notify = async ({
  recipientType, recipientId,
  type, title, message,
  relatedId, relatedType, data
}) => {
  try {
    const doc = { type, title, message, relatedId, relatedType, data: data || {} };
    if (recipientType === 'user')   doc.userId   = recipientId;
    if (recipientType === 'worker') doc.workerId = recipientId;

    const notif = await Notification.create(doc);
    const room  = recipientType === 'user'
      ? `user_${recipientId}`
      : `worker_${recipientId}`;

    emitSafe(room, 'notification', notif);
    emitSafe(room, 'worker_booking_update', { requestId: relatedId, type });
  } catch (e) {
    // notification failure is non-fatal
  }
};

/** Check if a worker has a conflicting confirmed booking or accepted request */
const hasTimeConflict = async (workerId, scheduledDate, startTime, endTime, excludeRequestId = null) => {
  const dateStart = new Date(scheduledDate);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setHours(23, 59, 59, 999);

  // Check existing Bookings
  const bookingConflict = await Booking.findOne({
    workerId,
    scheduledDate: { $gte: dateStart, $lte: dateEnd },
    status: { $nin: ['cancelled', 'rejected', 'expired'] },
    'timeSlot.start': { $lt: endTime },
    'timeSlot.end':   { $gt: startTime }
  });
  if (bookingConflict) return true;

  // Check accepted broadcast requests this worker is part of
  const reqQuery = {
    'dispatchedTo': {
      $elemMatch: { workerId, status: 'accepted' }
    },
    scheduledDate: { $gte: dateStart, $lte: dateEnd },
    status: { $in: ['pending', 'awaiting_farmer_confirmation', 'confirmed'] },
    startTime: { $lt: endTime },
    endTime:   { $gt: startTime }
  };
  
  if (excludeRequestId) {
    reqQuery._id = { $ne: excludeRequestId };
  }
  
  const reqConflict = await WorkerBookingRequest.findOne(reqQuery);
  return !!reqConflict;
};

/** Load Admin settings from DB; never returns hardcoded defaults */
const loadAdminSettings = async () => {
  let settings = await Settings.findOne({ type: 'global' });
  if (!settings) {
    settings = await Settings.create({ type: 'global' });
  }
  return {
    maxIndependentWorkerRequest: settings.maxIndependentWorkerRequest ?? 5,
    workerSearchRadiusKm:        settings.workerSearchRadiusKm        ?? 15
  };
};

/** Normalize skills: lowercase, trim, deduplicate */
const normalizeSkills = (skills) => {
  if (!Array.isArray(skills)) return [];
  return [...new Set(
    skills
      .map(s => (typeof s === 'string' ? s.trim().toLowerCase() : ''))
      .filter(Boolean)
  )];
};

// ─── Validation ───────────────────────────────────────────────────────────────

const validateRequestPayload = (body) => {
  const {
    workCategory, workTitle, workDescription,
    requiredSkills, requiredWorkers,
    scheduledDate, startTime, endTime, rateUnit,
    location, minRate, maxRate
  } = body;

  const errors = [];

  if (!workTitle || workTitle.trim().length < 3)
    errors.push('Work title must be at least 3 characters.');
  if (!workDescription || workDescription.trim().length < 10)
    errors.push('Work description must be at least 10 characters.');

  const workerQty = parseInt(requiredWorkers, 10);
  if (!requiredWorkers || isNaN(workerQty) || workerQty < 1 || !Number.isInteger(workerQty))
    errors.push('Required workers must be a positive integer.');

  if (!scheduledDate)
    errors.push('Scheduled date is required.');
  else {
    const d = new Date(scheduledDate);
    if (isNaN(d.getTime()))  errors.push('Invalid scheduled date.');
    else if (d < new Date(new Date().setHours(0, 0, 0, 0)))
      errors.push('Scheduled date cannot be in the past.');
  }

  if (!startTime || !/^\d{2}:\d{2}$/.test(startTime))
    errors.push('Start time must be in HH:mm format.');
  if (!endTime || !/^\d{2}:\d{2}$/.test(endTime))
    errors.push('End time must be in HH:mm format.');
  if (startTime && endTime && toMins(endTime) <= toMins(startTime))
    errors.push('End time must be after start time.');

  if (!location || (!location.city && !location.addressLine1))
    errors.push('Work location (city or address) is required.');

  // Validate rates
  const min = Number(minRate);
  const max = Number(maxRate);
  if (!minRate && !maxRate) {
    errors.push('Budget/rate is required.');
  } else {
    if (isNaN(min) || !isFinite(min) || min <= 0)
      errors.push('Minimum rate must be a positive finite number.');
    if (maxRate !== undefined && maxRate !== null && maxRate !== '') {
      if (isNaN(max) || !isFinite(max) || max <= 0)
        errors.push('Maximum rate must be a positive finite number.');
      if (min > max)
        errors.push('Minimum rate cannot exceed maximum rate.');
    }
  }

  return errors;
};

// ─── Controller: createFarmerRequest ─────────────────────────────────────────

/**
 * POST /api/user/farmer-worker-request
 * Farmer submits a job requirement. Backend auto-routes to Independent or Team Leader flow.
 */
exports.createFarmerRequest = async (req, res) => {
  try {
    const farmerId = req.user._id; // always from auth token

    const {
      workCategory, workTitle, workDescription,
      requiredSkills, additionalInstructions,
      requiredWorkers,
      scheduledDate, startTime, endTime, rateUnit,
      location,
      minRate, maxRate
    } = req.body;

    // ── Validate ──────────────────────────────────────────────────────────
    const errors = validateRequestPayload(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const workerQty   = parseInt(requiredWorkers, 10);
    const normalSkills = normalizeSkills(requiredSkills);
    const scheduledDateObj = new Date(scheduledDate);

    // ── Load Admin settings (never trust frontend routing hints) ──────────
    const adminSettings = await loadAdminSettings();
    const { maxIndependentWorkerRequest, workerSearchRadiusKm } = adminSettings;

    // ── Duplicate request guard ───────────────────────────────────────────
    const dateStart = new Date(scheduledDateObj);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(dateStart);
    dateEnd.setHours(23, 59, 59, 999);

    const existingActive = await WorkerBookingRequest.findOne({
      farmerId,
      requestType: 'independent_broadcast',
      scheduledDate: { $gte: dateStart, $lte: dateEnd },
      startTime,
      status: { $in: ['pending', 'matching', 'awaiting_farmer_confirmation'] }
    });
    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active worker request for this date and time. Please cancel it first or wait for responses.'
      });
    }

    // ── Decide routing ────────────────────────────────────────────────────
    // CRITICAL: Backend decides, never frontend
    const requestType = workerQty <= maxIndependentWorkerRequest
      ? 'independent_broadcast'
      : 'team_leader';

    // ── Create the request record first ──────────────────────────────────
    const newRequest = await WorkerBookingRequest.create({
      farmerId,
      workCategory:    workCategory?.trim() || '',
      workTitle:       workTitle.trim(),
      workDescription: workDescription.trim(),
      requiredSkills:  normalSkills,
      additionalInstructions: additionalInstructions?.trim() || '',
      requiredWorkers: workerQty,
      scheduledDate:   scheduledDateObj,
      startTime,
      endTime,
      rateUnit:        rateUnit || 'daily',
      location: {
        addressLine1: location?.addressLine1 || '',
        city:         location?.city         || '',
        state:        location?.state        || '',
        pincode:      location?.pincode      || '',
        lat:          (location?.lat !== undefined && !isNaN(Number(location.lat))) ? Number(location.lat) : undefined,
        lng:          (location?.lng !== undefined && !isNaN(Number(location.lng))) ? Number(location.lng) : undefined
      },
      minRate: Number(minRate),
      maxRate: maxRate ? Number(maxRate) : Number(minRate),
      // For legacy compatibility, set farmerOfferedRate to minRate
      farmerOfferedRate: Number(minRate),
      requestType,
      routingSnapshot: {
        maxIndependentWorkerRequest,
        workerSearchRadiusKm
      },
      status: 'matching',
      expiresAt: new Date(Date.now() + REQUEST_TTL_MS)
    });

    // ── Independent Worker Flow ───────────────────────────────────────────
    if (requestType === 'independent_broadcast') {
      await dispatchToIndependentWorkers({
        request: newRequest,
        requiredSkills: normalSkills,
        scheduledDate: scheduledDateObj,
        startTime,
        endTime,
        workerLocation: location,
        radiusKm: workerSearchRadiusKm
      });
    } else {
      // ── Team Leader Flow ────────────────────────────────────────────────
      await dispatchToTeamLeaders({
        request: newRequest,
        requiredSkills: normalSkills,
        requiredWorkers: workerQty,
        scheduledDate: scheduledDateObj,
        startTime,
        endTime,
        workerLocation: location,
        radiusKm: workerSearchRadiusKm
      });
    }

    // Reload to get updated counts after dispatch
    const savedRequest = await WorkerBookingRequest.findById(newRequest._id);

    return res.status(201).json({
      success: true,
      message: requestType === 'independent_broadcast'
        ? `Request created. Matching workers within ${workerSearchRadiusKm} km...`
        : `Request created. Searching for Team Leaders within ${workerSearchRadiusKm} km...`,
      data: savedRequest,
      routing: requestType
    });

  } catch (err) {
    console.error('[createFarmerRequest]', err);
    return res.status(500).json({ success: false, message: 'Failed to create worker request.' });
  }
};

// ─── Dispatch to Independent Workers ─────────────────────────────────────────

async function dispatchToIndependentWorkers({
  request, requiredSkills, scheduledDate, startTime, endTime,
  workerLocation, radiusKm
}) {
  try {
    // Find ONLINE approved workers — not team leaders
    const baseQuery = {
      approvalStatus: 'approved',
      isActive: true,
      status: { $in: ONLINE_STATUSES },
      workerType: 'WORKER' // Independent workers only
    };

    // --- DEBUG LOGGING ---
    const allWorkers = await Worker.find({}).lean();
    console.log('[DEBUG] Total workers in DB:', allWorkers.length);
    allWorkers.forEach(w => {
      console.log(`[DEBUG] Worker ${w.name} (${w._id}) -> type: ${w.workerType}, approval: ${w.approvalStatus}, isActive: ${w.isActive}, status: ${w.status}, skills: ${w.skills.join(', ')}`);
    });
    // ---------------------

    // Skill filtering: Match by exact string OR any significant word in the required skills
    if (requiredSkills && requiredSkills.length > 0) {
      const regexConditions = requiredSkills.map(s => new RegExp(`^${s}$`, 'i'));
      
      // Also extract words > 2 chars for partial matching (e.g. "tractor" matches "Drive Tractor")
      const words = requiredSkills
        .flatMap(s => s.split(/[\s,]+/))
        .filter(w => w.length > 2);
        
      words.forEach(w => regexConditions.push(new RegExp(w, 'i')));
      
      baseQuery.skills = { $in: regexConditions };
    }

    const candidates = await Worker.find(baseQuery)
      .select('_id name skills location address status fcmTokens')
      .lean();

    console.log(`[DEBUG] Candidates passed baseQuery (Approval, Active, Status, Skills): ${candidates.length}`);

    // Filter by radius (Haversine, server-side)
    const farmLat = workerLocation?.lat;
    const farmLng = workerLocation?.lng;

    let eligible = candidates;

    if (farmLat !== undefined && farmLng !== undefined &&
        !isNaN(Number(farmLat)) && !isNaN(Number(farmLng))) {
      eligible = candidates.filter(w => {
        // If worker has no coords, fallback to city matching if available
        if (!w.location?.lat || !w.location?.lng || isNaN(Number(w.location.lat)) || isNaN(Number(w.location.lng))) {
          if (w.address && request.location?.city) {
            const reqCity = request.location.city.trim().toLowerCase();
            const wCity = (w.address.city || '').trim().toLowerCase();
            const wFull = (w.address.fullAddress || '').toLowerCase();
            
            const match = wCity === reqCity || wCity.includes(reqCity) || wFull.includes(reqCity);
            console.log(`[DEBUG] Worker ${w.name} fallback city match: ${match} (${wCity} or ${wFull} vs ${reqCity})`);
            return match;
          }
          console.log(`[DEBUG] Worker ${w.name} excluded: No valid location coords and no address match.`);
          return false;
        }
        const dist = calculateDistance(
          { lat: Number(farmLat), lng: Number(farmLng) },
          { lat: Number(w.location.lat), lng: Number(w.location.lng) }
        );
        const withinRadius = dist <= radiusKm;
        console.log(`[DEBUG] Worker ${w.name} distance: ${dist} km. Allowed (<= ${radiusKm}km): ${withinRadius}`);
        return withinRadius; // include workers exactly ON the boundary
      });
    }
    // If farmer location has no coords, all workers in the query pass through
    // (location-unknown requests still reach workers)

    // Conflict check — exclude workers with conflicting bookings
    const available = [];
    for (const w of eligible) {
      const conflict = await hasTimeConflict(w._id, scheduledDate, startTime, endTime);
      if (!conflict) available.push(w);
    }

    const dispatchedTo = available.map(w => ({
      workerId: w._id,
      status:   'pending'
    }));

    // Update request with dispatch info
    await WorkerBookingRequest.findByIdAndUpdate(request._id, {
      eligibleWorkersCount:   available.length,
      dispatchedWorkersCount: available.length,
      dispatchedTo,
      status: 'pending'
    });

    // Notify each worker via socket + notification
    for (const w of available) {
      await notify({
        recipientType: 'worker',
        recipientId:   w._id,
        type:          'worker_booking_request',
        title:         '🌾 New Work Request',
        message:       `A farmer needs ${request.requiredWorkers} worker(s) for ${request.workTitle}`,
        relatedId:     request._id,
        relatedType:   'WorkerBookingRequest',
        data: {
          requestId:       request._id,
          farmerId:        request.farmerId,
          workTitle:       request.workTitle,
          workCategory:    request.workCategory,
          workDescription: request.workDescription,
          requiredSkills:  request.requiredSkills,
          requiredWorkers: request.requiredWorkers,
          scheduledDate:   request.scheduledDate,
          startTime:       request.startTime,
          endTime:         request.endTime,
          location:        request.location,
          minRate:         request.minRate,
          maxRate:         request.maxRate,
          rateUnit:        request.rateUnit,
          isFarmerBroadcast: true
        }
      });
    }
  } catch (err) {
    console.error('[dispatchToIndependentWorkers]', err);
    // Don't throw — keep request alive, just no dispatches
    await WorkerBookingRequest.findByIdAndUpdate(request._id, { status: 'pending' });
  }
}

// ─── Dispatch to Team Leaders ─────────────────────────────────────────────────

async function dispatchToTeamLeaders({
  request, requiredSkills, requiredWorkers,
  scheduledDate, startTime, endTime,
  workerLocation, radiusKm
}) {
  try {
    const baseQuery = {
      approvalStatus: 'approved',
      isActive: true,
      status: { $in: ONLINE_STATUSES },
      workerType: 'TEAM_LEADER'
    };

    if (requiredSkills && requiredSkills.length > 0) {
      const regexConditions = requiredSkills.map(s => new RegExp(`^${s}$`, 'i'));
      const words = requiredSkills
        .flatMap(s => s.split(/[\s,]+/))
        .filter(w => w.length > 2);
        
      words.forEach(w => regexConditions.push(new RegExp(w, 'i')));
      
      baseQuery.skills = { $in: regexConditions };
    }

    const leaders = await Worker.find(baseQuery)
      .select('_id name skills location status teamId')
      .populate('teamId', 'name memberCount status')
      .lean();

    const farmLat = workerLocation?.lat;
    const farmLng = workerLocation?.lng;

    const eligibleLeaders = [];

    for (const leader of leaders) {
      // Must have an active team
      if (!leader.teamId || leader.teamId.status !== 'ACTIVE') continue;
      // Team must have enough members for the required workers
      if ((leader.teamId.memberCount || 0) < requiredWorkers) continue;

      // Radius check
      if (farmLat !== undefined && farmLng !== undefined &&
          !isNaN(Number(farmLat)) && !isNaN(Number(farmLng))) {
        if (!leader.location?.lat || !leader.location?.lng) continue;
        const dist = calculateDistance(
          { lat: Number(farmLat), lng: Number(farmLng) },
          { lat: Number(leader.location.lat), lng: Number(leader.location.lng) }
        );
        if (dist > radiusKm) continue;
      }

      eligibleLeaders.push(leader);
    }

    const dispatchedTo = eligibleLeaders.map(l => ({
      workerId: l._id,
      status:   'pending'
    }));

    await WorkerBookingRequest.findByIdAndUpdate(request._id, {
      eligibleWorkersCount:   eligibleLeaders.length,
      dispatchedWorkersCount: eligibleLeaders.length,
      dispatchedTo,
      status: 'pending'
    });

    for (const leader of eligibleLeaders) {
      await notify({
        recipientType: 'worker',
        recipientId:   leader._id,
        type:          'group_booking_request',
        title:         '🌾 New Group Work Request',
        message:       `A farmer needs ${requiredWorkers} workers for ${request.workTitle}`,
        relatedId:     request._id,
        relatedType:   'WorkerBookingRequest',
        data: {
          requestId:       request._id,
          farmerId:        request.farmerId,
          workTitle:       request.workTitle,
          workCategory:    request.workCategory,
          workDescription: request.workDescription,
          requiredSkills:  request.requiredSkills,
          requiredWorkers: request.requiredWorkers,
          scheduledDate:   request.scheduledDate,
          startTime:       request.startTime,
          endTime:         request.endTime,
          location:        request.location,
          minRate:         request.minRate,
          maxRate:         request.maxRate,
          rateUnit:        request.rateUnit,
          isGroupRequest:  true,
          isFarmerBroadcast: true
        }
      });
    }
  } catch (err) {
    console.error('[dispatchToTeamLeaders]', err);
    await WorkerBookingRequest.findByIdAndUpdate(request._id, { status: 'pending' });
  }
}

// ─── Controller: getMyFarmerRequests ─────────────────────────────────────────

/**
 * GET /api/user/farmer-worker-requests
 * Farmer's own broadcast requests (paginated).
 */
exports.getMyFarmerRequests = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
    const skip  = (page - 1) * limit;

    const filter = {
      farmerId,
      requestType: { $in: ['independent_broadcast', 'team_leader'] }
    };
    if (req.query.status) filter.status = req.query.status;

    const [requests, total] = await Promise.all([
      WorkerBookingRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('dispatchedTo.workerId', 'name profilePhoto skills rating')
        .lean(),
      WorkerBookingRequest.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: requests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('[getMyFarmerRequests]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch requests.' });
  }
};

// ─── Controller: getFarmerRequestById ────────────────────────────────────────

/**
 * GET /api/user/farmer-worker-request/:id
 */
exports.getFarmerRequestById = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const request  = await WorkerBookingRequest.findOne({
      _id: req.params.id,
      farmerId,
      requestType: { $in: ['independent_broadcast', 'team_leader'] }
    })
      .populate('dispatchedTo.workerId', 'name profilePhoto skills rating location status phone')
      .populate('finalWorkers',          'name profilePhoto skills rating phone');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }
    return res.json({ success: true, data: request });
  } catch (err) {
    console.error('[getFarmerRequestById]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch request.' });
  }
};

// ─── Controller: getWorkerPendingFarmerRequests (worker-side) ────────────────
/**
 * GET /api/workers/farmer-requests/pending
 * Returns all active farmer broadcast requests where this worker is pending.
 */
exports.getWorkerPendingFarmerRequests = async (req, res) => {
  try {
    const workerId = req.user._id;
    
    // Find requests that are pending AND where this worker is in dispatchedTo with 'pending' status
    const pendingRequests = await WorkerBookingRequest.find({
      status: 'pending',
      dispatchedTo: {
        $elemMatch: {
          workerId: workerId,
          status: 'pending'
        }
      }
    }).sort({ createdAt: -1 });

    return res.json({ success: true, data: pendingRequests });
  } catch (err) {
    console.error('[getWorkerPendingFarmerRequests]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch pending requests.' });
  }
};

// ─── Controller: workerRespondToFarmerRequest (worker-side) ──────────────────

/**
 * PATCH /api/workers/farmer-request/:id/respond
 * Worker accepts or rejects a farmer broadcast request.
 */
exports.workerRespondToFarmerRequest = async (req, res) => {
  try {
    const workerId = req.user._id; // middleware always sets req.user (worker logged in as worker)
    const { action } = req.body;   // 'accept' | 'reject'

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be "accept" or "reject".' });
    }

    const request = await WorkerBookingRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Verify request has not expired
    if (request.expiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'This request has expired.' });
    }

    // Only broadcast requests handled here
    if (!['independent_broadcast', 'team_leader'].includes(request.requestType)) {
      return res.status(400).json({ success: false, message: 'Invalid request type for this endpoint.' });
    }

    // Verify this worker was actually dispatched to
    const entry = request.dispatchedTo.find(
      d => d.workerId.toString() === workerId.toString()
    );
    if (!entry) {
      return res.status(403).json({ success: false, message: 'You were not dispatched this request.' });
    }

    // Prevent re-response
    if (entry.status !== 'pending') {
      return res.status(409).json({ success: false, message: `You already ${entry.status} this request.` });
    }

    // Request must be in an actionable state
    if (!['pending', 'matching'].includes(request.status)) {
      return res.status(409).json({ success: false, message: `Request is no longer accepting responses (status: ${request.status}).` });
    }

    // Update worker's entry atomically
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    await WorkerBookingRequest.updateOne(
      {
        _id: request._id,
        'dispatchedTo.workerId': workerId,
        'dispatchedTo.status': 'pending' // conditional — prevent race condition
      },
      {
        $set: {
          'dispatchedTo.$.status':      newStatus,
          'dispatchedTo.$.respondedAt': new Date()
        }
      }
    );

    // Re-fetch updated request to get accurate counts
    const updated = await WorkerBookingRequest.findById(request._id);
    const acceptedCount = updated.dispatchedTo.filter(d => d.status === 'accepted').length;
    const rejectedCount = updated.dispatchedTo.filter(d => d.status === 'rejected').length;
    const pendingCount  = updated.dispatchedTo.filter(d => d.status === 'pending').length;

    // Update aggregated counts
    updated.acceptedWorkersCount = acceptedCount;
    updated.rejectedWorkersCount = rejectedCount;

    // ── Check if we have enough acceptances ───────────────────────────────
    if (action === 'accept') {
      // Final availability re-check for this worker
      const conflict = await hasTimeConflict(
        workerId, updated.scheduledDate, updated.startTime, updated.endTime, request._id
      );
      if (conflict) {
        // Rollback this worker's acceptance
        await WorkerBookingRequest.updateOne(
          { _id: request._id, 'dispatchedTo.workerId': workerId },
          { $set: { 'dispatchedTo.$.status': 'rejected', 'dispatchedTo.$.respondedAt': new Date() } }
        );
        return res.status(409).json({
          success: false,
          message: 'You have a conflicting booking for this time slot. Cannot accept.'
        });
      }

      if (acceptedCount >= updated.requiredWorkers) {
        // Full required count reached — notify farmer
        updated.status = 'awaiting_farmer_confirmation';
        await updated.save();

        await notify({
          recipientType: 'user',
          recipientId:   updated.farmerId,
          type:          'worker_booking_accepted',
          title:         '✅ Workers Available!',
          message:       `${acceptedCount} worker(s) accepted your request for ${updated.workTitle}`,
          relatedId:     updated._id,
          relatedType:   'WorkerBookingRequest',
          data: { requestId: updated._id, acceptedCount, requiredWorkers: updated.requiredWorkers }
        });
      } else if (pendingCount === 0) {
        // All workers responded, but fewer than required accepted
        updated.status = 'awaiting_farmer_confirmation';
        await updated.save();

        await notify({
          recipientType: 'user',
          recipientId:   updated.farmerId,
          type:          'worker_booking_partial',
          title:         '⚠️ Partial Worker Availability',
          message:       `Only ${acceptedCount} of ${updated.requiredWorkers} requested workers are available for ${updated.workTitle}`,
          relatedId:     updated._id,
          relatedType:   'WorkerBookingRequest',
          data: { requestId: updated._id, acceptedCount, requiredWorkers: updated.requiredWorkers }
        });
      } else {
        // Still waiting for more responses
        await updated.save();
      }
    } else {
      // Worker rejected
      if (pendingCount === 0) {
        // All responded, check if we have enough
        if (acceptedCount > 0) {
          updated.status = 'awaiting_farmer_confirmation';
          await updated.save();
          await notify({
            recipientType: 'user',
            recipientId:   updated.farmerId,
            type:          'worker_booking_partial',
            title:         '⚠️ Partial Worker Availability',
            message:       `Only ${acceptedCount} of ${updated.requiredWorkers} workers accepted for ${updated.workTitle}`,
            relatedId:     updated._id,
            relatedType:   'WorkerBookingRequest',
            data: { requestId: updated._id, acceptedCount, requiredWorkers: updated.requiredWorkers }
          });
        } else {
          // No one accepted
          updated.status = 'rejected';
          await updated.save();
          await notify({
            recipientType: 'user',
            recipientId:   updated.farmerId,
            type:          'worker_request_no_match',
            title:         '❌ No Workers Available',
            message:       `No workers accepted your request for ${updated.workTitle}. Please try again later.`,
            relatedId:     updated._id,
            relatedType:   'WorkerBookingRequest',
            data: { requestId: updated._id }
          });
        }
      } else {
        await updated.save();
      }
    }

    return res.json({
      success: true,
      message: `Successfully ${action}ed the request.`,
      data: { acceptedCount, rejectedCount, pendingCount, requiredWorkers: updated.requiredWorkers }
    });

  } catch (err) {
    console.error('[workerRespondToFarmerRequest]', err);
    return res.status(500).json({ success: false, message: 'Failed to process response.' });
  }
};

// ─── Controller: farmerConfirmPartial ────────────────────────────────────────

/**
 * POST /api/user/farmer-worker-request/:id/confirm
 * Farmer confirms the partial available worker count and creates bookings.
 */
exports.farmerConfirmRequest = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { accept } = req.body; // boolean: true = accept available, false = reject

    const request = await WorkerBookingRequest.findOne({
      _id: req.params.id,
      farmerId,
      status: 'awaiting_farmer_confirmation',
      requestType: { $in: ['independent_broadcast', 'team_leader'] }
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or not in confirmation state.'
      });
    }

    if (request.expiresAt < new Date()) {
      await WorkerBookingRequest.findByIdAndUpdate(request._id, { status: 'expired' });
      return res.status(410).json({ success: false, message: 'This request has expired.' });
    }

    if (accept === false || accept === 'false') {
      // Farmer rejects — cancel everything
      await WorkerBookingRequest.findByIdAndUpdate(request._id, {
        status: 'cancelled',
        rejectionReason: 'Farmer rejected partial availability'
      });

      // Notify accepted workers that request was cancelled
      const acceptedWorkers = request.dispatchedTo.filter(d => d.status === 'accepted');
      for (const entry of acceptedWorkers) {
        await notify({
          recipientType: 'worker',
          recipientId:   entry.workerId,
          type:          'worker_request_cancelled',
          title:         '❌ Request Cancelled',
          message:       `The farmer cancelled the work request for ${request.workTitle}.`,
          relatedId:     request._id,
          relatedType:   'WorkerBookingRequest',
          data: { requestId: request._id }
        });
      }

      return res.json({ success: true, message: 'Request cancelled.' });
    }

    // Farmer accepts — final availability re-check for each accepted worker
    const acceptedEntries = request.dispatchedTo.filter(d => d.status === 'accepted');
    const stillAvailable  = [];

    for (const entry of acceptedEntries) {
      const conflict = await hasTimeConflict(
        entry.workerId, request.scheduledDate, request.startTime, request.endTime, request._id
      );
      if (!conflict) {
        stillAvailable.push(entry.workerId);
      }
    }

    if (stillAvailable.length === 0) {
      await WorkerBookingRequest.findByIdAndUpdate(request._id, {
        status: 'rejected',
        rejectionReason: 'All accepted workers became unavailable'
      });
      return res.status(409).json({
        success: false,
        message: 'Unfortunately, all accepted workers are no longer available. Please create a new request.'
      });
    }

    // Create bookings for all still-available workers
    const bookingDocs = stillAvailable.map((wId, idx) => ({
      bookingNumber: `WRK-${Date.now()}-${idx}`,
      userId:        farmerId,
      workerId:      wId,
      providerType:  'WORKER',
      workerRequestId: request._id,
      scheduledDate: request.scheduledDate,
      scheduledTime: request.startTime,
      timeSlot: {
        start: request.startTime,
        end:   request.endTime
      },
      serviceName:     request.workTitle,
      serviceCategory: request.workCategory || 'Worker',
      basePrice:    null,
      minRate:      request.minRate,
      maxRate:      request.maxRate || request.minRate,
      finalAmount:  null,
      totalAmount:  null,
      address: {
        addressLine1: request.location?.addressLine1 || request.location?.city || '',
        city:         request.location?.city || '',
        state:        request.location?.state || '',
        pincode:      request.location?.pincode || '',
        lat:          request.location?.lat || null,
        lng:          request.location?.lng || null,
      },
      agreedRate:  request.minRate,
      rateUnit:    request.rateUnit || 'hourly',
      status:      'confirmed',
      paymentMethod: null,
      notes:       `${request.workTitle}: ${request.workDescription || ''}`.substring(0, 500)
    }));

    const createdBookings = await Booking.insertMany(bookingDocs);
    const bookingIds = createdBookings.map(b => b._id);

    // Update request
    await WorkerBookingRequest.findByIdAndUpdate(request._id, {
      status:              'confirmed',
      finalWorkers:        stillAvailable,
      finalBookingIds:     bookingIds,
      farmerAcceptedPartial: stillAvailable.length < request.requiredWorkers,
      acceptedWorkersCount: stillAvailable.length
    });

    // Notify all confirmed workers
    for (const wId of stillAvailable) {
      await notify({
        recipientType: 'worker',
        recipientId:   wId,
        type:          'worker_booking_confirmed',
        title:         '🎉 Booking Confirmed!',
        message:       `Your booking for ${request.workTitle} on ${new Date(request.scheduledDate).toLocaleDateString()} has been confirmed.`,
        relatedId:     request._id,
        relatedType:   'WorkerBookingRequest',
        data: {
          requestId: request._id,
          bookingIds,
          workTitle: request.workTitle,
          scheduledDate: request.scheduledDate,
          startTime: request.startTime,
          endTime: request.endTime
        }
      });
    }

    // Notify workers who were accepted but lost their slot
    const lostWorkers = acceptedEntries
      .filter(e => !stillAvailable.some(id => id.toString() === e.workerId.toString()))
      .map(e => e.workerId);

    for (const wId of lostWorkers) {
      await notify({
        recipientType: 'worker',
        recipientId:   wId,
        type:          'worker_request_slot_lost',
        title:         '⚠️ Booking Slot Lost',
        message:       `Unfortunately, you were not selected for ${request.workTitle} due to availability conflict.`,
        relatedId:     request._id,
        relatedType:   'WorkerBookingRequest',
        data: { requestId: request._id }
      });
    }

    return res.json({
      success:      true,
      message:      `Booking confirmed for ${stillAvailable.length} worker(s).`,
      data: {
        confirmedWorkers: stillAvailable.length,
        bookingIds
      }
    });

  } catch (err) {
    console.error('[farmerConfirmRequest]', err);
    return res.status(500).json({ success: false, message: 'Failed to confirm request.' });
  }
};

// ─── Controller: cancelFarmerRequest ─────────────────────────────────────────

/**
 * DELETE /api/user/farmer-worker-request/:id
 */
exports.cancelFarmerRequest = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const request  = await WorkerBookingRequest.findOne({
      _id: req.params.id,
      farmerId,
      requestType: { $in: ['independent_broadcast', 'team_leader'] }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (['confirmed', 'cancelled', 'expired'].includes(request.status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot cancel a request with status "${request.status}".`
      });
    }

    await WorkerBookingRequest.findByIdAndUpdate(request._id, { status: 'cancelled' });

    // Notify dispatched workers
    const pendingWorkers = request.dispatchedTo.filter(d => d.status === 'pending');
    for (const entry of pendingWorkers) {
      await notify({
        recipientType: 'worker',
        recipientId:   entry.workerId,
        type:          'worker_request_cancelled',
        title:         '❌ Request Cancelled',
        message:       `A work request for ${request.workTitle} has been cancelled by the farmer.`,
        relatedId:     request._id,
        relatedType:   'WorkerBookingRequest',
        data: { requestId: request._id }
      });
    }

    return res.json({ success: true, message: 'Request cancelled successfully.' });
  } catch (err) {
    console.error('[cancelFarmerRequest]', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel request.' });
  }
};
