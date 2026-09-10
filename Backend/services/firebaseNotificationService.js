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
    const vendorId = vendor._id || vendor.id || vendor;
    if (!vendorId) {
      console.error('[FCM] Cannot send booking notification: Invalid vendor provided.');
      return;
    }

    const payload = {
      title: "New Booking Request",
      body: `You have a new service request for ${bookingData.serviceName || 'a service'}!`,
      data: {
        type: "new_booking_request",
        notificationType: "new_booking",
        bookingId: String(bookingData.bookingId || ""),
        bookingNumber: String(bookingData.bookingNumber || ""),
        vendorId: String(vendorId),
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

    // sendNotificationToVendor automatically loops through all vendor devices and fetches fresh tokens from DB
    await sendNotificationToVendor(vendorId, payload);

  } catch (error) {
    console.error(`[FCM] Failed to send new booking notification to vendor ${vendor._id}:`, error);
  }
}

module.exports = {
  sendNewBookingNotification
};
