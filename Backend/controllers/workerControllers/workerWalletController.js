'use strict';

const Worker = require('../../models/Worker');
const Transaction = require('../../models/Transaction');
const { getWorkerFinancialSettings } = require('../../services/workerFinancialService');
const withdrawalService = require('../../services/withdrawalService');

exports.getWallet = async (req, res) => {
  try {
    const workerId = req.user._id;
    const worker = await Worker.findById(workerId).select('wallet outstandingDues isRestricted restrictionReason vendorId workerType');
    
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    
    const settings = await getWorkerFinancialSettings();
    
    let workerWalletDoc = null;
    try {
      const Wallet = require('../../models/Wallet');
      workerWalletDoc = await Wallet.findOne({ $or: [{ workerId }, { userId: workerId }] });
    } catch (e) {
      // Wallet model might not exist or be optional
    }

    const currentBalance = (worker.wallet?.balance !== undefined && worker.wallet?.balance !== null)
      ? Number(worker.wallet.balance)
      : (workerWalletDoc?.balance !== undefined ? Number(workerWalletDoc.balance) : 0);

    const reservedWithdrawal = Number(worker.wallet?.reservedWithdrawal || 0);

    return res.json({
      success: true,
      data: {
        balance: currentBalance,
        reservedWithdrawal,
        workerType: worker.workerType || 'WORKER',
        wallet: {
          balance: currentBalance,
          reservedWithdrawal,
          workerType: worker.workerType || 'WORKER',
          ...(worker.wallet || {})
        },
        outstandingDues: worker.outstandingDues || 0,
        isRestricted: worker.isRestricted || false,
        restrictionReason: worker.restrictionReason || null,
        maxDuesAllowed: settings.maxWorkerDues,
        vendorId: worker.vendorId || null
      }
    });
  } catch (error) {
    console.error('[getWallet]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch wallet details' });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const workerId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ workerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments({ workerId });

    return res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[getTransactions]', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

exports.requestPayout = async (req, res) => {
  try {
    const workerId = req.user._id || req.user.id;
    const { amount, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const result = await withdrawalService.createWithdrawalRequest({
      requesterId: workerId,
      requesterRole: 'worker',
      amountINR: Number(amount),
      notes
    });

    return res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: result.data
    });
  } catch (error) {
    console.error('[requestPayout]', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to request payout' });
  }
};

exports.clearDues = async (req, res) => {
  try {
    const workerId = req.user._id;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });

    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    
    if (worker.outstandingDues < amount) {
       return res.status(400).json({ success: false, message: 'Amount exceeds outstanding dues' });
    }

    worker.outstandingDues -= amount;
    
    const settings = await getWorkerFinancialSettings();
    if (worker.outstandingDues <= settings.maxWorkerDues) {
       worker.isRestricted = false;
       worker.restrictionReason = null;
    }
    
    await worker.save();
    
    await Transaction.create({
      workerId,
      amount,
      type: 'payment',
      paymentMethod: 'online',
      status: 'completed',
      description: `Dues cleared: ?${amount}`,
    });
    
    return res.json({ success: true, message: 'Dues cleared successfully', data: { outstandingDues: worker.outstandingDues, isRestricted: worker.isRestricted } });
  } catch (error) {
    console.error('[clearDues]', error);
    return res.status(500).json({ success: false, message: 'Failed to clear dues' });
  }
};
