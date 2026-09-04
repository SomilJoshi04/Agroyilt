const Requirement = require('../models/Requirement');
const Bid = require('../models/Bid');
const { createNotification } = require('../controllers/notificationControllers/notificationController');

const checkExpiredRequirements = async () => {
  try {
    const now = new Date();
    // Find open requirements that have passed expiresAt
    const expiredReqs = await Requirement.find({
      status: 'open',
      expiresAt: { $lt: now }
    });

    if (expiredReqs.length > 0) {
      console.log(`[Scheduler] Found ${expiredReqs.length} expired requirements`);
    }

    for (const req of expiredReqs) {
      // Mark as expired
      req.status = 'expired';
      await req.save();

      // Find pending bids to notify vendors before rejecting
      const pendingBids = await Bid.find({ requirementId: req._id, status: 'pending' }).select('vendorId');

      // Mark pending bids as rejected
      await Bid.updateMany(
        { requirementId: req._id, status: 'pending' },
        { $set: { status: 'rejected' } }
      );

      // Notify farmer
      createNotification({
        userId: req.userId,
        type: 'requirement_expired',
        title: 'Requirement Expired',
        message: 'Your requirement expired because no bid was accepted. You can post it again or use instant booking.',
        relatedId: req._id,
        relatedType: 'requirement'
      }).catch(console.error);

      // Notify vendors whose bids were pending
      for (const bid of pendingBids) {
        createNotification({
          userId: bid.vendorId,
          type: 'bid_expired',
          title: 'Bid Expired',
          message: 'A requirement you bid on has expired and was closed by the system.',
          relatedId: req._id,
          relatedType: 'requirement'
        }).catch(console.error);
      }
    }
  } catch (error) {
    console.error('Error in checkExpiredRequirements:', error);
  }
};

const startRequirementScheduler = () => {
  // Run every 15 minutes (15 * 60 * 1000 ms)
  setInterval(() => {
    checkExpiredRequirements();
  }, 15 * 60 * 1000);
  
  // Also run on startup after a delay
  setTimeout(() => {
    checkExpiredRequirements();
  }, 15000);
  
  console.log('✅ Requirement expiry scheduler initialized');
};

module.exports = { startRequirementScheduler };
