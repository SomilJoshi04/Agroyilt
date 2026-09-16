const Worker = require('../../models/Worker');
const User = require('../../models/User');
const Review = require('../../models/Review');
const Booking = require('../../models/Booking');
const { validationResult } = require('express-validator');
const { WORKER_STATUS, BOOKING_STATUS, VENDOR_STATUS } = require('../../utils/constants');
const { createNotification } = require('../notificationControllers/notificationController');

/**
 * Get all workers with filters and pagination
 */
const getAllWorkers = async (req, res) => {
  try {
    const {
      search,
      approvalStatus,
      isActive,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = {};

    if (approvalStatus) {
      query.approvalStatus = approvalStatus;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Search by name, email, phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { serviceCategory: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get workers
    const workers = await Worker.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const Review = require('../../models/Review');

    const dynamicWorkers = await Promise.all(workers.map(async (w) => {
      const workerObj = w.toObject();
      
      // Calculate dynamic jobs
      const completedJobs = await Booking.countDocuments({
        workerId: w._id,
        status: BOOKING_STATUS.COMPLETED
      });
      workerObj.totalJobs = completedJobs || w.totalJobs || 0;

      // Calculate dynamic rating
      const reviews = await Review.aggregate([
        { $match: { workerId: w._id } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]);
      
      if (reviews.length > 0 && reviews[0].avgRating) {
        workerObj.rating = Number(reviews[0].avgRating.toFixed(1));
      } else {
        workerObj.rating = w.rating || 0;
      }
      
      return workerObj;
    }));

    // Get total count
    const total = await Worker.countDocuments(query);

    res.status(200).json({
      success: true,
      data: dynamicWorkers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workers. Please try again.'
    });
  }
};

/**
 * Get worker details
 */
const getWorkerDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await Worker.findById(id).select('-password');

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Get worker booking stats
    const jobStats = await Booking.aggregate([
      {
        $match: { workerId: worker._id }
      },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          completedJobs: {
            $sum: {
              $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, 1, 0]
            }
          },
          // Assuming workers might get paid or we just track job value
          totalJobValue: {
            $sum: '$finalAmount'
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        worker,
        stats: jobStats[0] || {
          totalJobs: 0,
          completedJobs: 0,
          totalJobValue: 0
        }
      }
    });
  } catch (error) {
    console.error('Get worker details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker details. Please try again.'
    });
  }
};

/**
 * Approve worker registration
 */
const approveWorker = async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await Worker.findById(id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    worker.approvalStatus = 'approved';
    worker.isActive = true;
    worker.approvalDate = new Date();
    await worker.save();

    // Send notification to worker
    try {
      await createNotification({
        workerId: worker._id,
        type: 'worker_approved',
        title: '🎉 Worker Account Approved!',
        message: 'Congratulations! Your worker account has been approved by the admin. You can now login.',
        relatedId: worker._id,
        relatedType: 'worker',
        data: { workerId: worker._id, status: 'approved' },
        pushData: { type: 'worker_alert', link: '/worker/login' }
      });
    } catch (notifErr) {
      console.error('Failed to send worker approval notification:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: 'Worker approved successfully',
      data: worker
    });
  } catch (error) {
    console.error('Approve worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve worker. Please try again.'
    });
  }
};

/**
 * Reject worker registration
 */
const rejectWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const worker = await Worker.findById(id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    worker.approvalStatus = 'rejected';
    worker.isActive = false;
    worker.rejectionReason = reason || 'Application does not meet requirements';
    await worker.save();

    // Send notification to worker
    try {
      await createNotification({
        workerId: worker._id,
        type: 'worker_rejected',
        title: 'Worker Application Status',
        message: `Your worker application was rejected by the admin.${reason ? ` Reason: ${reason}` : ''}`,
        relatedId: worker._id,
        relatedType: 'worker',
        data: { workerId: worker._id, status: 'rejected', reason: worker.rejectionReason }
      });
    } catch (notifErr) {
      console.error('Failed to send worker rejection notification:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: 'Worker rejected successfully',
      data: worker
    });
  } catch (error) {
    console.error('Reject worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject worker. Please try again.'
    });
  }
};

/**
 * Suspend worker
 */
const suspendWorker = async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await Worker.findById(id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    worker.approvalStatus = 'suspended';
    worker.isActive = false;
    await worker.save();

    res.status(200).json({
      success: true,
      message: 'Worker suspended successfully',
      data: worker
    });
  } catch (error) {
    console.error('Suspend worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend worker. Please try again.'
    });
  }
};

/**
 * Get worker jobs
 */
const getWorkerJobs = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { workerId: id };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const jobs = await Booking.find(query)
      .populate('userId', 'name phone')
      .populate('serviceId', 'title iconUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get worker jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker jobs.'
    });
  }
};

/**
 * Get worker earnings
 */
const getWorkerEarnings = async (req, res) => {
  // Placeholder for now, can be expanded if we track granular worker earnings
  res.status(200).json({
    success: true,
    data: {
      totalEarnings: 0
    }
  });
};

/**
 * Pay worker manually
 */
const payWorker = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reference, notes } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid amount'
      });
    }

    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Update wallet balance
    // Assuming balance is amount owed to Admin? 
    // Usually admin pays worker, so worker balance increases or decreases?
    // In this system, vendor owes admin (negative balance).
    // For workers, positive balance probably means earnings they can withdraw.
    // If admin pays them, it should reduce their pending balance or just reflect as a transaction.
    // If the user says "pay worker", it usually means adding money to their wallet or clearing dues.

    if (!worker.wallet) worker.wallet = { balance: 0 };
    worker.wallet.balance += parseFloat(amount);

    await worker.save();

    res.status(200).json({
      success: true,
      message: `Successfully recorded payment of ₹${amount} to ${worker.name}`,
      data: {
        balance: worker.wallet.balance
      }
    });
  } catch (error) {
    console.error('Pay worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment. Please try again.'
    });
  }
};

/**
 * Get all worker jobs (global)
 */
const getAllWorkerJobs = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;

    const query = { workerId: { $exists: true, $ne: null } };
    if (status && status !== 'all') {
      if (status === 'completed') {
        query.status = { $in: [BOOKING_STATUS.COMPLETED, 'completed', 'work_done'] };
      } else if (status === 'in_progress') {
        query.status = { $in: ['in_progress', 'confirmed', 'accepted', 'journey_started', 'started'] };
      } else {
        query.status = status;
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // If search is provided, match by bookingNumber, serviceName, worker or farmer info
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      const [matchingWorkers, matchingUsers] = await Promise.all([
        Worker.find({ $or: [{ name: searchRegex }, { phone: searchRegex }, { email: searchRegex }] }).select('_id'),
        User.find({ $or: [{ name: searchRegex }, { phone: searchRegex }, { email: searchRegex }] }).select('_id')
      ]);

      const workerIds = matchingWorkers.map(w => w._id);
      const userIds = matchingUsers.map(u => u._id);

      query.$or = [
        { bookingNumber: searchRegex },
        { serviceName: searchRegex },
        { cropType: searchRegex },
        { workerId: { $in: workerIds } },
        { userId: { $in: userIds } }
      ];
    }

    const jobs = await Booking.find(query)
      .populate('workerId', 'name phone profilePhoto profileImage workerType skills serviceCategories address rating')
      .populate('userId', 'name phone email address')
      .populate('serviceId', 'title iconUrl serviceCategory')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    // Quick stats for worker bookings tab
    const [allCount, completedCount, inProgressCount, pendingCount, cancelledCount] = await Promise.all([
      Booking.countDocuments({ workerId: { $exists: true, $ne: null } }),
      Booking.countDocuments({ workerId: { $exists: true, $ne: null }, status: { $in: [BOOKING_STATUS.COMPLETED, 'work_done', 'completed'] } }),
      Booking.countDocuments({ workerId: { $exists: true, $ne: null }, status: { $in: ['in_progress', 'confirmed', 'accepted', 'journey_started', 'started'] } }),
      Booking.countDocuments({ workerId: { $exists: true, $ne: null }, status: { $in: ['pending', 'awaiting_payment'] } }),
      Booking.countDocuments({ workerId: { $exists: true, $ne: null }, status: BOOKING_STATUS.CANCELLED })
    ]);

    res.status(200).json({
      success: true,
      data: jobs,
      stats: {
        total: allCount,
        completed: completedCount,
        inProgress: inProgressCount,
        pending: pendingCount,
        cancelled: cancelledCount
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all worker jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch all worker jobs.'
    });
  }
};

/**
 * Get comprehensive worker analytics
 */
const getWorkerAnalytics = async (req, res) => {
  try {
    // 1. Overall counts
    const [
      totalWorkers,
      totalTeamLeaders,
      totalIndependentWorkers,
      approvedWorkers,
      pendingWorkers,
      suspendedWorkers,
      rejectedWorkers
    ] = await Promise.all([
      Worker.countDocuments(),
      Worker.countDocuments({ workerType: 'TEAM_LEADER' }),
      Worker.countDocuments({ workerType: { $ne: 'TEAM_LEADER' } }),
      Worker.countDocuments({ approvalStatus: 'approved' }),
      Worker.countDocuments({ approvalStatus: 'pending' }),
      Worker.countDocuments({ approvalStatus: 'suspended' }),
      Worker.countDocuments({ approvalStatus: 'rejected' })
    ]);

    // 2. Booking stats for workers
    const workerJobStats = await Booking.aggregate([
      {
        $match: {
          workerId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          completedJobs: {
            $sum: {
              $cond: [
                { $in: ['$status', [BOOKING_STATUS.COMPLETED, 'completed', 'work_done']] },
                1,
                0
              ]
            }
          },
          cancelledJobs: {
            $sum: {
              $cond: [
                { $eq: ['$status', BOOKING_STATUS.CANCELLED] },
                1,
                0
              ]
            }
          },
          inProgressJobs: {
            $sum: {
              $cond: [
                { $in: ['$status', ['in_progress', 'confirmed', 'accepted', 'journey_started', 'started']] },
                1,
                0
              ]
            }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $in: ['$status', [BOOKING_STATUS.COMPLETED, 'completed', 'work_done']] },
                { $ifNull: ['$finalAmount', '$basePrice', 0] },
                0
              ]
            }
          }
        }
      }
    ]);

    const jobSummary = workerJobStats[0] || {
      totalJobs: 0,
      completedJobs: 0,
      cancelledJobs: 0,
      inProgressJobs: 0,
      totalRevenue: 0
    };

    // 3. Average rating
    const ratingStats = await Worker.aggregate([
      { $match: { rating: { $gt: 0 } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const avgRating = ratingStats[0]?.avgRating ? Number(ratingStats[0].avgRating.toFixed(1)) : 4.8;

    // 4. Monthly booking trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Booking.aggregate([
      {
        $match: {
          workerId: { $exists: true, $ne: null },
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          totalBookings: { $sum: 1 },
          completedBookings: {
            $sum: {
              $cond: [
                { $in: ['$status', [BOOKING_STATUS.COMPLETED, 'completed', 'work_done']] },
                1,
                0
              ]
            }
          },
          revenue: {
            $sum: {
              $cond: [
                { $in: ['$status', [BOOKING_STATUS.COMPLETED, 'completed', 'work_done']] },
                { $ifNull: ['$finalAmount', '$basePrice', 0] },
                0
              ]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 5. Skills Distribution from Workers
    const skillsAggregation = await Worker.aggregate([
      { $unwind: '$skills' },
      { $group: { _id: '$skills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // 6. Top Performing Workers (based on completed jobs and rating)
    const topWorkers = await Worker.find({ approvalStatus: 'approved' })
      .select('name phone profilePhoto profileImage workerType skills rating totalJobs completedJobs wallet status')
      .sort({ completedJobs: -1, rating: -1, totalJobs: -1 })
      .limit(8);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalWorkers,
          totalTeamLeaders,
          totalIndependentWorkers,
          approvedWorkers,
          pendingWorkers,
          suspendedWorkers,
          rejectedWorkers,
          totalJobs: jobSummary.totalJobs,
          completedJobs: jobSummary.completedJobs,
          cancelledJobs: jobSummary.cancelledJobs,
          inProgressJobs: jobSummary.inProgressJobs,
          totalRevenue: jobSummary.totalRevenue,
          avgRating
        },
        workerTypeDistribution: [
          { name: 'Team Leaders', value: totalTeamLeaders, color: '#f59e0b' },
          { name: 'Independent Workers', value: totalIndependentWorkers, color: '#3b82f6' }
        ],
        statusDistribution: [
          { name: 'Approved', value: approvedWorkers, color: '#10b981' },
          { name: 'Pending', value: pendingWorkers, color: '#f59e0b' },
          { name: 'Suspended', value: suspendedWorkers, color: '#ef4444' },
          { name: 'Rejected', value: rejectedWorkers, color: '#64748b' }
        ],
        monthlyTrends: monthlyTrends.map(item => ({
          month: item._id,
          totalBookings: item.totalBookings,
          completedBookings: item.completedBookings,
          revenue: item.revenue
        })),
        skillsDistribution: skillsAggregation.map(item => ({
          skill: item._id || 'General Work',
          count: item.count
        })),
        topWorkers
      }
    });
  } catch (error) {
    console.error('Get worker analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker analytics.'
    });
  }
};

/**
 * Get worker payments summary
 */
const getWorkerPaymentsSummary = async (req, res) => {
  try {
    // For now, return workers with non-zero balances or recent job activity
    const workers = await Worker.find({
      'wallet.balance': { $exists: true }
    })
      .select('name phone wallet email serviceCategory approvalStatus')
      .sort({ 'wallet.balance': -1 });

    res.status(200).json({
      success: true,
      data: workers
    });
  } catch (error) {
    console.error('Get worker payments summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worker payments summary.'
    });
  }
};

/**
 * Toggle worker active status
 */
const toggleWorkerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body; // Expecting { isActive: true/false }

    const worker = await Worker.findById(id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    worker.isActive = isActive;
    await worker.save();

    res.status(200).json({
      success: true,
      message: `Worker ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: worker
    });
  } catch (error) {
    console.error('Toggle worker status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update worker status'
    });
  }
};

/**
 * Delete worker details
 */
const deleteWorker = async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await Worker.findByIdAndDelete(id);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Worker deleted successfully'
    });
  } catch (error) {
    console.error('Delete worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete worker'
    });
  }
};

module.exports = {
  getAllWorkers,
  getWorkerDetails,
  approveWorker,
  rejectWorker,
  suspendWorker,
  getWorkerJobs,
  getWorkerEarnings,
  payWorker,
  getAllWorkerJobs,
  getWorkerAnalytics,
  getWorkerPaymentsSummary,
  toggleWorkerStatus,
  deleteWorker
};
