const SoilTestRequest = require('../../models/SoilTestRequest');
const { createNotification } = require('../notificationControllers/notificationController');

/**
 * Admin: Get all soil test requests
 */
const getAllSoilTestRequests = async (req, res) => {
    try {
        const requests = await SoilTestRequest.find()
            .populate('userId', 'name email phone')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Update soil test request status/report
 */
const updateSoilTestRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes, reportUrl } = req.body;

        const request = await SoilTestRequest.findByIdAndUpdate(
            id,
            { status, adminNotes, reportUrl },
            { new: true, runValidators: true }
        );

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Soil test request updated successfully',
            data: request
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Assign a vendor to a soil test request
 */
const assignVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorId } = req.body;

        if (!vendorId) {
            return res.status(400).json({ success: false, message: 'Vendor ID is required' });
        }

        const request = await SoilTestRequest.findByIdAndUpdate(
            id,
            { 
                vendorId, 
                status: 'assigned' 
            },
            { new: true }
        );

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        // Push Notification: Notify Vendor about new assignment
        try {
            await createNotification({
                vendorId: vendorId,
                type: 'soil_test_assigned',
                title: '🧪 New Task: Soil Test Assigned',
                message: `You have been assigned a new soil test request from ${request.location}.`,
                relatedId: request._id,
                relatedType: 'service',
                pushData: {
                    type: 'soil_test_assigned',
                    requestId: request._id.toString(),
                    link: '/vendor/soil-tests'
                }
            });
        } catch (noticeErr) {
            console.error('Notification error (Vendor Assignment):', noticeErr);
        }

        res.status(200).json({
            success: true,
            message: 'Vendor assigned successfully',
            data: request
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Approve a soil test report
 */
const approveReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes, price, commissionPercentage } = req.body;

        const request = await SoilTestRequest.findById(id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.reportStatus !== 'uploaded') {
            return res.status(400).json({ success: false, message: 'No report uploaded to approve' });
        }

        const totalAmount = Number(price) || 0;
        const percent = Number(commissionPercentage) || 0;
        const adminCommission = (totalAmount * (percent / 100));
        const vendorEarning = totalAmount - adminCommission;

        request.status = 'completed';
        request.reportStatus = 'approved';
        request.paymentStatus = 'pending'; // Requires payment to download
        request.totalAmount = totalAmount;
        request.commissionPercentage = percent;
        request.adminCommission = adminCommission;
        request.vendorEarning = vendorEarning;

        if (adminNotes) request.adminNotes = adminNotes;
        
        await request.save();

        // Push Notification: Notify User that report is ready for payment
        try {
            await createNotification({
                userId: request.userId,
                type: 'soil_test_report_approved',
                title: '🎉 Soil Report Ready!',
                message: `Your soil test report is ready! Pay ₹${totalAmount} to unlock and download it.`,
                relatedId: request._id,
                relatedType: 'service',
                pushData: {
                    type: 'soil_test_report_approved',
                    requestId: request._id.toString(),
                    link: '/user/soil-testing'
                }
            });
        } catch (noticeErr) {
            console.error('Notification error (User Approval):', noticeErr);
        }

        res.status(200).json({
            success: true,
            message: 'Report approved. Payment pending from user.',
            data: request
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Delete soil test request
 */
const deleteSoilTestRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await SoilTestRequest.findByIdAndDelete(id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Soil test request deleted'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllSoilTestRequests,
    updateSoilTestRequest,
    deleteSoilTestRequest,
    assignVendor,
    approveReport
};
