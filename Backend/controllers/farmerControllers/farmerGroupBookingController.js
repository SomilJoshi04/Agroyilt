const GroupBooking = require('../../models/GroupBooking');
const Booking = require('../../models/Booking');
const VendorEquipment = require('../../models/VendorEquipment');
const mongoose = require('mongoose');
const { BOOKING_STATUS } = require('../../utils/constants');

const farmerGroupBookingController = {
  // Create Group Booking
  createGroupBooking: async (req, res) => {
    try {
      const { machineryId, date, timeSlot, location, area } = req.body;
      const primaryFarmerId = req.user.id;

      const equipment = await VendorEquipment.findById(machineryId);
      if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });

      // Proportional cost split requires a base price per acre
      const pricePerAcre = equipment.pricing?.land_based?.price || 500;
      const shareAmount = pricePerAcre * area;

      const groupBooking = new GroupBooking({
        primaryFarmerId,
        machineryId,
        vendorId: equipment.vendorId,
        serviceId: equipment.categoryId,
        date,
        timeSlot,
        location,
        totalArea: area,
        totalEstimatedCost: shareAmount,
        participants: [{
          farmerId: primaryFarmerId,
          area,
          shareAmount,
          isConfirmed: false
        }]
      });

      await groupBooking.save();
      res.status(201).json({ success: true, message: 'Group booking initiated', data: groupBooking });
    } catch (error) {
      console.error('Error creating group booking:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Join Group Booking
  joinGroupBooking: async (req, res) => {
    try {
      const { id } = req.params;
      const { area } = req.body;
      const farmerId = req.user.id;

      const groupBooking = await GroupBooking.findById(id).populate('machineryId');
      if (!groupBooking) return res.status(404).json({ success: false, message: 'Group booking not found' });
      
      if (groupBooking.status !== 'pending') {
        return res.status(400).json({ success: false, message: 'Group booking is no longer accepting participants' });
      }

      // Check if already joined
      if (groupBooking.participants.some(p => p.farmerId.toString() === farmerId)) {
        return res.status(400).json({ success: false, message: 'You have already joined this booking' });
      }

      const pricePerAcre = groupBooking.machineryId?.pricing?.land_based?.price || 500;
      const shareAmount = pricePerAcre * area;

      groupBooking.participants.push({
        farmerId,
        area,
        shareAmount,
        isConfirmed: false
      });

      groupBooking.totalArea += area;
      groupBooking.totalEstimatedCost += shareAmount;

      await groupBooking.save();
      res.status(200).json({ success: true, message: 'Joined group booking successfully', data: groupBooking });
    } catch (error) {
      console.error('Error joining group booking:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Confirm Participation
  confirmParticipation: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { id } = req.params;
      const farmerId = req.user.id;

      const groupBooking = await GroupBooking.findById(id).session(session);
      if (!groupBooking) throw new Error('Group booking not found');

      const participant = groupBooking.participants.find(p => p.farmerId.toString() === farmerId);
      if (!participant) throw new Error('You are not a participant in this booking');

      participant.isConfirmed = true;

      // Check if all participants are confirmed
      const allConfirmed = groupBooking.participants.every(p => p.isConfirmed);
      if (allConfirmed) {
        groupBooking.status = 'locked';
        
        // Create an aggregate Booking for the vendor
        const aggregateBooking = new Booking({
          userId: groupBooking.primaryFarmerId, // Representative
          vendorId: groupBooking.vendorId,
          serviceId: groupBooking.serviceId,
          equipmentId: groupBooking.machineryId,
          serviceName: 'Group Booking Aggregate',
          serviceCategory: 'Agriculture',
          basePrice: groupBooking.totalEstimatedCost,
          finalAmount: groupBooking.totalEstimatedCost,
          scheduledDate: groupBooking.date,
          scheduledTime: groupBooking.timeSlot?.start || '09:00',
          timeSlot: groupBooking.timeSlot,
          address: groupBooking.location,
          landSize: `${groupBooking.totalArea} Acres (Group)`,
          status: BOOKING_STATUS.PENDING
        });

        await aggregateBooking.save({ session });
        groupBooking.aggregateBookingId = aggregateBooking._id;
        groupBooking.status = 'converted';
      }

      await groupBooking.save({ session });
      await session.commitTransaction();

      res.status(200).json({ success: true, message: 'Participation confirmed', data: groupBooking });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error confirming participation:', error);
      res.status(400).json({ success: false, message: error.message || 'Server Error' });
    } finally {
      session.endSession();
    }
  }
};

module.exports = farmerGroupBookingController;
