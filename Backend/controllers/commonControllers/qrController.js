const jwt = require('jsonwebtoken');
const QRVerification = require('../../models/QRVerification');
const Booking = require('../../models/Booking');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// GENERATE QR
exports.generateQRToken = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { type, workerAssignmentId } = req.body;
    // type: 'worker_arrival', 'work_start', 'work_completion'

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // 10 minute expiry for the JWT
    const qrToken = jwt.sign(
      { bookingId, type, workerAssignmentId }, 
      JWT_SECRET, 
      { expiresIn: '10m' }
    );

    // Create record
    const qrRecord = await QRVerification.create({
      bookingId,
      workerAssignmentId: workerAssignmentId || null,
      type,
      qrToken
    });

    res.status(201).json({ success: true, data: qrRecord });
  } catch (err) {
    console.error('generateQRToken error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate QR token' });
  }
};

// SCAN & VALIDATE QR
exports.scanQRToken = async (req, res) => {
  try {
    const { qrToken, geoLocation } = req.body;
    const scannedBy = req.user.id;

    // 1. Validate JWT signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(qrToken, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired QR code signature' });
    }

    // 2. Find record in DB to enforce single-use
    const qrRecord = await QRVerification.findOne({ qrToken });
    if (!qrRecord) {
      return res.status(404).json({ success: false, message: 'QR record not found' });
    }
    if (qrRecord.status !== 'generated') {
      return res.status(400).json({ success: false, message: 'This QR code has already been scanned or is expired' });
    }

    // 3. Mark as scanned
    qrRecord.status = 'scanned';
    qrRecord.scannedBy = scannedBy;
    qrRecord.scannedAt = new Date();
    if (geoLocation) {
      qrRecord.geoLocation = geoLocation;
    }
    await qrRecord.save();

    res.status(200).json({ success: true, message: 'QR scanned successfully', data: qrRecord });
  } catch (err) {
    console.error('scanQRToken error:', err);
    res.status(500).json({ success: false, message: 'Failed to scan QR' });
  }
};

exports.getQRHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const history = await QRVerification.find({ bookingId })
      .populate('scannedBy', 'name')
      .populate({
        path: 'workerAssignmentId',
        populate: { path: 'labourTeamMemberId', select: 'name mobile' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({ success: true, data: history });
  } catch (err) {
    console.error('getQRHistory error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch QR history' });
  }
};
