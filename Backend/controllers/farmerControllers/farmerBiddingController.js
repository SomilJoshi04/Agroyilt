const Requirement = require('../../models/Requirement');
const Bid = require('../../models/Bid');
const Booking = require('../../models/Booking');
const mongoose = require('mongoose');
const { BOOKING_STATUS } = require('../../utils/constants');

const farmerBiddingController = {
  // Post Requirement
  postRequirement: async (req, res) => {
    try {
      const { category, details, location, requiredDate, budgetMin, budgetMax, area } = req.body;
      const farmerId = req.user.id;

      const requirement = new Requirement({
        userId: farmerId,
        category,
        details,
        location,
        requiredDate,
        budget: {
          min: budgetMin || 0,
          max: budgetMax || 0
        },
        area,
        status: 'open'
      });

      await requirement.save();
      res.status(201).json({ success: true, message: 'Requirement posted successfully', data: requirement });
    } catch (error) {
      console.error('Error posting requirement:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Cancel Requirement
  cancelRequirement: async (req, res) => {
    try {
      const { id } = req.params;
      const requirement = await Requirement.findOne({ _id: id, userId: req.user.id });

      if (!requirement) {
        return res.status(404).json({ success: false, message: 'Requirement not found' });
      }

      if (requirement.status !== 'open') {
        return res.status(400).json({ success: false, message: 'Can only cancel open requirements' });
      }

      requirement.status = 'cancelled';
      await requirement.save();

      // Also mark associated bids as rejected
      await Bid.updateMany({ requirementId: id }, { status: 'rejected' });

      res.status(200).json({ success: true, message: 'Requirement cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling requirement:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Get Requirement Bids
  getRequirementBids: async (req, res) => {
    try {
      const { id } = req.params;
      
      const requirement = await Requirement.findOne({ _id: id, userId: req.user.id });
      if (!requirement) {
        return res.status(404).json({ success: false, message: 'Requirement not found' });
      }

      const bids = await Bid.find({ requirementId: id, status: { $ne: 'rejected' } })
        .populate('vendorId', 'name businessName rating')
        .sort({ bidAmount: 1 }); // Sort by price asc

      // Decorate with withinBudget flag
      const decoratedBids = bids.map(bid => {
        const bidObj = bid.toObject();
        bidObj.withinBudget = (!requirement.budget.max || bid.bidAmount <= requirement.budget.max);
        return bidObj;
      });

      res.status(200).json({ success: true, data: decoratedBids });
    } catch (error) {
      console.error('Error fetching requirement bids:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Accept Bid
  acceptBid: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { id, bidId } = req.params;
      
      const requirement = await Requirement.findOne({ _id: id, userId: req.user.id }).session(session);
      if (!requirement) throw new Error('Requirement not found');
      
      if (requirement.status !== 'open') {
        throw new Error('Requirement is already fulfilled or cancelled');
      }

      const bid = await Bid.findOne({ _id: bidId, requirementId: id }).session(session);
      if (!bid) throw new Error('Bid not found');

      // Update Requirement & Bid Status
      requirement.status = 'fulfilled';
      requirement.acceptedBidId = bidId;
      bid.status = 'accepted';

      // Auto-convert to Booking
      const booking = new Booking({
        userId: req.user.id,
        vendorId: bid.vendorId,
        serviceId: requirement.category,
        serviceName: requirement.details.title || 'Custom Requirement',
        serviceCategory: 'Agriculture',
        basePrice: bid.bidAmount,
        finalAmount: bid.bidAmount,
        scheduledDate: requirement.requiredDate,
        scheduledTime: '09:00',
        timeSlot: { start: '09:00', end: '18:00' },
        address: requirement.location,
        landSize: requirement.area ? `${requirement.area} Acres` : null,
        status: BOOKING_STATUS.PENDING
      });

      await requirement.save({ session });
      await bid.save({ session });
      await booking.save({ session });

      // Mark other bids as rejected
      await Bid.updateMany(
        { requirementId: id, _id: { $ne: bidId } },
        { status: 'rejected' },
        { session }
      );

      await session.commitTransaction();
      res.status(200).json({ success: true, message: 'Bid accepted and booking generated', data: booking });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error accepting bid:', error);
      res.status(400).json({ success: false, message: error.message || 'Server Error' });
    } finally {
      session.endSession();
    }
  }
};

module.exports = farmerBiddingController;
