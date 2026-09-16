const RegistrationFeeConfig = require('../../models/RegistrationFeeConfig');
const RegistrationFeePayment = require('../../models/RegistrationFeePayment');
const User = require('../../models/User');
const Vendor = require('../../models/Vendor');
const Worker = require('../../models/Worker');
const { createOrder, verifyPayment } = require('../../services/razorpayService');
const { generateTokenPair } = require('../../utils/tokenService');

const getModelForRole = (role) => {
  switch (role) {
    case 'USER': return User;
    case 'VENDOR': return Vendor;
    case 'WORKER': return Worker;
    default: return null;
  }
};

const formatAccountData = (account, role) => {
  if (!account) return {};
  const normalizedRole = role?.toUpperCase();
  if (normalizedRole === 'USER') {
    return {
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        role: account.role || 'user'
      }
    };
  } else if (normalizedRole === 'VENDOR') {
    return {
      vendor: {
        id: account._id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        businessName: account.businessName,
        service: account.service,
        approvalStatus: account.approvalStatus
      }
    };
  } else if (normalizedRole === 'WORKER') {
    return {
      worker: {
        id: account._id,
        name: account.name,
        email: account.email,
        phone: account.phone,
        serviceType: account.serviceType,
        aadharVerified: account.aadhar?.isVerified || false
      }
    };
  }
  return {};
};

/**
 * Initiate Registration Fee Payment
 */
const initiatePayment = async (req, res) => {
  try {
    const { role, accountId } = req.user; // from preAuthToken

    if (!role || !accountId) {
      return res.status(401).json({ success: false, message: 'Invalid pre-auth token' });
    }

    const Model = getModelForRole(role);
    const account = await Model.findById(accountId);

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (account.registrationFeeStatus === 'PAID') {
      return res.status(400).json({ success: false, message: 'Registration fee is already paid.' });
    }

    // Get active config for this role
    const feeConfig = await RegistrationFeeConfig.findOne({ role, isActive: true });
    if (!feeConfig) {
      return res.status(500).json({ success: false, message: `Fee configuration not found for role ${role}.` });
    }

    // If fee is 0, auto-approve
    if (feeConfig.amount === 0) {
      account.registrationFeeStatus = 'PAID';
      account.registrationFeeAmount = 0;
      account.registrationFeeVersion = feeConfig.version;
      await account.save();

      // Issue full tokens
      const roleEnum = role === 'USER' ? 'user' : role === 'VENDOR' ? 'vendor' : 'worker';
      const tokens = generateTokenPair({ userId: account._id, role: roleEnum });
      
      return res.status(200).json({
        success: true,
        message: 'Registration fee is zero. Access granted.',
        autoApproved: true,
        ...tokens,
        ...formatAccountData(account, role)
      });
    }

    // Create Razorpay Order
    const orderOptions = await createOrder(feeConfig.amount, feeConfig.currency, `reg_fee_${role}_${Date.now()}`);
    
    if (!orderOptions.success) {
      return res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }

    // Save pending payment record
    const paymentRecord = new RegistrationFeePayment({
      accountId: account._id,
      roleModel: role === 'USER' ? 'User' : role === 'VENDOR' ? 'Vendor' : 'Worker',
      role,
      mobileNumberNormalized: account.phone,
      gatewayOrderId: orderOptions.orderId,
      status: 'PENDING',
      amount: feeConfig.amount,
      currency: feeConfig.currency,
      feeVersion: feeConfig.version
    });

    await paymentRecord.save();

    res.status(200).json({
      success: true,
      order: {
        id: orderOptions.orderId,
        amount: orderOptions.amount,
        currency: orderOptions.currency
      },
      paymentRecordId: paymentRecord._id
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate payment.' });
  }
};

/**
 * Verify Registration Fee Payment
 */
const verifyFeePayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentRecordId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentRecordId) {
      return res.status(400).json({ success: false, message: 'Missing payment details.' });
    }

    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
    }

    const paymentRecord = await RegistrationFeePayment.findById(paymentRecordId);
    if (!paymentRecord) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (paymentRecord.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'Payment already processed.' });
    }

    // Verify order ID matches
    if (paymentRecord.gatewayOrderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: 'Order ID mismatch.' });
    }

    // Update Payment Record
    paymentRecord.status = 'PAID';
    paymentRecord.gatewayPaymentId = razorpay_payment_id;
    paymentRecord.paidAt = new Date();
    await paymentRecord.save();

    // Update Account
    const Model = getModelForRole(paymentRecord.role);
    const account = await Model.findById(paymentRecord.accountId);
    
    if (account) {
      account.registrationFeeStatus = 'PAID';
      account.registrationFeeAmount = paymentRecord.amount;
      account.registrationFeeVersion = paymentRecord.feeVersion;
      account.registrationFeePaymentId = paymentRecord._id;
      await account.save();
    }

    // Issue Full Access Tokens
    const roleEnum = paymentRecord.role === 'USER' ? 'user' : paymentRecord.role === 'VENDOR' ? 'vendor' : 'worker';
    const tokens = generateTokenPair({ userId: account._id, role: roleEnum });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      ...tokens,
      ...formatAccountData(account, paymentRecord.role)
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify payment.' });
  }
};

/**
 * Get Active Fee Configuration (Public)
 */
const getFeeConfig = async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!['USER', 'VENDOR', 'WORKER'].includes(role?.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const feeConfig = await RegistrationFeeConfig.findOne({ role: role.toUpperCase(), isActive: true });
    
    if (!feeConfig) {
      return res.status(404).json({ success: false, message: 'No active fee configuration found.' });
    }

    res.status(200).json({
      success: true,
      config: {
        role: feeConfig.role,
        amount: feeConfig.amount,
        currency: feeConfig.currency,
        version: feeConfig.version
      }
    });
  } catch (error) {
    console.error('Get fee config error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fee configuration.' });
  }
};

/**
 * Admin: Update Fee Configuration
 */
const updateFeeConfig = async (req, res) => {
  try {
    const { role, amount, currency } = req.body;
    
    if (!['USER', 'VENDOR', 'WORKER'].includes(role?.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    // Find the current active config to increment version
    const currentConfig = await RegistrationFeeConfig.findOne({ role: role.toUpperCase(), isActive: true });
    const nextVersion = currentConfig ? currentConfig.version + 1 : 1;

    if (currentConfig) {
      currentConfig.isActive = false;
      await currentConfig.save();
    }

    const newConfig = new RegistrationFeeConfig({
      role: role.toUpperCase(),
      amount,
      currency: currency || 'INR',
      version: nextVersion,
      isActive: true,
      updatedBy: req.user?._id // Assuming admin user ID is attached by auth middleware
    });

    await newConfig.save();

    res.status(200).json({
      success: true,
      message: 'Fee configuration updated successfully.',
      config: newConfig
    });
  } catch (error) {
    console.error('Update fee config error:', error);
    res.status(500).json({ success: false, message: 'Failed to update fee configuration.' });
  }
};

/**
 * Admin: Get All Active Fee Configurations
 */
const getAllFeeConfigs = async (req, res) => {
  try {
    const configs = await RegistrationFeeConfig.find({ isActive: true });
    
    const result = {
      USER: 0,
      VENDOR: 0,
      WORKER: 0
    };

    configs.forEach(c => {
      if (result.hasOwnProperty(c.role)) {
        result[c.role] = c.amount;
      }
    });

    res.status(200).json({
      success: true,
      fees: result,
      configs
    });
  } catch (error) {
    console.error('Get all fee configs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch fee configurations.' });
  }
};

module.exports = {
  initiatePayment,
  verifyFeePayment,
  getFeeConfig,
  updateFeeConfig,
  getAllFeeConfigs
};
