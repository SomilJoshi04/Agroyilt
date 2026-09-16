const express = require('express');
const router = express.Router();
const { 
  initiatePayment, 
  verifyFeePayment, 
  getFeeConfig 
} = require('../../controllers/shared/registrationFeeController');

// The `protect` middleware normally checks for valid full-access token. 
// We need a specific middleware that accepts a PRE_AUTH token, or we can use the existing auth 
// middleware if it doesn't strictly reject without full permissions yet, but wait - 
// we will just use a generic JWT verifier for PRE_AUTH tokens to keep it secure.

const jwt = require('jsonwebtoken');

const requirePreAuth = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no pre-auth token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isPreAuth) {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }
    
    req.user = {
      accountId: decoded.userId,
      role: decoded.role
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// Public
router.get('/config/:role', getFeeConfig);

// Protected by PreAuth Token
router.post('/initiate-payment', requirePreAuth, initiatePayment);
router.post('/verify-payment', requirePreAuth, verifyFeePayment);

module.exports = router;
