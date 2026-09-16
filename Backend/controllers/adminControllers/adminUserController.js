const User = require('../../models/User');
const Booking = require('../../models/Booking');
const { validationResult } = require('express-validator');

/**
 * Get all users with filters and pagination
 */
const getAllUsers = async (req, res) => {
  try {
    const {
      search,
      isActive,
      isPhoneVerified,
      isEmailVerified,
      approvalStatus,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (isPhoneVerified !== undefined) {
      query.isPhoneVerified = isPhoneVerified === 'true';
    }
    if (isEmailVerified !== undefined) {
      query.isEmailVerified = isEmailVerified === 'true';
    }

    if (approvalStatus && approvalStatus !== 'all') {
      if (approvalStatus === 'approved') {
        query.approvalStatus = { $in: ['approved', null] };
      } else {
        query.approvalStatus = approvalStatus;
      }
    }

    // Search by name, phone, or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users. Please try again.'
    });
  }
};

/**
 * Get user details
 */
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user booking stats
    const bookingStats = await Booking.aggregate([
      {
        $match: { userId: user._id }
      },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          completedBookings: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          totalSpent: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'success'] },
                '$finalAmount',
                0
              ]
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        user,
        stats: bookingStats[0] || {
          totalBookings: 0,
          completedBookings: 0,
          totalSpent: 0
        }
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details. Please try again.'
    });
  }
};

/**
 * Block/unblock user
 */
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = isActive !== undefined ? isActive : !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'blocked'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status. Please try again.'
    });
  }
};

/**
 * Delete user (soft delete)
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Farmer deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete farmer. Please try again.'
    });
  }
};

/**
 * View user bookings
 */
const getUserBookings = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Build query
    const query = { userId: id };
    if (status) {
      query.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings
    const bookings = await Booking.find(query)
      .populate('vendorId', 'name businessName')
      .populate('serviceId', 'title iconUrl')
      .populate('workerId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user bookings. Please try again.'
    });
  }
};

/**
 * View user wallet transactions
 */
const getUserWalletTransactions = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('wallet');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get wallet transactions from bookings
    const transactions = await Booking.find({
      userId: id,
      paymentMethod: 'wallet',
      paymentStatus: 'success'
    })
      .select('bookingNumber finalAmount createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        balance: user.wallet.balance || 0,
        transactions
      }
    });
  } catch (error) {
    console.error('Get user wallet transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet transactions. Please try again.'
    });
  }
};

/**
 * Get all user bookings with filters and pagination
 */
const getAllUserBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    // Search by user name or phone
    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const userIds = users.map(u => u._id);
      query.userId = { $in: userIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const bookings = await Booking.find(query)
      .populate('userId', 'name phone email')
      .populate('workerId', 'name phone')
      .populate('serviceId', 'title')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user bookings'
    });
  }
};

/**
 * Update User KYC Status (for Equipment Owners)
 */
const updateKycStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.kyc_status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: `KYC status updated to ${status}`,
      data: user
    });
  } catch (error) {
    console.error('Update KYC status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update KYC status' });
  }
};

/**
 * Add a new user directly (Admin)
 */
const addUser = async (req, res) => {
  try {
    const { name, phone, email } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      phone,
      email: email || null,
      isPhoneVerified: true, // Auto verify since admin is adding
      isActive: true,
      approvalStatus: 'approved',
      approvalDate: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Farmer added successfully',
      data: user
    });
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add farmer'
    });
  }
};

/**
 * Approve or Reject Farmer (User)
 */
const updateApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus, rejectionReason } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval status. Must be approved, rejected, or pending.'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    user.approvalStatus = approvalStatus;
    if (approvalStatus === 'approved') {
      user.approvalDate = new Date();
      user.rejectionReason = null;
    } else if (approvalStatus === 'rejected') {
      user.rejectionReason = rejectionReason || 'Registration rejected by admin';
    }

    await user.save();

    // Send notification to user
    try {
      const { createNotification } = require('../notificationControllers/notificationController');
      if (approvalStatus === 'approved') {
        await createNotification({
          userId: user._id,
          type: 'farmer_approved',
          title: '🌾 Account Approved!',
          message: 'Your Farmer account has been approved by admin. You can now login and book services.',
          relatedId: user._id,
          relatedType: 'user'
        });
      } else if (approvalStatus === 'rejected') {
        await createNotification({
          userId: user._id,
          type: 'farmer_rejected',
          title: '❌ Account Application Update',
          message: `Your account application was not approved. Reason: ${user.rejectionReason}`,
          relatedId: user._id,
          relatedType: 'user'
        });
      }
    } catch (notifErr) {
      console.error('Notification error on farmer approval update:', notifErr);
    }

    res.status(200).json({
      success: true,
      message: `Farmer ${approvalStatus} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Update farmer approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update farmer approval status'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserDetails,
  toggleUserStatus,
  deleteUser,
  getUserBookings,
  getUserWalletTransactions,
  getAllUserBookings,
  updateKycStatus,
  addUser,
  updateApprovalStatus
};
