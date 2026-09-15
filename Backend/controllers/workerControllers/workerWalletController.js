'use strict';

const Worker = require('../../models/Worker');
const Transaction = require('../../models/Transaction');
const { getWorkerFinancialSettings } = require('../../services/workerFinancialService');

exports.getWallet = async (req, res) => {
  try {
    const workerId = req.user._id;
    const worker = await Worker.findById(workerId).select('wallet outstandingDues isRestricted restrictionReason');
    
    if (!worker) return res.status(404).json({ success: false, message: 'Worker not found' });
    
    const settings = await getWorkerFinancialSettings();
    
    return res.json({
      success: true,
      data: {
        wallet: worker.wallet,
        outstandingDues: worker.outstandingDues,
        isRestricted: worker.isRestricted,
        restrictionReason: worker.restrictionReason,
        maxDuesAllowed: settings.maxWorkerDues
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
    const workerId = req.user._id;
    // Payout logic - placeholder for now
    return res.json({ success: true, message: 'Payout requested successfully' });
  } catch (error) {
    console.error('[requestPayout]', error);
    return res.status(500).json({ success: false, message: 'Failed to request payout' });
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
