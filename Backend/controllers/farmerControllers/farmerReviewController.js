const Review = require('../../models/Review');
const Dispute = require('../../models/Dispute');
const Booking = require('../../models/Booking');

const farmerReviewController = {
  // Rate Booking
  rateBooking: async (req, res) => {
    try {
      const { bookingId, rating, reviewText, images } = req.body;
      const farmerId = req.user.id;

      const booking = await Booking.findOne({ _id: bookingId, userId: farmerId });
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

      if (booking.status !== 'completed') {
        return res.status(400).json({ success: false, message: 'Can only rate completed bookings' });
      }

      // Check if already reviewed
      const existingReview = await Review.findOne({ bookingId, userId: farmerId });
      if (existingReview) {
        return res.status(400).json({ success: false, message: 'You have already reviewed this booking' });
      }

      const review = new Review({
        bookingId,
        userId: farmerId,
        vendorId: booking.vendorId,
        serviceId: booking.serviceId,
        rating,
        reviewText,
        images: images || [],
        status: 'approved' // Auto-approve or pending based on admin settings
      });

      await review.save();
      
      booking.rating = rating;
      booking.review = reviewText;
      booking.reviewedAt = new Date();
      await booking.save();

      res.status(201).json({ success: true, message: 'Review submitted successfully', data: review });
    } catch (error) {
      console.error('Error submitting review:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // File Complaint
  fileComplaint: async (req, res) => {
    try {
      const { bookingId, reason, description, attachments } = req.body;
      const farmerId = req.user.id;

      const booking = await Booking.findOne({ _id: bookingId, userId: farmerId });
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

      const dispute = new Dispute({
        bookingId,
        raisedBy: farmerId,
        raisedByRole: 'USER', // Farmer is User
        reason,
        description,
        attachments: attachments || [],
        status: 'pending'
      });

      await dispute.save();
      res.status(201).json({ success: true, message: 'Complaint filed successfully', data: dispute });
    } catch (error) {
      console.error('Error filing complaint:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
};

module.exports = farmerReviewController;
