const Product = require('../../models/Product');
const EcommerceOrder = require('../../models/EcommerceOrder');
const User = require('../../models/User'); // Required for populate('userId')
const Vendor = require('../../models/Vendor');
const { createNotification } = require('../notificationControllers/notificationController');

/**
 * Vendor: Get my products (Only Physical Goods for Ecommerce Store)
 */
const getMyProducts = async (req, res) => {
    try {
        const products = await Product.find({ 
            vendorId: req.user._id,
            type: 'physical_good' 
        }).populate('categoryId', 'title').lean();
        res.status(200).json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch products' });
    }
};

/**
 * Vendor: Add product to my store (Starts as PENDING, Forced Type: physical_good)
 */
const addProduct = async (req, res) => {
    try {
        const productData = {
            ...req.body,
            vendorId: req.user._id,
            type: 'physical_good',
            approvalStatus: 'pending',
            status: 'inactive'
        };

        // If categoryId is empty string, remove it (Mongoose CastError prevention)
        if (productData.categoryId === "") delete productData.categoryId;

        const product = new Product(productData);
        await product.save();
        res.status(201).json({ success: true, data: product, message: 'Product submitted for admin review' });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateMyProduct = async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        // Sanitize categoryId to prevent Mongoose conversion errors if arriving as empty string
        if (updateData.categoryId === "") delete updateData.categoryId;

        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, vendorId: req.user._id, type: 'physical_good' },
            updateData,
            { new: true, runValidators: true }
        );
        if (!product) return res.status(404).json({ success: false, message: 'Product not found or not an ecommerce item' });
        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update product' });
    }
};

const deleteMyProduct = async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({ 
            _id: req.params.id, 
            vendorId: req.user._id,
            type: 'physical_good'
        });
        if (!product) return res.status(404).json({ success: false, message: 'Product not found or not an ecommerce item' });
        res.status(200).json({ success: true, message: 'Product removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete product' });
    }
};

/**
 * Vendor: Get orders for my shop
 */
const getMyOrders = async (req, res) => {
    try {
        const orders = await EcommerceOrder.find({ vendorId: req.user._id })
            .populate('userId', 'name phone')
            .sort({ createdAt: -1 })
            .lean();
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
};

/**
 * Vendor: Update order tracking status
 */
    const updateOrderStatus = async (req, res) => {
        try {
            const { status, trackingNumber, courierName, deliveryOtp } = req.body;
            const allowedStatuses = ['packed', 'shipped', 'delivered', 'cancelled'];
            
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status' });
            }

            const order = await EcommerceOrder.findOne({ _id: req.params.id, vendorId: req.user._id });
            if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

            if (status === 'delivered') {
                if (order.deliveryOtp && order.deliveryOtp !== deliveryOtp) {
                    return res.status(400).json({ success: false, message: 'Invalid Verification OTP' });
                }
            }

            const updateData = { deliveryStatus: status };
            
            // Add timestamps
            if (status === 'packed') updateData['trackingDetails.packedAt'] = new Date();
            if (status === 'shipped') {
                updateData['trackingDetails.shippedAt'] = new Date();
                updateData['trackingDetails.trackingNumber'] = trackingNumber;
                updateData['trackingDetails.courierName'] = courierName;
            }
            if (status === 'delivered') updateData['trackingDetails.deliveredAt'] = new Date();
            if (status === 'cancelled') updateData['trackingDetails.cancelledAt'] = new Date();

            Object.assign(order, updateData);
            if(status === 'shipped') {
                if(!order.trackingDetails) order.trackingDetails = {};
                order.trackingDetails.shippedAt = updateData['trackingDetails.shippedAt'];
                order.trackingDetails.trackingNumber = updateData['trackingDetails.trackingNumber'];
                order.trackingDetails.courierName = updateData['trackingDetails.courierName'];
            }
            if(status === 'packed' && !order.trackingDetails) order.trackingDetails = { packedAt: new Date() };
            if(status === 'delivered' && order.trackingDetails) order.trackingDetails.deliveredAt = new Date();
            if(status === 'cancelled' && order.trackingDetails) order.trackingDetails.cancelledAt = new Date();
            
            await order.save();

            // Notify User
            try {
                let msg = `Your order status has been updated to ${status}.`;
                if (status === 'shipped') msg = `Your order has been shipped via ${courierName} (Trk: ${trackingNumber}).`;
                if (status === 'delivered') msg = `Your order has been delivered!`;
                
                await createNotification({
                    recipientId: order.userId,
                    recipientModel: 'User',
                    title: `Order Update: ${status.toUpperCase()}`,
                    message: msg,
                    type: 'ecommerce_order_update',
                    metadata: { orderId: order._id, status }
                });
            } catch (nErr) { console.error('Push notification error:', nErr); }

            res.status(200).json({ success: true, message: `Order marked as ${status}`, data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update order status' });
    }
};

module.exports = {
    getMyProducts,
    addProduct,
    updateMyProduct,
    deleteMyProduct,
    getMyOrders,
    updateOrderStatus
};
