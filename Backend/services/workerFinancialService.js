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
 * Handles settlements, dues, and penalties for Independent Workers
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


