const Booking = require('../../models/Booking');
const VendorEquipment = require('../../models/VendorEquipment');
const Service = require('../../models/Service');
const mongoose = require('mongoose');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../../utils/constants');

const farmerBookingController = {
  // Create Booking
  createBooking: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { machineryId, date, timeSlot, location, area, cropType } = req.body;
      const userId = req.user.id;

      const equipment = await VendorEquipment.findById(machineryId).session(session);
      if (!equipment || !equipment.isActive) {
        throw new Error('Equipment is not available');
      }

      const service = await Service.findById(equipment.categoryId).session(session);

      // Check if slot is already booked (simplified lock check)
      const existingBooking = await Booking.findOne({
        equipmentId: machineryId,
        scheduledDate: date,
        'timeSlot.start': timeSlot.start,
        status: { $nin: ['cancelled', 'completed'] }
      }).session(session);

      if (existingBooking) {
        throw new Error('Time slot is already booked');
      }

      // Calculate server-side price (e.g. hourly * hours)
      let basePrice = equipment.pricing?.hourly?.price || equipment.pricing?.fixed?.price || 500;
      let finalAmount = basePrice;
      let calculatedDurationMinutes = null;

      if (area && equipment.pricing?.land_based?.price) {
         const parsedArea = parseFloat(String(area).replace(/[^\d.]/g, ''));
         const safeArea = isNaN(parsedArea) ? 1 : Math.max(0.5, parsedArea);
         basePrice = equipment.pricing.land_based.price * safeArea;
         finalAmount = basePrice;
      } else if (timeSlot && timeSlot.start && timeSlot.end) {
         const [startHours, startMinutes] = timeSlot.start.split(':').map(Number);
         const [endHours, endMinutes] = timeSlot.end.split(':').map(Number);
         calculatedDurationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
         if (calculatedDurationMinutes <= 0) {
            throw new Error('End time must be after start time');
         }
         if (calculatedDurationMinutes < 30) {
            throw new Error('Hourly booking must be at least 30 minutes.');
         }
         if (calculatedDurationMinutes % 30 !== 0) {
            throw new Error('Hourly booking duration must be in 30-minute increments.');
         }
         basePrice = (equipment.pricing?.hourly?.price || 500) * (calculatedDurationMinutes / 60);
         finalAmount = basePrice;
      }

      const newBooking = new Booking({
        userId,
        vendorId: equipment.vendorId,
        serviceId: equipment.categoryId,
        equipmentId: machineryId,
        serviceName: equipment.name,
        serviceCategory: service ? service.name : 'Agriculture',
        basePrice,
        finalAmount,
        scheduledDate: date,
        scheduledTime: timeSlot.start,
        timeSlot,
        address: location,
        cropType,
        landSize: area ? `${area} Acres` : null,
        durationMinutes: typeof calculatedDurationMinutes !== 'undefined' ? calculatedDurationMinutes : null,
        status: BOOKING_STATUS.PENDING
      });

      await newBooking.save({ session });
      await session.commitTransaction();

      res.status(201).json({ success: true, message: 'Booking created successfully', data: newBooking });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error creating booking:', error);
      res.status(400).json({ success: false, message: error.message || 'Server Error' });
    } finally {
      session.endSession();
    }
  },

  // Get Booking History
  getBookingHistory: async (req, res) => {
    try {
      const { status, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
      let query = { userId: req.user.id };

      if (status) query.status = status;
      if (dateFrom || dateTo) {
        query.scheduledDate = {};
        if (dateFrom) query.scheduledDate.$gte = new Date(dateFrom);
        if (dateTo) query.scheduledDate.$lte = new Date(dateTo);
      }

      const skip = (Number(page) - 1) * Number(limit);
      const bookings = await Booking.find(query)
        .populate('vendorId', 'name businessName phone rating')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Booking.countDocuments(query);

      res.status(200).json({
        success: true,
        data: bookings,
        pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
      });
    } catch (error) {
      console.error('Error fetching booking history:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Cancel Booking
  cancelBooking: async (req, res) => {
    try {
      const bookingId = req.params.id;
      const { reason } = req.body;

      const booking = await Booking.findOne({ _id: bookingId, userId: req.user.id });
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (['in-progress', 'completed', 'cancelled'].includes(booking.status)) {
        return res.status(400).json({ success: false, message: `Cannot cancel a booking that is ${booking.status}` });
      }

      booking.status = BOOKING_STATUS.CANCELLED;
      booking.cancelledAt = new Date();
      booking.cancellationReason = reason || 'Cancelled by farmer';
      booking.cancelledBy = 'farmer';

      await booking.save();
      res.status(200).json({ success: true, message: 'Booking cancelled successfully', data: booking });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Request Extension
  requestExtension: async (req, res) => {
    try {
      const bookingId = req.params.id;
      const { requestedHours, reason } = req.body;

      const booking = await Booking.findOne({ _id: bookingId, userId: req.user.id });
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (booking.status !== BOOKING_STATUS.IN_PROGRESS) {
        return res.status(400).json({ success: false, message: 'Can only extend in-progress bookings' });
      }

      // Assume standard hourly rate
      const chargeAmount = requestedHours * (booking.basePrice / (booking.estimatedDuration || 1)); // crude estimation

      booking.extensionRequests.push({
        requestedHours,
        chargeAmount,
        reason,
        status: 'pending'
      });

      await booking.save();
      res.status(200).json({ success: true, message: 'Extension requested successfully', data: booking });
    } catch (error) {
      console.error('Error requesting extension:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Approve Work Completion
  approveWorkCompletion: async (req, res) => {
    try {
      const bookingId = req.params.id;
      
      const booking = await Booking.findOne({ _id: bookingId, userId: req.user.id });
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (booking.status !== BOOKING_STATUS.IN_PROGRESS) {
        return res.status(400).json({ success: false, message: 'Booking is not in progress' });
      }

      booking.customerConfirmed = true;
      booking.status = BOOKING_STATUS.COMPLETED;
      booking.completedAt = new Date();

      await booking.save();
      res.status(200).json({ success: true, message: 'Work completion approved', data: booking });
    } catch (error) {
      console.error('Error approving completion:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
};

module.exports = farmerBookingController;
