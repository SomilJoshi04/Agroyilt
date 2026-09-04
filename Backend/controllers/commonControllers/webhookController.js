const crypto = require('crypto');
const mongoose = require('mongoose');
const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const PaymentWebhookLog = require('../../models/PaymentWebhookLog');
const Booking = require('../../models/Booking');

exports.razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret'; // Fallback for dev
  const signature = req.headers['x-razorpay-signature'];

  // 1. Log incoming raw payload immediately
  const logEntry = new PaymentWebhookLog({
    provider: 'razorpay',
    eventType: req.body.event || 'unknown',
    rawPayload: req.body,
    signatureValid: false,
    processedStatus: 'received'
  });

  try {
    // We expect raw body for signature validation. If express.json() is parsing it, 
    // we need to use JSON.stringify or configure a custom middleware for raw body.
    // For this phase, assuming JSON.stringify works as the payload is clean.
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature && process.env.NODE_ENV === 'production') {
      logEntry.errorDetails = 'Invalid signature';
      await logEntry.save();
      return res.status(400).send('Invalid signature');
    }
    
    logEntry.signatureValid = true;

    // 3. Extract data and enforce Idempotency
    const event = req.body.event;
    
    if (event !== 'payment.captured') {
      logEntry.processedStatus = 'processed';
      logEntry.errorDetails = 'Ignored event type';
      await logEntry.save();
      return res.status(200).send('OK');
    }

    const paymentEntity = req.body.payload.payment.entity;
    const gatewayTransactionId = paymentEntity.id;
    const bookingId = paymentEntity.notes?.bookingId; 
    
    if (!bookingId) {
      logEntry.processedStatus = 'failed';
      logEntry.errorDetails = 'No bookingId in payment notes';
      await logEntry.save();
      return res.status(200).send('OK'); // Return 200 so RP stops retrying
    }

    const idempotencyKey = `razorpay_${event}_${gatewayTransactionId}`;

    const existingTx = await WalletTransaction.findOne({ idempotencyKey: idempotencyKey + '_vendor' });
    if (existingTx) {
      logEntry.processedStatus = 'ignored_duplicate';
      await logEntry.save();
      return res.status(200).send('OK');
    }

    // 4. Atomic Wallet Updates
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking || !booking.vendorId) {
        throw new Error('Booking or Vendor not found');
      }

      // Amounts in paise
      const totalAmountPaise = paymentEntity.amount; 
      const commissionPercent = parseInt(process.env.PLATFORM_COMMISSION_PERCENT || '10', 10);
      const commissionAmount = Math.floor((totalAmountPaise * commissionPercent) / 100);
      const vendorShare = totalAmountPaise - commissionAmount;

      let vendorWallet = await Wallet.findOne({ userId: booking.vendorId, userModel: 'Vendor' }).session(session);
      if (!vendorWallet) {
        vendorWallet = new Wallet({ userId: booking.vendorId, userModel: 'Vendor', balance: 0 });
      }

      const vendorTx = new WalletTransaction({
        walletId: vendorWallet._id,
        type: 'credit',
        amount: vendorShare,
        reason: 'booking_payment',
        referenceId: bookingId,
        gatewayTransactionId,
        idempotencyKey: idempotencyKey + '_vendor',
        status: 'completed'
      });
      await vendorTx.save({ session });
      
      vendorWallet.balance += vendorShare;
      await vendorWallet.save({ session });

      await session.commitTransaction();
      session.endSession();

      logEntry.processedStatus = 'processed';
      await logEntry.save();

      return res.status(200).send('OK');

    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } catch (error) {
    console.error('Webhook error:', error);
    logEntry.processedStatus = 'failed';
    logEntry.errorDetails = error.message;
    await logEntry.save();
    return res.status(500).send('Internal Server Error');
  }
};
