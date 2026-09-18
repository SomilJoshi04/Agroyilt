const Booking = require('../../models/Booking');
const Worker = require('../../models/Worker');
const { BOOKING_STATUS } = require('../../utils/constants');

/**
 * Get worker dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const workerId = req.user.id;

    // Get Worker Profile for Rating (fallback)
    const worker = await Worker.findById(workerId);

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // 2. Calculate Total Net Earnings
    let totalEarnings = 0;
    try {
      const IndWorkerAssignment = require('../../models/IndWorkerAssignment');
      const Transaction = require('../../models/Transaction');

      const [assignStats, txnStats, bookingStats] = await Promise.all([
        IndWorkerAssignment.aggregate([
          {
            $match: {
              workerId: worker._id,
              $or: [
                { assignmentStatus: 'COMPLETED' },
                { settlementStatus: 'SETTLED' },
                { journeyStatus: 'COMPLETED' }
              ]
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$netEarning' }
            }
          }
        ]),
        Transaction.aggregate([
          {
            $match: {
              workerId: worker._id,
              type: { $in: ['earnings_credit', 'worker_payment'] },
              status: 'completed'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' }
            }
          }
        ]),
        Booking.aggregate([
          {
            $match: {
              workerId: worker._id,
              status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.WORK_DONE] }
            }
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $ifNull: [
                    '$workerNetEarning',
                    { $multiply: [{ $ifNull: ['$finalAmount', '$agreedRate', 0] }, 0.9] }
                  ]
                }
              }
            }
          }
        ])
      ]);

      const txnTotal = txnStats.length > 0 ? txnStats[0].total : 0;
      const assignTotal = assignStats.length > 0 ? assignStats[0].total : 0;
      const bookingTotal = bookingStats.length > 0 ? bookingStats[0].total : 0;

      totalEarnings = txnTotal > 0 ? txnTotal : (assignTotal > 0 ? assignTotal : bookingTotal);
    } catch (err) {
      console.warn('[getDashboardStats] Earning calculation fallback:', err.message);
    }

    const BookingRequest = require('../../models/BookingRequest');
    const myRequests = await BookingRequest.find({ workerId: worker._id, status: { $ne: 'REJECTED' } }).select('bookingId');
    const requestBookingIds = myRequests.map(r => r.bookingId);

    const workerFilter = {
      $or: [
        { workerId: worker._id },
        { notifiedWorkers: worker._id },
        { 'potentialWorkers.workerId': worker._id },
        { _id: { $in: requestBookingIds } }
      ]
    };

    // 3. Count Active Jobs (Assigned, Visited, In Progress, Requested, Searching)
    const activeJobsCount = await Booking.countDocuments({
      ...workerFilter,
      status: {
        $in: [
          BOOKING_STATUS.ASSIGNED,
          BOOKING_STATUS.VISITED,
          BOOKING_STATUS.IN_PROGRESS,
          BOOKING_STATUS.CONFIRMED,
          BOOKING_STATUS.REQUESTED,
          BOOKING_STATUS.SEARCHING,
          BOOKING_STATUS.PENDING
        ]
      }
    });

    // 4. Count Completed Jobs
    const completedJobsCount = await Booking.countDocuments({
      workerId: worker._id,
      status: { $in: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.WORK_DONE] }
    });

    // 5. Calculate Average Rating
    const ratingStats = await Booking.aggregate([
      {
        $match: {
          workerId: worker._id,
          rating: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" }
        }
      }
    ]);

    const averageRating = ratingStats.length > 0 ? parseFloat(ratingStats[0].avgRating.toFixed(1)) : (worker.rating || 0);

    // 6. Get Recent Jobs
    const recentJobs = await Booking.find(workerFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name')
      .populate('serviceId', 'title');

    res.status(200).json({
      success: true,
      data: {
        totalEarnings,
        activeJobs: activeJobsCount,
        completedJobs: completedJobsCount,
        rating: averageRating,
        recentJobs
      }
    });

  } catch (error) {
    console.error('Get worker dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
};

module.exports = {
  getDashboardStats
};
