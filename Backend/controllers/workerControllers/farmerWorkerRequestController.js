'use strict';

/**
 * farmerWorkerRequestController.js
 *
 * Farmer-First Worker Request System.
 * Backend auto-routes requests to Independent Workers or Team Leaders
 * based on Admin configuration â€” never trusting frontend routing hints.
 */

const WorkerBookingRequest  = require('../../models/WorkerBookingRequest');
const IndWorkerAssignment   = require('../../models/IndWorkerAssignment');
const Worker                = require('../../models/Worker');
const Team                  = require('../../models/Team');
const Booking               = require('../../models/Booking');
const Notification          = require('../../models/Notification');
const Settings              = require('../../models/Settings');
const Wallet                = require('../../models/Wallet');
const WalletTransaction     = require('../../models/WalletTransaction');
const mongoose              = require('mongoose');
const crypto                = require('crypto');
const { getIO }             = require('../../sockets');
const { calculateDistance } = require('../../services/locationService');

// ─── Constants ────────────────────────────────────────────────────────────────

// Worker statuses that are considered "online/available" for auto-dispatch
const ONLINE_STATUSES = [
  'online', 'ONLINE',
  'active', 'ACTIVE',
  'available', 'AVAILABLE',
  'on_job', 'ON_JOB',
  'idle', 'IDLE',
  'free', 'FREE',
  'registered', 'REGISTERED'
];

// Request expires after 24 hours
const REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:mm" into minutes from midnight */
const toMins = (t) => {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return h * 60 + m;
};

/** Safe socket emit helper with room check */
const emitSafe = (room, event, data) => {
  try {
    const io = getIO();
    if (io) {
      io.to(room).emit(event, data);
      console.log(`[Socket Emit] Event '${event}' sent to room '${room}'`);
    }
  } catch (e) {
    console.warn(`[Socket Emit Warning] Could not emit to ${room}:`, e.message);
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

    let notif = null;
    try {
      notif = await Notification.create(doc);
    } catch (dbErr) {
      console.warn('[Notification DB Create Warning - Non-fatal]:', dbErr?.message);
    }

    const payload = notif ? (notif.toObject ? notif.toObject() : notif) : {
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date()
    };

    const broadcastPayload = {
      ...payload,
      ...(data || {}),
      requestId: relatedId,
      _id: relatedId,
      data: data || {}
    };

    const idStr = recipientId.toString();
    const rooms = recipientType === 'user'
      ? [`user_${idStr}`, `user:${idStr}`]
      : [`worker_${idStr}`, `worker:${idStr}`];

    rooms.forEach(room => {
      // 1. Generic notification event
      emitSafe(room, 'notification', broadcastPayload);
      // 2. Specific type event (e.g. 'worker_booking_request')
      if (type) {
        emitSafe(room, type, broadcastPayload);
      }
      // 3. Explicit worker alert events (ONLY when the event is an actual booking request)
      if (recipientType === 'worker' && (type === 'worker_booking_request' || type === 'new_booking_request' || type === 'booking_request')) {
        emitSafe(room, 'worker_booking_request', broadcastPayload);
        emitSafe(room, 'new_booking_request', broadcastPayload);
        emitSafe(room, 'booking_request', broadcastPayload);
      }
      if (recipientType === 'worker' && type === 'group_booking_request') {
        emitSafe(room, 'group_booking_request', broadcastPayload);
      }
      // 4. Booking update event for refreshing lists
      emitSafe(room, 'worker_booking_update', { requestId: relatedId, type, data });
    });
  } catch (e) {
    console.error('[notify error]:', e);
  }
};

/** Check if a worker has a conflicting confirmed booking or accepted request */
const hasTimeConflict = async (workerId, scheduledDate, startTime, endTime, excludeRequestId = null) => {
  try {
    const dateStart = new Date(scheduledDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(dateStart);
    dateEnd.setHours(23, 59, 59, 999);

    // Check existing confirmed/in-progress Bookings
    const bookingConflict = await Booking.findOne({
      workerId,
      scheduledDate: { $gte: dateStart, $lte: dateEnd },
      status: { $in: ['confirmed', 'in_progress', 'assigned', 'on_the_way', 'arrived'] }
    });
    if (bookingConflict) return true;

    // Check accepted broadcast requests this worker is part of
    const reqQuery = {
      'dispatchedTo': {
        $elemMatch: { workerId, status: 'accepted' }
      },
      scheduledDate: { $gte: dateStart, $lte: dateEnd },
      status: { $in: ['awaiting_farmer_confirmation', 'confirmed', 'in_progress'] }
    };
    
    if (excludeRequestId) {
      reqQuery._id = { $ne: excludeRequestId };
    }
    
    const reqConflict = await WorkerBookingRequest.findOne(reqQuery);
    return !!reqConflict;
  } catch (e) {
    console.warn('[hasTimeConflict error]:', e.message);
    return false;
  }
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

// â”€â”€â”€ Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Controller: createFarmerRequest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // â”€â”€ Validate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const errors = validateRequestPayload(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const workerQty   = parseInt(requiredWorkers, 10);
    const normalSkills = normalizeSkills(requiredSkills);
    const scheduledDateObj = new Date(scheduledDate);

    // â”€â”€ Load Admin settings (never trust frontend routing hints) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const adminSettings = await loadAdminSettings();
    const { maxIndependentWorkerRequest, workerSearchRadiusKm } = adminSettings;

    // â”€â”€ Duplicate request guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Decide routing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // CRITICAL: Backend decides, never frontend
    const requestType = workerQty <= maxIndependentWorkerRequest
      ? 'independent_broadcast'
      : 'team_leader';

    // â”€â”€ Create the request record first â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      bookingMode: workerQty <= maxIndependentWorkerRequest ? 'INDEPENDENT_WORKERS' : 'TEAM_LEADER',
      independentWorkerLimitSnapshot: maxIndependentWorkerRequest,
      routingSnapshot: {
        maxIndependentWorkerRequest,
        workerSearchRadiusKm
      },
      status: 'matching',
      expiresAt: new Date(Date.now() + REQUEST_TTL_MS)
    });

    // â”€â”€ Independent Worker Flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      // â”€â”€ Team Leader Flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Dispatch to Independent Workers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function dispatchToIndependentWorkers({
  request, requiredSkills, scheduledDate, startTime, endTime,
  workerLocation, radiusKm
}) {
  try {
    // Base query for active workers: broad to avoid excluding workers due to case or status flags
    const baseQuery = {
      $or: [
        { approvalStatus: { $in: ['approved', 'APPROVED', 'pending', 'PENDING'] } },
        { approvalStatus: { $exists: false } }
      ],
      isActive: { $ne: false }
    };

    // Total active workers in DB
    const allWorkers = await Worker.find({ isActive: { $ne: false } }).lean();
    console.log(`[DISPATCH] Total active workers in DB: ${allWorkers.length}`);

    let candidates = [];

    // 1. Skill & Category filtering: Match exact string OR words in skills / services
    if (requiredSkills && requiredSkills.length > 0) {
      const regexConditions = requiredSkills.map(s => new RegExp(`^${s}$`, 'i'));
      
      const words = requiredSkills
        .flatMap(s => (typeof s === 'string' ? s.split(/[\s,]+/) : []))
        .filter(w => w && w.length > 2);
        
      words.forEach(w => regexConditions.push(new RegExp(w, 'i')));
      
      const skillQuery = {
        ...baseQuery,
        $or: [
          { skills: { $in: regexConditions } },
          { primaryService: { $in: regexConditions } },
          { serviceCategory: { $in: regexConditions } },
          { serviceCategories: { $in: regexConditions } }
        ]
      };

      candidates = await Worker.find(skillQuery)
        .select('_id name skills primaryService serviceCategory serviceCategories location address status fcmTokens approvalStatus isActive')
        .lean();
    }

    // 2. Fallback: If no workers match specific skills, broaden to all active workers
    if (!candidates || candidates.length === 0) {
      console.log('[DISPATCH] Broadening to all active workers in DB.');
      candidates = await Worker.find(baseQuery)
        .select('_id name skills primaryService serviceCategory serviceCategories location address status fcmTokens approvalStatus isActive')
        .lean();
    }

    // 3. Fallback: If still empty, grab any worker in the DB
    if (!candidates || candidates.length === 0) {
      candidates = allWorkers;
    }

    console.log(`[DISPATCH] Candidate workers matching criteria: ${candidates.length}`);

    // Filter by radius (Haversine, server-side)
    const farmLat = workerLocation?.lat;
    const farmLng = workerLocation?.lng;

    let eligible = candidates;

    if (farmLat !== undefined && farmLng !== undefined &&
        !isNaN(Number(farmLat)) && !isNaN(Number(farmLng))) {
      const radiusFiltered = candidates.filter(w => {
        // If worker has no coords, fallback to city matching if available
        if (!w.location?.lat || !w.location?.lng || isNaN(Number(w.location.lat)) || isNaN(Number(w.location.lng))) {
          if (w.address && request.location?.city) {
            const reqCity = request.location.city.trim().toLowerCase();
            const wCity = (w.address.city || '').trim().toLowerCase();
            const wFull = (w.address.fullAddress || '').toLowerCase();
            
            const match = wCity === reqCity || wCity.includes(reqCity) || wFull.includes(reqCity);
            return match;
          }
          return true; // No coordinates/city info -> allow
        }
        const dist = calculateDistance(
          { lat: Number(farmLat), lng: Number(farmLng) },
          { lat: Number(w.location.lat), lng: Number(w.location.lng) }
        );
        const withinRadius = dist <= radiusKm;
        return withinRadius;
      });

      if (radiusFiltered.length > 0) {
        eligible = radiusFiltered;
      } else {
        console.log(`[DISPATCH] 0 workers strictly within ${radiusKm}km radius. Falling back to all candidate workers.`);
        eligible = candidates;
      }
    }

    // Conflict check — exclude workers with conflicting bookings
    const available = [];
    for (const w of eligible) {
      let conflict = false;
      try {
        conflict = await hasTimeConflict(w._id, scheduledDate, startTime, endTime, request._id);
      } catch (confErr) {
        console.warn('[DISPATCH] Conflict check warning for worker:', w._id, confErr.message);
      }
      if (!conflict) available.push(w);
    }

    const finalWorkers = available.length > 0 ? available : eligible;

    const dispatchedTo = finalWorkers.map(w => ({
      workerId: w._id,
      status:   'pending'
    }));

    // Update request with dispatch info
    await WorkerBookingRequest.findByIdAndUpdate(request._id, {
      eligibleWorkersCount:   finalWorkers.length,
      dispatchedWorkersCount: finalWorkers.length,
      dispatchedTo,
      status: 'pending'
    });

    // Populate farmer details if available
    let farmerName = 'Farmer';
    try {
      const farmerDoc = await User.findById(request.farmerId).select('name phone').lean();
      if (farmerDoc?.name) farmerName = farmerDoc.name;
    } catch (e) {}

    // Notify each worker via socket + notification
    for (const w of finalWorkers) {
      console.log(`[DISPATCH] Notifying worker ${w.name || w._id} (${w._id}) for request ${request._id}`);
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
          _id:             request._id,
          farmerId:        request.farmerId,
          farmerName:      farmerName,
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
          farmerOfferedRate: request.farmerOfferedRate || request.minRate,
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

// â”€â”€â”€ Dispatch to Team Leaders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function dispatchToTeamLeaders({
  request, requiredSkills, requiredWorkers,
  scheduledDate, startTime, endTime,
  workerLocation, radiusKm
}) {
  try {
    const baseQuery = {
      $or: [
        { approvalStatus: { $in: ['approved', 'APPROVED', 'pending', 'PENDING'] } },
        { approvalStatus: { $exists: false } }
      ],
      isActive: { $ne: false },
      workerType: { $in: ['TEAM_LEADER', 'team_leader', 'LEADER', 'leader'] }
    };

    if (requiredSkills && requiredSkills.length > 0) {
      const regexConditions = requiredSkills.map(s => new RegExp(`^${s}$`, 'i'));
      const words = requiredSkills
        .flatMap(s => (typeof s === 'string' ? s.split(/[\s,]+/) : []))
        .filter(w => w && w.length > 2);
        
      words.forEach(w => regexConditions.push(new RegExp(w, 'i')));
      baseQuery.skills = { $in: regexConditions };
    }

    let leaders = await Worker.find(baseQuery)
      .select('_id name skills location status teamId')
      .populate('teamId', 'name memberCount status')
      .lean();

    if (!leaders || leaders.length === 0) {
      leaders = await Worker.find({
        isActive: { $ne: false },
        workerType: { $in: ['TEAM_LEADER', 'team_leader', 'LEADER', 'leader'] }
      })
      .select('_id name skills location status teamId')
      .populate('teamId', 'name memberCount status')
      .lean();
    }

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

// â”€â”€â”€ Controller: getMyFarmerRequests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      .populate('workerOffers.workerId', 'name profilePhoto rating location status phone')
      .populate('finalWorkers',          'name profilePhoto skills rating phone')
      .populate({
        path: 'assignmentIds',
        populate: {
          path: 'workerId',
          select: 'name phone profilePicture skills rating averageRating primaryService experience'
        }
      });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const { buildFarmerPaymentSummary } = require('../../services/workerFinancialService');
    let assignments = request.assignmentIds || [];
    if (!assignments.length) {
      assignments = await IndWorkerAssignment.find({
        parentRequestId: request._id,
        assignmentStatus: { $ne: 'CANCELLED' }
      }).populate('workerId', 'name phone profilePicture skills rating averageRating primaryService experience');
    }

    const requestData = request.toObject ? request.toObject() : { ...request };
    requestData.paymentSummary = buildFarmerPaymentSummary(request, assignments);

    return res.json({ success: true, data: requestData });
  } catch (err) {
    console.error('[getFarmerRequestById]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch request.' });
  }
};

// â”€â”€â”€ Controller: getWorkerPendingFarmerRequests (worker-side) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/**
 * GET /api/workers/farmer-requests/pending
 * Returns all active farmer broadcast requests where this worker is pending.
 */
exports.getWorkerPendingFarmerRequests = async (req, res) => {
  try {
    const workerId = req.user._id;
    
    // Find requests that are pending AND where this worker is in dispatchedTo with 'pending' status
    // Exclude expired requests and requests where worker has already submitted an offer
    const pendingRequests = await WorkerBookingRequest.find({
      status: { $in: ['pending', 'matching'] },
      expiresAt: { $gt: new Date() },
      dispatchedTo: {
        $elemMatch: {
          workerId: workerId,
          status: 'pending'
        }
      },
      'workerOffers.workerId': { $ne: workerId }
    }).sort({ createdAt: -1 });

    return res.json({ success: true, data: pendingRequests });
  } catch (err) {
    console.error('[getWorkerPendingFarmerRequests]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch pending requests.' });
  }
};

// â”€â”€â”€ Controller: workerRespondToFarmerRequest (worker-side) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    // Verify this worker was dispatched to, or auto-register if open broadcast
    let entry = request.dispatchedTo.find(
      d => d.workerId.toString() === workerId.toString()
    );
    if (!entry) {
      entry = { workerId, status: 'pending', respondedAt: null };
      request.dispatchedTo.push(entry);
      await request.save();
    }

    // Idempotent check: if worker already accepted, return success
    if (entry.status === 'accepted' && action === 'accept') {
      return res.json({ success: true, message: 'You have already accepted this request.', data: request });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    
    // Add or update workerOffers if accepted
    let updateObj = {
        $set: {
          'dispatchedTo.$.status':      newStatus,
          'dispatchedTo.$.respondedAt': new Date()
        }
    };
    
    if (action === 'accept') {
        let offeredRate = Number(req.body.offeredRate);
        const maxBudget = Number(request.maxRate || request.farmerOfferedRate || request.minRate || 0);

        if (!offeredRate || isNaN(offeredRate)) {
            offeredRate = maxBudget;
        }

        // STRICT VALIDATION: Worker cannot exceed Farmer's maximum budget
        if (maxBudget > 0 && offeredRate > maxBudget) {
            return res.status(400).json({
                success: false,
                message: `Your rate offer (₹${offeredRate}) cannot exceed the Farmer's maximum budget of ₹${maxBudget}.`
            });
        }

        updateObj['$push'] = {
            workerOffers: {
                workerId: workerId,
                offeredRate: offeredRate,
                status: 'pending'
            }
        };
    }

    await WorkerBookingRequest.updateOne(
      {
        _id: request._id,
        'dispatchedTo.workerId': workerId
      },
      updateObj
    );

    const updated = await WorkerBookingRequest.findById(request._id);
    const acceptedCount = updated.dispatchedTo.filter(d => d.status === 'accepted').length;
    const rejectedCount = updated.dispatchedTo.filter(d => d.status === 'rejected').length;
    const pendingCount  = updated.dispatchedTo.filter(d => d.status === 'pending').length;

    // Update aggregated counts
    updated.acceptedWorkersCount = acceptedCount;
    updated.rejectedWorkersCount = rejectedCount;

    // ── Check if we have enough acceptances ────────────────────────────────
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

// ─── Controller: farmerConfirmPartial ─────────────────────────────────────

/**
 * POST /api/user/farmer-worker-request/:id/confirm
 * Farmer confirms the partial available worker count and creates bookings.
 */
exports.legacyFarmerConfirmRequest = async (req, res) => {
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

    // Farmer accepts partial / available workers
    const acceptedEntries = request.dispatchedTo.filter(d => d.status === 'accepted');
    const stillAvailable = [];

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

// ─── Controller: cancelFarmerRequest ──────────────────────────────────────

/**
 * DELETE /api/user/farmer-worker-request/:id
 */
exports.cancelFarmerRequest = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const request = await WorkerBookingRequest.findOne({
      _id: req.params.id,
      farmerId,
      requestType: { $in: ['independent_broadcast', 'team_leader'] }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (['completed', 'cancelled', 'expired'].includes(request.status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot cancel a request with status "${request.status}".`
      });
    }

    // ── If Request was Confirmed & Paid: Process Automated Wallet Refund ──
    if (request.status === 'confirmed' || request.paymentStatus === 'success') {
      const assignments = await IndWorkerAssignment.find({
        parentRequestId: request._id,
        assignmentStatus: { $ne: 'CANCELLED' }
      });

      const anyWorkStarted = assignments.some(a => a.journeyStatus === 'IN_PROGRESS' || a.journeyStatus === 'COMPLETED' || a.visitOtpStatus === 'VERIFIED');
      if (anyWorkStarted) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel booking after work has already started. Please contact support.'
        });
      }

      // 1. Cancel all worker assignments and legacy bookings
      await IndWorkerAssignment.updateMany(
        { parentRequestId: request._id },
        { assignmentStatus: 'CANCELLED', workStatus: 'CANCELLED' }
      );
      if (request.finalBookingIds?.length > 0) {
        await Booking.updateMany(
          { _id: { $in: request.finalBookingIds } },
          { status: 'cancelled', cancellationReason: 'Farmer cancelled booking' }
        );
      }

      // 2. Free assigned workers
      if (request.finalWorkers?.length > 0) {
        await Worker.updateMany(
          { _id: { $in: request.finalWorkers } },
          { status: 'AVAILABLE' }
        );
      }

      // 3. Process Wallet Refund
      const snap = request.financialSnapshot || {};
      const refundAmount = Number(snap.totalPayable || snap.maximumWorkerAmount || 0);

      if (refundAmount > 0 && !request.refundCredited) {
        let farmerWallet = await Wallet.findOne({ userId: farmerId, userModel: 'User' });
        if (!farmerWallet) {
          farmerWallet = await Wallet.create({ userId: farmerId, userModel: 'User', balance: 0 });
        }

        const prevBalance = farmerWallet.balance || 0;
        farmerWallet.balance = prevBalance + refundAmount;
        await farmerWallet.save();

        // Sync User model
        await User.findByIdAndUpdate(farmerId, { 'wallet.balance': farmerWallet.balance });

        const bookingRef = request.bookingNumber || `WRK-${request._id.toString().slice(-6).toUpperCase()}`;
        const refundKey = `cancel_refund_${request._id.toString()}`;

        // Log WalletTransaction
        await WalletTransaction.create({
          walletId: farmerWallet._id,
          type: 'credit',
          amount: refundAmount,
          reason: 'refund',
          referenceId: request._id.toString(),
          gatewayTransactionId: request.razorpayPaymentId || null,
          idempotencyKey: refundKey,
          status: 'completed'
        });

        // Log unified Transaction
        await Transaction.create({
          userId: farmerId,
          type: 'refund',
          amount: refundAmount,
          status: 'completed',
          paymentMethod: 'wallet',
          description: `Full Refund for Cancelled ${request.workTitle || 'Worker'} Booking (#${bookingRef})`,
          balanceBefore: prevBalance,
          balanceAfter: farmerWallet.balance,
          referenceId: request._id.toString()
        });

        request.refundAmount = refundAmount;
        request.refundCredited = true;
        request.refundCreditedAt = new Date();

        // Emit real-time wallet balance update
        emitSafe(`user_${farmerId}`, 'wallet_balance_updated', {
          balance: farmerWallet.balance,
          refundAmount,
          type: 'credit',
          message: `₹${refundAmount} refunded for cancelled booking`
        });
        emitSafe(`user:${farmerId}`, 'wallet_balance_updated', {
          balance: farmerWallet.balance,
          refundAmount,
          type: 'credit',
          message: `₹${refundAmount} refunded for cancelled booking`
        });
      }

      request.status = 'cancelled';
      await request.save();

      // Notify Farmer of cancellation & refund
      await notify({
        recipientType: 'user',
        recipientId: farmerId,
        type: 'booking_cancelled',
        title: 'Booking Cancelled & Refunded',
        message: refundAmount > 0
          ? `Your booking for ${request.workTitle} has been cancelled. ₹${refundAmount} has been credited back to your AgroYilt Wallet.`
          : `Your booking for ${request.workTitle} has been cancelled.`,
        relatedId: request._id,
        relatedType: 'WorkerBookingRequest',
        data: { requestId: request._id, refundAmount }
      });

      // Notify Workers
      if (request.finalWorkers?.length > 0) {
        for (const wId of request.finalWorkers) {
          await notify({
            recipientType: 'worker',
            recipientId: wId,
            type: 'worker_booking_cancelled',
            title: 'Booking Cancelled',
            message: `Booking for ${request.workTitle} has been cancelled by the farmer.`,
            relatedId: request._id,
            relatedType: 'WorkerBookingRequest',
            data: { requestId: request._id }
          });
        }
      }

      return res.json({
        success: true,
        message: refundAmount > 0
          ? `Booking cancelled. ₹${refundAmount} has been refunded to your wallet.`
          : 'Booking cancelled successfully.'
      });
    }

    // ── If Request was Pending / Matching (Unpaid) ──
    await WorkerBookingRequest.findByIdAndUpdate(request._id, { status: 'cancelled' });

    // Notify dispatched workers
    const pendingWorkers = request.dispatchedTo ? request.dispatchedTo.filter(d => d.status === 'pending') : [];
    for (const entry of pendingWorkers) {
      await notify({
        recipientType: 'worker',
        recipientId: entry.workerId,
        type: 'worker_request_cancelled',
        title: '❌ Request Cancelled',
        message: `A work request for ${request.workTitle} has been cancelled by the farmer.`,
        relatedId: request._id,
        relatedType: 'WorkerBookingRequest',
        data: { requestId: request._id }
      });
    }

    return res.json({ success: true, message: 'Request cancelled successfully.' });
  } catch (err) {
    console.error('[cancelFarmerRequest]', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel request.' });
  }
};


// ============================================================================
// NEW INDEPENDENT WORKER PAYMENT FLOW
// ============================================================================
const { createOrder, verifyPayment } = require('../../services/razorpayService');
const { getWorkerFinancialSettings } = require('../../services/workerFinancialService');

exports.farmerSelectWorkers = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { selectedWorkerIds } = req.body; 

    if (!selectedWorkerIds || !Array.isArray(selectedWorkerIds) || selectedWorkerIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one worker.' });
    }

    const request = await WorkerBookingRequest.findOne({
      _id: req.params.id,
      farmerId,
      status: { $in: ['matching', 'awaiting_farmer_confirmation'] },
      requestType: { $in: ['independent_broadcast', 'team_leader'] }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found or not in a selectable state.' });
    }
    if (request.expiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'This request has expired.' });
    }

    // Validate selected workers
    const validWorkerIds = request.workerOffers
      .filter(offer => offer.status === 'pending' || offer.status === 'selected')
      .map(offer => offer.workerId.toString());

    for (const wId of selectedWorkerIds) {
      if (!validWorkerIds.includes(wId.toString())) {
        return res.status(400).json({ success: false, message: 'One or more selected workers are invalid or did not submit an offer.' });
      }
    }

    const settings = await getWorkerFinancialSettings();
    const maxWorkerAmount = request.maxRate * selectedWorkerIds.length;
    const platformCharge = Math.round(((maxWorkerAmount * settings.workerPlatformChargePercentage) / 100) * 100) / 100;
    const totalPayable = Math.round((maxWorkerAmount + platformCharge) * 100) / 100;

    request.selectedWorkerIds = selectedWorkerIds;
    request.paymentStatus = 'pending';
    request.financialSnapshot = {
      maximumBudget: request.maxRate,
      selectedWorkerCount: selectedWorkerIds.length,
      maximumWorkerAmount: maxWorkerAmount,
      platformChargeRate: settings.workerPlatformChargePercentage,
      platformChargeAmount: platformCharge,
      totalPayable: totalPayable,
      commissionRate: settings.workerCommissionPercentage,
      currency: 'INR',
      createdAt: new Date()
    };
    
    request.workerOffers.forEach(offer => {
       if (selectedWorkerIds.includes(offer.workerId.toString())) {
         offer.status = 'selected';
       }
    });

    await request.save();

    return res.json({
      success: true,
      message: 'Workers selected. Please proceed to payment.',
      data: {
        financials: request.financialSnapshot,
        paymentStatus: request.paymentStatus
      }
    });
  } catch (err) {
    console.error('[farmerSelectWorkers]', err); require('fs').writeFileSync('C:/Users/hp/Desktop/Appzeto/AgroYilt/backend/error_log.txt', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to select workers.' });
  }
};

exports.createWorkerBookingPayment = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const request = await WorkerBookingRequest.findOne({
      _id: req.params.id,
      farmerId,
      paymentStatus: 'pending'
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found or workers not selected yet.' });
    }

    const { totalPayable, currency } = request.financialSnapshot;

    const orderRes = await createOrder(totalPayable, currency, `req_${request._id}`);
    if (!orderRes.success) {
      return res.status(500).json({ success: false, message: 'Failed to create payment order.' });
    }

    request.razorpayOrderId = orderRes.orderId;
    await request.save();

    return res.json({
      success: true,
      data: {
        orderId: orderRes.orderId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        financials: request.financialSnapshot
      }
    });
  } catch (err) {
    console.error('[createWorkerBookingPayment]', err);
    return res.status(500).json({ success: false, message: 'Failed to initialize payment.' });
  }
};

exports.verifyWorkerBookingPayment = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const request = await WorkerBookingRequest.findOne({
      _id: req.params.id,
      farmerId,
      razorpayOrderId: razorpay_order_id,
      paymentStatus: 'pending'
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Invalid payment verification request.' });
    }

    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      request.paymentStatus = 'failed';
      await request.save();
      return res.status(400).json({ success: false, message: 'Payment verification failed.' });
    }

    request.paymentStatus = 'success';
    request.razorpayPaymentId = razorpay_payment_id;
    request.status = 'confirmed';
    request.farmerAcceptedPartial = request.selectedWorkerIds.length < request.requiredWorkers;
    request.acceptedWorkersCount = request.selectedWorkerIds.length;
    request.finalWorkers = request.selectedWorkerIds;
    
    request.workerOffers.forEach(offer => {
       if (!request.selectedWorkerIds.some(wId => wId.toString() === offer.workerId.toString())) {
         offer.status = 'rejected';
       } else {
         offer.status = 'selected';
       }
    });

    const assignmentDocs = [];
    const bookingDocs = [];
    const otpExpiryDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    for (const [idx, wId] of request.selectedWorkerIds.entries()) {
      const offer = request.workerOffers.find(o => o.workerId.toString() === wId.toString());
      const offeredRate = offer ? offer.offeredRate : (request.minRate || 0);
      
      const commissionRate = request.financialSnapshot?.commissionRate || 10;
      const commissionAmount = Math.round(((offeredRate * commissionRate) / 100) * 100) / 100;
      const netEarning = Math.round((offeredRate - commissionAmount) * 100) / 100;

      // 4-digit visit OTP for this worker assignment
      const rawVisitOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const visitOtpHash = crypto.createHash('sha256').update(rawVisitOtp).digest('hex');

      // Create dedicated IndWorkerAssignment document
      assignmentDocs.push({
        parentRequestId: request._id,
        farmerId,
        workerId: wId,
        teamLeaderId: request.teamLeaderId || null,
        workerType: request.bookingMode === 'TEAM_LEADER' ? 'TEAM_MEMBER' : 'INDEPENDENT',
        agreedRate: offeredRate,
        rateUnit: request.rateUnit || 'daily',
        creationIdempotencyKey: `assign_${request._id}_${wId}_${Date.now()}`,
        assignmentStatus: 'CONFIRMED',
        journeyStatus: 'NOT_STARTED',
        visitOtpStatus: 'PENDING',
        workStatus: 'NOT_STARTED',
        completionStatus: 'PENDING',
        settlementStatus: 'PENDING',
        locationStatus: 'UNAVAILABLE',
        visitOtpCode: rawVisitOtp,
        visitOtpHash,
        visitOtpExpiresAt: otpExpiryDate,
        grossAmount: offeredRate,
        commissionRate,
        commissionAmount,
        netEarning
      });

      // Also create legacy Booking doc for backward compatibility
      bookingDocs.push({
        bookingNumber: `WRK-${Date.now()}-${idx}`,
        userId: farmerId,
        workerId: wId,
        providerType: 'WORKER',
        workerRequestId: request._id,
        scheduledDate: request.scheduledDate,
        scheduledTime: request.startTime,
        timeSlot: { start: request.startTime, end: request.endTime },
        serviceName: request.workTitle,
        serviceCategory: request.workCategory || 'Worker',
        basePrice: null,
        minRate: request.minRate,
        maxRate: request.maxRate,
        agreedRate: offeredRate,
        rateUnit: request.rateUnit || 'daily',
        workerOfferedRate: offeredRate,
        workerGrossEarning: offeredRate,
        commissionRate: commissionRate,
        commissionAmount: commissionAmount,
        workerNetEarning: netEarning,
        finalAmount: offeredRate, 
        totalAmount: offeredRate,
        farmerPaidAmount: request.financialSnapshot?.totalPayable || offeredRate,
        platformFeeAmount: request.financialSnapshot?.platformChargeAmount || 0,
        platformFeeRate: request.financialSnapshot?.platformChargeRate || 0,
        visitOtp: rawVisitOtp,
        address: {
          addressLine1: request.location?.addressLine1 || request.location?.city || '',
          city: request.location?.city || '',
          state: request.location?.state || '',
          pincode: request.location?.pincode || '',
          lat: request.location?.lat || null,
          lng: request.location?.lng || null,
        },
        status: 'confirmed',
        paymentStatus: 'success',
        paymentMethod: 'online',
        paymentId: razorpay_payment_id,
        notes: `${request.workTitle}: ${request.workDescription || ''}`.substring(0, 500)
      });
    }

    // Insert Assignments and Bookings
    const createdAssignments = await IndWorkerAssignment.insertMany(assignmentDocs);
    const createdBookings = await Booking.insertMany(bookingDocs);

    // Link legacy booking IDs into assignments
    for (let i = 0; i < createdAssignments.length; i++) {
      if (createdBookings[i]) {
        createdAssignments[i].legacyBookingId = createdBookings[i]._id;
        await createdAssignments[i].save();
      }
    }

    request.assignmentIds = createdAssignments.map(a => a._id);
    request.finalBookingIds = createdBookings.map(b => b._id);
    request.refundAmount = null;
    request.refundCredited = false;
    request.refundCreditedAt = null;
    await request.save();

    // Notify each worker
    for (const a of createdAssignments) {
      await notify({
        recipientType: 'worker',
        recipientId: a.workerId,
        type: 'worker_booking_confirmed',
        title: 'Booking Confirmed & Paid!',
        message: `Your booking for ${request.workTitle} has been confirmed. You will earn ?${a.netEarning}.`,
        relatedId: request._id,
        relatedType: 'WorkerBookingRequest',
        data: { assignmentId: a._id, requestId: request._id }
      });
    }

    // Emit socket event to parent request room
    emitSafe(`booking_req:${request._id}`, 'booking_confirmed', {
      requestId: request._id,
      assignmentIds: request.assignmentIds,
      totalWorkers: request.assignmentIds.length,
      serverTimestamp: new Date()
    });

    return res.json({
      success: true,
      message: 'Payment verified and worker assignments created.',
      data: {
        requestId: request._id,
        assignmentIds: request.assignmentIds,
        bookingIds: request.finalBookingIds
      }
    });

  } catch (err) {
    console.error('[verifyWorkerBookingPayment]', err);
    return res.status(500).json({ success: false, message: 'Payment verification failed: ' + err.message });
  }
};

/**
 * Unified Parent Tracking Data
 * GET /api/user/farmer-worker-request/:id/tracking
 */
exports.getWorkerBookingTrackingData = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { id } = req.params;

    const request = await WorkerBookingRequest.findOne({
      _id: id,
      farmerId
    })
      .populate({
        path: 'assignmentIds',
        populate: {
          path: 'workerId',
          select: 'name phone profilePicture skills rating averageRating primaryService experience'
        }
      })
      .populate({
        path: 'selectedWorkerIds',
        select: 'name phone profilePicture skills rating averageRating primaryService experience'
      });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Worker booking request not found.' });
    }

    let assignments = await IndWorkerAssignment.find({
      parentRequestId: request._id,
      assignmentStatus: { $ne: 'CANCELLED' }
    }).populate('workerId', 'name phone profilePicture skills rating averageRating primaryService experience');

    // Ensure each active assignment has a completionOtpCode ready for farmer verification
    for (let assign of assignments) {
      if (!assign.completionOtpCode && assign.completionStatus !== 'OTP_VERIFIED') {
        const rawCompletionOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const completionOtpHash = crypto.createHash('sha256').update(rawCompletionOtp).digest('hex');
        assign.completionOtpCode = rawCompletionOtp;
        assign.completionOtpHash = completionOtpHash;
        assign.completionOtpExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await assign.save();
      }
    }

    const { buildFarmerPaymentSummary } = require('../../services/workerFinancialService');
    const requestData = request.toObject ? request.toObject() : { ...request };
    requestData.paymentSummary = buildFarmerPaymentSummary(request, assignments);

    return res.json({
      success: true,
      data: {
        request: requestData,
        assignments
      }
    });
  } catch (err) {
    console.error('[getWorkerBookingTrackingData]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch tracking data: ' + err.message });
  }
};

/**
 * Farmer generates or retrieves Completion OTP for a specific assignment
 * POST /api/user/farmer-worker-request/:id/assignment/:assignmentId/completion-otp
 */
exports.generateFarmerCompletionOtp = async (req, res) => {
  try {
    const farmerId = req.user._id;
    const { id, assignmentId } = req.params;

    const assignment = await IndWorkerAssignment.findOne({
      _id: assignmentId,
      parentRequestId: id,
      farmerId
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    // Generate 4-digit completion OTP
    const rawCompletionOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const completionOtpHash = crypto.createHash('sha256').update(rawCompletionOtp).digest('hex');

    assignment.completionOtpCode = rawCompletionOtp;
    assignment.completionOtpHash = completionOtpHash;
    assignment.completionOtpExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    assignment.completionOtpAttempts = 0;
    await assignment.save();

    return res.json({
      success: true,
      message: 'Completion OTP generated successfully.',
      data: {
        assignmentId: assignment._id,
        completionOtp: rawCompletionOtp,
        expiresAt: assignment.completionOtpExpiresAt
      }
    });
  } catch (err) {
    console.error('[generateFarmerCompletionOtp]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate completion OTP.' });
  }
};





