'use strict';

const { applyWorkerPenalty } = require('../../services/workerFinancialService');

exports.applyPenalty = async (req, res) => {
  try {
    const { workerId, bookingId, penaltyEventId, penaltyType, reason } = req.body;

    if (!workerId || !penaltyEventId || !penaltyType || !reason) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const penalty = await applyWorkerPenalty(workerId, bookingId, penaltyEventId, penaltyType, reason);
    
    if (!penalty) {
      return res.status(400).json({ success: false, message: 'Penalty system is disabled or penalty already exists' });
    }

    return res.json({ success: true, message: 'Penalty applied successfully', data: penalty });
  } catch (error) {
    console.error('[applyPenalty]', error);
    return res.status(500).json({ success: false, message: 'Failed to apply penalty' });
  }
};
