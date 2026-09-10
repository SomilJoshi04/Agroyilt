/**
 * Firebase Notification Service
 * High-level service to orchestrate business-specific notifications
 */
const { sendNotificationToVendor } = require('./firebaseAdmin');

/**
 * Send a new booking request notification to a vendor
 * @param {Object} vendor - The Vendor Mongoose Document
 * @param {Object} bookingData - The Booking data object
 */
async function sendNewBookingNotification(vendor, bookingData) {
  try {
    if (!vendor || !vendor._id) {
      console.error('[FCM] Cannot send booking notification: Invalid vendor provided.');
      return;
    }

    if (!vendor.fcmTokens || vendor.fcmTokens.length === 0) {
      console.log(`[FCM] Vendor ${vendor._id} has no registered FCM tokens.`);
      return;
    }

    const payload = {
      title: "New Booking Request",
      body: `You have a new service request for ${bookingData.serviceName || 'a service'}!`,
      data: {
        type: "NEW_BOOKING_REQUEST",
        bookingId: String(bookingData.bookingId || ""),
        bookingNumber: String(bookingData.bookingNumber || ""),
        vendorId: String(vendor._id),
        serviceName: String(bookingData.serviceName || ""),
        categoryName: String(bookingData.serviceCategory || ""),
        date: String(bookingData.scheduledDate || ""),
        startTime: String(bookingData.scheduledTime || ""),
        customerName: String(bookingData.customerName || "Customer"),
        customerPhone: String(bookingData.customerPhone || ""),
        price: String(bookingData.price || ""),
        distance: String(bookingData.distance || ""),
        // Required for frontend routing from background SW:
        link: `/vendor/booking-alert/${bookingData.bookingId || ""}`
      },
      priority: 'high'
    };

    // sendNotificationToVendor automatically loops through all vendor devices
    await sendNotificationToVendor(vendor._id, payload);

  } catch (error) {
    console.error(`[FCM] Failed to send new booking notification to vendor ${vendor._id}:`, error);
  }
}

module.exports = {
  sendNewBookingNotification
};
