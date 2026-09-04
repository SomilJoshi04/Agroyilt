const mongoose = require('mongoose');
const Requirement = require('../../models/Requirement');
const Bid = require('../../models/Bid');
const Booking = require('../../models/Booking');
const { BOOKING_STATUS } = require('../../utils/constants');
const { createNotification } = require('../notificationControllers/notificationController');

exports.createRequirement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId, details, location, requiredDate, budgetMin, budgetMax, expiryHours } = req.body;
    
    if (!categoryId || !details || !location || !location.cityId || !requiredDate) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (expiryHours || 48)); // default 48h

    const requirement = await Requirement.create({
      userId,
      categoryId,
      details,
      location,
      requiredDate,
      budgetMin,
      budgetMax,
      expiresAt
    });

    res.status(201).json({ success: true, data: requirement });
  } catch (error) {
    console.error('Create requirement error:', error);
    res.status(500).json({ success: false, message: 'Failed to create requirement' });
  }
};

exports.getMyRequirements = async (req, res) => {
  try {
    const userId = req.user.id;
    const requirements = await Requirement.find({ userId })
      .populate('categoryId', 'title slug')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: requirements });
  } catch (error) {
    console.error('Get requirements error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requirements' });
  }
};

exports.getBidsForRequirement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { sortBy = 'price_asc' } = req.query;

    const requirement = await Requirement.findOne({ _id: id, userId });
    if (!requirement) return res.status(404).json({ success: false, message: 'Requirement not found' });

    let sortOption = { bidAmount: 1 };
    if (sortBy === 'price_desc') sortOption = { bidAmount: -1 };

    const bids = await Bid.find({ requirementId: id })
      .populate('vendorId', 'name businessName phone rating totalJobs')
      .populate('equipmentId', 'name modelNumber images')
      .sort(sortOption)
      .lean();

    // Map withinBudget flag
    const mappedBids = bids.map(bid => {
      let withinBudget = null;
      if (requirement.budgetMin != null && requirement.budgetMax != null) {
        withinBudget = (bid.bidAmount >= requirement.budgetMin && bid.bidAmount <= requirement.budgetMax);
      } else if (requirement.budgetMax != null) {
        withinBudget = bid.bidAmount <= requirement.budgetMax;
      } else if (requirement.budgetMin != null) {
        withinBudget = bid.bidAmount >= requirement.budgetMin;
      }
      return { ...bid, withinBudget };
    });

    res.status(200).json({ success: true, data: mappedBids });
  } catch (error) {
    console.error('Get bids error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bids' });
  }
};

exports.acceptBid = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user.id;
    const { id, bidId } = req.params;

    const requirement = await Requirement.findOne({ _id: id, userId }).session(session);
    if (!requirement || requirement.status !== 'open') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Requirement not open or not found' });
    }

    const acceptedBid = await Bid.findOne({ _id: bidId, requirementId: id }).session(session);
    if (!acceptedBid || acceptedBid.status !== 'pending') {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: 'Bid not valid or already processed' });
    }

    // 1. Mark accepted bid
    acceptedBid.status = 'accepted';
    await acceptedBid.save({ session });

    // 2. Mark requirement fulfilled
    requirement.status = 'fulfilled';
    await requirement.save({ session });

    // 3. Mark other bids rejected
    await Bid.updateMany(
      { requirementId: id, _id: { $ne: bidId }, status: 'pending' },
      { $set: { status: 'rejected' } },
      { session }
    );

    // Fetch category title for booking details
    const Category = require('../../models/Category');
    const category = await Category.findById(requirement.categoryId);

    // 4. Auto-generate Booking
    const booking = new Booking({
      userId,
      vendorId: acceptedBid.vendorId,
      serviceId: requirement.categoryId, // Fallback, using category ID as service ID reference
      categoryId: requirement.categoryId,
      serviceName: category ? category.title : 'Requirement Fulfillment',
      serviceCategory: category ? category.title : 'Machinery', 
      equipmentId: acceptedBid.equipmentId,
      basePrice: acceptedBid.bidAmount,
      finalAmount: acceptedBid.bidAmount,
      address: { 
        addressLine1: requirement.location.address || 'Address', 
        city: requirement.location.cityId, 
        state: 'State', 
        pincode: '000000',
        lat: requirement.location.lat,
        lng: requirement.location.lng
      },
      scheduledDate: requirement.requiredDate,
      scheduledTime: '09:00 AM', 
      timeSlot: { start: '09:00 AM', end: '06:00 PM' },
      status: BOOKING_STATUS.CONFIRMED,
      bookingType: 'scheduled'
    });
    
    // Generate driver_start_otp
    booking.driver_start_otp = Math.floor(1000 + Math.random() * 9000).toString();
    await booking.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Async notifications
    createNotification({
      userId: acceptedBid.vendorId, 
      type: 'bid_accepted',
      title: 'Bid Accepted!',
      message: `Your bid for ₹${acceptedBid.bidAmount} was accepted. A booking has been created.`,
      relatedId: booking._id,
      relatedType: 'booking'
    }).catch(console.error);

    const rejectedBids = await Bid.find({ requirementId: id, _id: { $ne: bidId } }).select('vendorId');
    for (const bid of rejectedBids) {
      createNotification({
        userId: bid.vendorId,
        type: 'bid_rejected',
        title: 'Bid Not Selected',
        message: 'Your bid for a recent requirement was not selected by the farmer.',
        relatedId: requirement._id,
        relatedType: 'requirement'
      }).catch(console.error);
    }

    res.status(200).json({ success: true, message: 'Bid accepted and booking generated', bookingId: booking._id });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Accept bid error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept bid' });
  }
};
