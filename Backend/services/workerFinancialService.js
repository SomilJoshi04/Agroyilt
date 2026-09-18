'use strict';

const mongoose = require('mongoose');
const Worker = require('../models/Worker');
const User = require('../models/User');
const Booking = require('../models/Booking');
const WorkerSettlement = require('../models/WorkerSettlement');
const WorkerPenalty = require('../models/WorkerPenalty');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');

/**
 * Worker Financial Service
 * Handles settlements, dues, penalties, canonical payment summary calculation,
 * and idempotent refund processing for Independent Workers.
 */

exports.getWorkerFinancialSettings = async () => {
  let settings = await Settings.findOne({ type: 'global' });
  if (!settings) {
    settings = await Settings.create({ type: 'global' });
  }
  return {
    workerCommissionPercentage: settings.workerCommissionPercentage ?? 10,
    workerPlatformChargePercentage: settings.workerPlatformChargePercentage ?? 0,
    workerPenaltyEnabled: settings.workerPenaltyEnabled ?? false,
    workerPenaltyType: settings.workerPenaltyType ?? 'fixed',
    workerPenaltyAmount: settings.workerPenaltyAmount ?? 100,
    workerPenaltyPercentage: settings.workerPenaltyPercentage ?? 10,
    maxWorkerDues: settings.maxWorkerDues ?? 500,
    workerCashPaymentEnabled: settings.workerCashPaymentEnabled ?? true
  };
};

exports.calculateBookingCommission = async (grossAmount) => {
  const settings = await exports.getWorkerFinancialSettings();
  const commissionAmount = (grossAmount * settings.workerCommissionPercentage) / 100;
  const netAmount = grossAmount - commissionAmount;

  return {
    commissionRate: settings.workerCommissionPercentage,
    commissionAmount: Math.round(commissionAmount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100
  };
};

/**
 * Canonical Farmer Payment Summary Builder
 * @param {Object} request - WorkerBookingRequest document
 * @param {Array} assignments - Array of IndWorkerAssignment documents
 * @param {Object} booking - Optional legacy Booking document
 */
exports.buildFarmerPaymentSummary = (request, assignments = [], booking = null) => {
  const snap = request?.financialSnapshot || {};
  const selectedWorkerCount = Number(snap.selectedWorkerCount || request?.selectedWorkerIds?.length || request?.requiredWorkers || 1);
  const maxRatePerWorker = Number(snap.maximumBudget || request?.maxRate || booking?.maxRate || booking?.agreedRate || booking?.totalAmount || 0);
  const workerReserveAmount = Number(snap.maximumWorkerAmount || (maxRatePerWorker * selectedWorkerCount));
  const platformChargeRate = Number(snap.platformChargeRate ?? 10);
  const platformFeeAmount = Number(
    snap.platformChargeAmount !== undefined && snap.platformChargeAmount !== null && snap.platformChargeAmount > 0
      ? snap.platformChargeAmount
      : Math.round(((workerReserveAmount * platformChargeRate) / 100) * 100) / 100
  );
  const totalPaidAmount = Number(snap.totalPayable || (workerReserveAmount + platformFeeAmount) || booking?.farmerPaidAmount || booking?.totalAmount || 0);

  const validAssignments = (assignments && assignments.length > 0)
    ? assignments.filter(a => a && a.assignmentStatus !== 'CANCELLED')
    : [];

  const allSettled = validAssignments.length > 0 && validAssignments.every(a => a.settlementStatus === 'SETTLED');
  const isCompleted = request?.status === 'completed' || allSettled || booking?.status === 'work_done' || booking?.status === 'completed';

  let actualWorkerAmount = null;
  let unusedWorkerReserve = null;
  let refundAmount = null;
  let refundStatus = 'PENDING';

  const paymentStatusRaw = request?.paymentStatus || booking?.paymentStatus || 'pending';
  const isPaid = ['success', 'paid', 'PAID', 'SUCCESS'].includes(paymentStatusRaw);

  if (!isPaid) {
    refundStatus = 'NOT_ELIGIBLE';
  } else if (request?.refundCredited) {
    actualWorkerAmount = validAssignments.length > 0
      ? validAssignments.reduce((sum, a) => sum + (Number(a.grossAmount) || Number(a.agreedRate) || 0), 0)
      : (booking?.workerGrossEarning || booking?.agreedRate || 0);
    unusedWorkerReserve = Math.max(0, workerReserveAmount - actualWorkerAmount);
    refundAmount = request.refundAmount != null ? request.refundAmount : unusedWorkerReserve;
    refundStatus = refundAmount > 0 ? 'REFUNDED' : 'NOT_ELIGIBLE';
  } else if (isCompleted) {
    actualWorkerAmount = validAssignments.length > 0
      ? validAssignments.reduce((sum, a) => sum + (Number(a.grossAmount) || Number(a.agreedRate) || 0), 0)
      : (booking?.workerGrossEarning || booking?.agreedRate || 0);
    unusedWorkerReserve = Math.max(0, workerReserveAmount - actualWorkerAmount);
    refundAmount = request?.refundAmount != null ? request.refundAmount : unusedWorkerReserve;
    refundStatus = refundAmount > 0 ? (request?.refundCredited ? 'REFUNDED' : 'PENDING') : 'NOT_ELIGIBLE';
  } else {
    // In progress / pending completion: actual amounts are not finalized yet
    actualWorkerAmount = null;
    unusedWorkerReserve = null;
    refundAmount = null;
    refundStatus = 'PENDING';
  }

  return {
    selectedWorkerCount,
    maxRatePerWorker,
    workerReserveAmount,
    platformFeeAmount,
    totalPaidAmount,
    actualWorkerAmount,
    unusedWorkerReserve,
    refundAmount,
    refundStatus,
    paymentStatus: isPaid ? 'PAID' : (paymentStatusRaw ? paymentStatusRaw.toUpperCase() : 'PENDING'),
    paymentReference: request?.razorpayPaymentId || booking?.paymentId || null,
    currency: snap.currency || 'INR'
  };
};

/**
 * Canonical Worker Payment Summary Builder (Isolated per worker)
 * @param {Object} assignment - IndWorkerAssignment document
 * @param {Object} booking - Optional legacy Booking document
 */
exports.buildWorkerPaymentSummary = (assignment, booking = null) => {
  if (!assignment && !booking) return null;

  const agreedRate = Number(assignment?.agreedRate ?? (booking?.agreedRate || booking?.workerOfferedRate || booking?.workerGrossEarning || booking?.totalAmount || 0));
  const rateUnit = assignment?.rateUnit || booking?.rateUnit || 'daily';
  const grossAmount = Number(assignment?.grossAmount ?? (booking?.workerGrossEarning || booking?.agreedRate || agreedRate));
  const commissionRate = Number(assignment?.commissionRate ?? (booking?.commissionRate || 10));
  const commissionAmount = Number(assignment?.commissionAmount ?? (booking?.commissionAmount || Math.round((grossAmount * commissionRate) / 100)));
  const netEarning = Number(assignment?.netEarning ?? (booking?.workerNetEarning || (grossAmount - commissionAmount)));

  let rawSettlementStatus = assignment?.settlementStatus || (booking?.settlementStatus === 'completed' ? 'SETTLED' : (booking?.status === 'work_done' || booking?.status === 'completed' ? 'SETTLED' : 'PENDING'));
  let settlementStatus = rawSettlementStatus ? rawSettlementStatus.toUpperCase() : 'PENDING';
  if (settlementStatus === 'COMPLETED') settlementStatus = 'SETTLED';

  const settlementTransactionId = assignment?.settlementTransactionId || (settlementStatus === 'SETTLED' ? `TXN-${(booking?._id || assignment?._id || '').toString().slice(-6).toUpperCase()}` : null);
  const settledAt = assignment?.settledAt || (settlementStatus === 'SETTLED' ? (assignment?.updatedAt || booking?.workDoneAt || booking?.updatedAt || null) : null);

  return {
    agreedRate,
    rateUnit,
    grossAmount,
    commissionRate,
    commissionAmount,
    netEarning,
    settlementStatus,
    settlementTransactionId,
    settledAt
  };
};

/**
 * Idempotent Farmer Wallet Refund Processor
 * Triggered at assignment completion/settlement stage when actual worker amounts are known.
 */
exports.processFarmerBookingRefund = async (parentRequestId) => {
  const WorkerBookingRequest = require('../models/WorkerBookingRequest');
  const IndWorkerAssignment = require('../models/IndWorkerAssignment');
  const Wallet = require('../models/Wallet');
  const WalletTransaction = require('../models/WalletTransaction');

  const request = await WorkerBookingRequest.findById(parentRequestId);
  if (!request) return { success: false, message: 'Request not found' };

  if (request.refundCredited) {
    return { success: true, message: 'Refund already credited', refundAmount: request.refundAmount };
  }

  const snap = request.financialSnapshot;
  if (!snap || !snap.maximumWorkerAmount) {
    return { success: false, message: 'No financial snapshot found' };
  }

  const assignments = await IndWorkerAssignment.find({
    parentRequestId: request._id,
    assignmentStatus: { $ne: 'CANCELLED' }
  });

  const maxWorkerTotal = snap.maximumWorkerAmount;
  const actualWorkerTotal = assignments.reduce((sum, a) => sum + (Number(a.grossAmount) || Number(a.agreedRate) || 0), 0);
  const refundAmount = Math.max(0, maxWorkerTotal - actualWorkerTotal);

  if (refundAmount <= 0) {
    request.refundAmount = 0;
    request.refundCredited = false;
    await request.save();
    return { success: true, message: 'No refund due', refundAmount: 0 };
  }

  const refundKey = `refund_${request._id.toString()}_booking`;
  const existingRefund = await WalletTransaction.findOne({ idempotencyKey: refundKey });
  if (existingRefund) {
    request.refundAmount = refundAmount;
    request.refundCredited = true;
    request.refundCreditedAt = existingRefund.createdAt;
    await request.save();
    return { success: true, message: 'Refund already completed', refundAmount };
  }

  let farmerWallet = await Wallet.findOne({ userId: request.farmerId, userModel: 'User' });
  if (!farmerWallet) {
    farmerWallet = await Wallet.create({ userId: request.farmerId, userModel: 'User', balance: 0 });
  }

  const prevBalance = farmerWallet.balance || 0;
  farmerWallet.balance = prevBalance + refundAmount;
  await farmerWallet.save();

  // Sync embedded User model balance
  await User.findByIdAndUpdate(request.farmerId, { 'wallet.balance': farmerWallet.balance });

  const bookingRef = request.bookingNumber || `WRK-${request._id.toString().slice(-6).toUpperCase()}`;
  const refundDesc = `Unused Reserve Refund for ${request.workTitle || 'Worker'} Booking (#${bookingRef})`;

  // 1. Log in WalletTransaction
  await WalletTransaction.create({
    walletId: farmerWallet._id,
    type: 'credit',
    amount: refundAmount,
    reason: 'refund',
    referenceId: request._id.toString(),
    gatewayTransactionId: request.razorpayPaymentId || null,
    idempotencyKey: refundKey,
    status: 'completed'
  });

  // 2. Log in Transaction for unified passbook
  await Transaction.create({
    userId: request.farmerId,
    type: 'refund',
    amount: refundAmount,
    status: 'completed',
    paymentMethod: 'wallet',
    description: refundDesc,
    balanceBefore: prevBalance,
    balanceAfter: farmerWallet.balance,
    referenceId: request._id.toString(),
    metadata: {
      bookingId: request._id.toString(),
      bookingNumber: bookingRef,
      actualWorkerTotal,
      maxWorkerTotal
    }
  });

  request.refundAmount = refundAmount;
  request.refundCredited = true;
  request.refundCreditedAt = new Date();
  await request.save();

  console.log(`[REFUND IDEMPOTENT] Farmer ${request.farmerId} refunded Rs.${refundAmount}, New Balance: Rs.${farmerWallet.balance}`);

  // Emit real-time wallet update to Farmer socket room
  try {
    const { getIO } = require('../sockets');
    const io = getIO();
    if (io) {
      const socketPayload = {
        balance: farmerWallet.balance,
        refundAmount,
        type: 'credit',
        message: refundDesc,
        timestamp: new Date()
      };
      io.to(`user_${request.farmerId}`).emit('wallet_balance_updated', socketPayload);
      io.to(`user:${request.farmerId}`).emit('wallet_balance_updated', socketPayload);
      io.to(`user_${request.farmerId}`).emit('wallet_updated', socketPayload);
      io.to(`user:${request.farmerId}`).emit('wallet_updated', socketPayload);
    }
  } catch (sockErr) {
    console.warn('[REFUND SOCKET EMIT WARNING]:', sockErr.message);
  }

  try {
    const { createNotification } = require('../controllers/notificationControllers/notificationController');
    await createNotification({
      userId: request.farmerId,
      type: 'refund',
      title: 'Refund Credited to Wallet!',
      message: `₹${refundAmount} credited to your AgroYilt wallet. Workers finalized at ₹${actualWorkerTotal} (Reserve: ₹${maxWorkerTotal}).`,
      relatedId: request._id,
      relatedType: 'WorkerBookingRequest',
      priority: 'high',
      pushData: { type: 'refund', amount: refundAmount, link: '/user/wallet' }
    });
  } catch (notifErr) {
    console.warn('[REFUND NOTIF WARNING]:', notifErr.message);
  }

  return { success: true, message: 'Refund successfully credited', refundAmount, balance: farmerWallet.balance };
};

/**
 * Adds amount to worker's outstanding dues. Restricts worker if max dues exceeded.
 */
exports.addWorkerDues = async (workerId, amount, session = null) => {
  const settings = await exports.getWorkerFinancialSettings();

  const worker = await Worker.findById(workerId).session(session);
  if (!worker) throw new Error('Worker not found');

  worker.outstandingDues += amount;

  if (worker.outstandingDues > settings.maxWorkerDues) {
    worker.isRestricted = true;
    worker.restrictionReason = `Outstanding dues (?${worker.outstandingDues}) exceeded allowed limit (?${settings.maxWorkerDues})`;
    worker.restrictedAt = new Date();
  }

  await worker.save({ session });
  return worker;
};

/**
 * Applies a penalty to a worker. Idempotent based on penaltyEventId.
 */
exports.applyWorkerPenalty = async (workerId, bookingId, penaltyEventId, penaltyType, reason) => {
  const settings = await exports.getWorkerFinancialSettings();

  if (!settings.workerPenaltyEnabled) return null;

  // Idempotency check
  const existingPenalty = await WorkerPenalty.findOne({ penaltyEventId });
  if (existingPenalty) return existingPenalty;

  let penaltyAmount = settings.workerPenaltyAmount;
  if (settings.workerPenaltyType === 'percentage' && bookingId) {
    const booking = await Booking.findById(bookingId);
    if (booking && booking.workerGrossEarning) {
      penaltyAmount = (booking.workerGrossEarning * settings.workerPenaltyPercentage) / 100;
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Determine how to apply penalty (deduct from wallet if balance > penalty, else add to dues)
    const worker = await Worker.findById(workerId).session(session);
    let walletDeducted = false;
    let addedToDues = false;

    if (worker.wallet.balance >= penaltyAmount) {
      worker.wallet.balance -= penaltyAmount;
      walletDeducted = true;

      // Ledger entry for wallet deduction
      await Transaction.create([{
        workerId,
        bookingId,
        type: 'penalty',
        amount: penaltyAmount,
        status: 'completed',
        paymentMethod: 'system',
        description: `Penalty for ${reason}`,
        referenceId: penaltyEventId,
        balanceBefore: worker.wallet.balance + penaltyAmount,
        balanceAfter: worker.wallet.balance
      }], { session });
    } else {
      worker.outstandingDues += penaltyAmount;
      addedToDues = true;

      if (worker.outstandingDues > settings.maxWorkerDues) {
        worker.isRestricted = true;
        worker.restrictionReason = `Outstanding dues (?${worker.outstandingDues}) exceeded limit due to penalty`;
        worker.restrictedAt = new Date();
      }
    }

    await worker.save({ session });

    const penalty = await WorkerPenalty.create([{
      workerId,
      bookingId,
      penaltyEventId,
      penaltyType,
      penaltyAmount,
      reason,
      walletDeducted,
      addedToDues,
      status: 'applied'
    }], { session });

    await session.commitTransaction();
    return penalty[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
