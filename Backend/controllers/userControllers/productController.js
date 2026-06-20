const Product = require('../../models/Product');
const EcommerceOrder = require('../../models/EcommerceOrder');
const Transaction = require('../../models/Transaction');
const User = require('../../models/User');
const { createOrder, verifyPayment } = require('../../services/razorpayService');
const { createNotification } = require('../notificationControllers/notificationController');

/**
 * User: Get all approved products (Marketplace)
 */
const getApprovedProducts = async (req, res) => {
    try {
        const { categoryId, query } = req.query;
        let filter = { 
            approvalStatus: 'approved', 
            status: 'active', 
            stock: { $gt: 0 } 
        };

        if (categoryId) filter.categoryId = categoryId;
        if (query) {
            filter.$or = [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ];
        }

        const products = await Product.find(filter)
            .populate('categoryId', 'title imageUrl')
            .populate('vendorId', 'businessName name profilePhoto')
            .sort({ isFeatured: -1, createdAt: -1 });

        res.status(200).json({ success: true, data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch products' });
    }
};

const getProductDetails = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('categoryId', 'title')
            .populate('vendorId', 'businessName phone profilePhoto');
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
        res.status(200).json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch product' });
    }
};

/**
 * User: Create an order (Calculates Platform Fee vs Vendor Balance)
 */
const placeOrder = async (req, res) => {
    try {
        const { productId, quantity, shippingAddress, paymentMethod, paymentType } = req.body;
        
        const product = await Product.findById(productId);
        if (!product || product.approvalStatus !== 'approved' || product.stock < quantity) {
            return res.status(400).json({ success: false, message: 'Product unavailable or out of stock' });
        }

        const itemsTotal = product.price * quantity;
        const adminCommission = (itemsTotal * (product.commissionPercentage / 100));
        const gstAmount = (itemsTotal * (product.gstPercentage / 100));
        const platformFee = adminCommission + gstAmount;
        const vendorBalance = itemsTotal;

        const orderTotal = itemsTotal + platformFee;
        
        const order = new EcommerceOrder({
            userId: req.user._id,
            vendorId: product.vendorId,
            items: [{
                productId: product._id,
                name: product.title,
                quantity,
                price: product.price,
                bagWeight: product.bagWeight,
                subtotal: itemsTotal
            }],
            pricing: {
                itemsTotal,
                adminCommission,
                gstAmount,
                platformFee,
                vendorBalance,
                orderTotal
            },
            shippingAddress,
            deliveryOtp: Math.floor(1000 + Math.random() * 9000).toString(),
            paymentMethod: paymentMethod || 'wallet',
            paymentType: paymentType || 'split'
        });

        if (order.paymentType === 'cod') {
            order.deliveryStatus = 'ordered'; // Direct to vendor
            order.paymentMethod = 'cash';
            await order.save();
            
            // Reduce Stock
            await Product.findByIdAndUpdate(product._id, { $inc: { stock: -quantity } });

            // Notify Vendor
            try {
                await createNotification({
                    recipientId: order.vendorId,
                    recipientModel: 'Vendor',
                    title: 'New COD Store Order!',
                    message: `You received a COD order for ${order.items[0].name}. Please pack it for shipping.`,
                    type: 'ecommerce_order',
                    metadata: { orderId: order._id }
                });
            } catch (nErr) { console.error('Push notification error:', nErr); }

            return res.status(201).json({ 
                success: true, 
                data: order, 
                message: 'COD Order placed successfully.',
                paymentType: 'cod'
            });
        }

        await order.save();
        res.status(201).json({ 
            success: true, 
            data: order, 
            message: order.paymentType === 'online_full' ? 'Order created. Please pay full amount to confirm.' : 'Order created. Please pay Platform Fee to confirm.',
            amountToPay: order.paymentType === 'online_full' ? order.pricing.orderTotal : order.pricing.platformFee,
            paymentType: order.paymentType
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * User: Create Razorpay Order for Platform Fee
 */
const createPaymentOrder = async (req, res) => {
    try {
        const order = await EcommerceOrder.findById(req.params.id);
        if (!order || order.paymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'Order already paid or not found' });
        }

        const amountToPay = order.paymentType === 'online_full' ? order.pricing.orderTotal : order.pricing.platformFee;

        // Create Razorpay order
        const razorpayOrder = await createOrder(
            amountToPay,
            'INR',
            `eco_${order._id.toString().substring(0, 8)}`,
            {
                orderId: order._id.toString(),
                type: 'ecommerce_platform_fee'
            }
        );

        if (!razorpayOrder.success) {
            return res.status(500).json({ success: false, message: razorpayOrder.error || 'Failed to create payment order' });
        }

        res.status(200).json({
            success: true,
            data: {
                order_id: razorpayOrder.orderId,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
                key: process.env.RAZORPAY_KEY_ID
            }
        });
    } catch (error) {
        console.error('Create Ecommerce Payment Order error:', error);
        res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }
};

/**
 * User: Verify Razorpay Payment for Platform Fee
 */
const payPlatformFee = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const order = await EcommerceOrder.findById(req.params.id);
        
        if (!order || order.paymentStatus === 'paid') {
            return res.status(400).json({ success: false, message: 'Order already paid or not found' });
        }

        const amountToPay = order.paymentType === 'online_full' ? order.pricing.orderTotal : order.pricing.platformFee;

        if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
             // Verify Razorpay signature
             const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
             if (!isValid) {
                 return res.status(400).json({ success: false, message: 'Payment verification failed' });
             }

             // Record Transaction
             const transaction = new Transaction({
                 userId: req.user._id,
                 type: order.paymentType === 'online_full' ? 'ecommerce_full_payment' : 'platform_fee',
                 amount: amountToPay,
                 status: 'completed',
                 paymentMethod: 'razorpay',
                 referenceId: razorpay_payment_id,
                 description: order.paymentType === 'online_full' ? `Full payment for Ecommerce Order: ${order._id.toString().slice(-8)}` : `Platform fee (Comm+GST) for Ecommerce Order: ${order._id.toString().slice(-8)}`,
                 metadata: { 
                    orderId: order._id, 
                    razorpay_order_id,
                    razorpay_payment_id,
                 }
             });
             await transaction.save();

             if (order.paymentType === 'online_full') {
                 // Credit vendor wallet
                 const Vendor = require('../../models/Vendor');
                 const vendor = await Vendor.findById(order.vendorId);
                 if (vendor) {
                     const currentEarnings = vendor.wallet?.earnings || 0;
                     const updateQuery = {
                         $inc: { 'wallet.earnings': order.pricing.vendorBalance }
                     };
                     await Vendor.findByIdAndUpdate(vendor._id, updateQuery);

                     // Record earning transaction
                     await Transaction.create({
                         vendorId: vendor._id,
                         bookingId: null, // No booking for ecommerce
                         type: 'earnings_credit',
                         amount: order.pricing.vendorBalance,
                         status: 'completed',
                         paymentMethod: 'system',
                         description: `Earnings credited for Prepaid Ecommerce Order: ${order._id.toString().slice(-8)}`,
                         metadata: {
                             type: 'earnings_increase',
                             orderId: order._id.toString()
                         }
                     });
                 }
             }

             // Update Order
             order.paymentStatus = 'paid';
             order.deliveryStatus = 'ordered'; 
             order.adminTransactionId = transaction._id;
             await order.save();

             // Reduce Stock
             for (const item of order.items) {
                 await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
             }

             // Notify Vendor
             try {
                 await createNotification({
                     recipientId: order.vendorId,
                     recipientModel: 'Vendor',
                     title: 'New Store Order!',
                     message: `You received a new ${order.paymentType === 'online_full' ? 'PREPAID ' : ''}order for ${order.items[0].name}. Please pack it for shipping.`,
                     type: 'ecommerce_order',
                     metadata: { orderId: order._id }
                 });
             } catch (nErr) { console.error('Push notification error:', nErr); }

             return res.status(200).json({ 
                 success: true, 
                 message: order.paymentType === 'online_full' ? 'Order confirmed! Full payment received.' : 'Order confirmed! Platform fee paid via Razorpay.', 
                 data: order 
             });
        } 
        
        // Fallback for wallet (Optional, but Razorpay requested)
        const user = await User.findById(req.user._id);
        if (user.wallet.balance < amountToPay) {
            return res.status(400).json({ 
                success: false, 
                message: 'Insufficient balance in wallet',
                needsOnlinePayment: true 
            });
        }

        user.wallet.balance -= amountToPay;
        await user.save();

        const transaction = new Transaction({
            userId: user._id,
            type: order.paymentType === 'online_full' ? 'ecommerce_full_payment' : 'platform_fee',
            amount: amountToPay,
            status: 'completed',
            paymentMethod: 'wallet',
            description: order.paymentType === 'online_full' ? `Full payment for Ecommerce Order: ${order._id.toString().slice(-8)}` : `Platform fee (Comm+GST) for Ecommerce Order: ${order._id.toString().slice(-8)}`,
            metadata: { orderId: order._id }
        });
        await transaction.save();

        if (order.paymentType === 'online_full') {
            // Credit vendor wallet
            const Vendor = require('../../models/Vendor');
            const vendor = await Vendor.findById(order.vendorId);
            if (vendor) {
                const updateQuery = {
                    $inc: { 'wallet.earnings': order.pricing.vendorBalance }
                };
                await Vendor.findByIdAndUpdate(vendor._id, updateQuery);

                await Transaction.create({
                    vendorId: vendor._id,
                    type: 'earnings_credit',
                    amount: order.pricing.vendorBalance,
                    status: 'completed',
                    paymentMethod: 'system',
                    description: `Earnings credited for Prepaid Ecommerce Order: ${order._id.toString().slice(-8)}`,
                    metadata: { type: 'earnings_increase', orderId: order._id.toString() }
                });
            }
        }

        order.paymentStatus = 'paid';
        order.deliveryStatus = 'ordered';
        order.adminTransactionId = transaction._id;
        await order.save();

        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
        }

        // Notify Vendor
        try {
            await createNotification({
                recipientId: order.vendorId,
                recipientModel: 'Vendor',
                title: 'New Store Order!',
                message: `You received a new ${order.paymentType === 'online_full' ? 'PREPAID ' : ''}order for ${order.items[0].name}. Please pack it for shipping.`,
                type: 'ecommerce_order',
                metadata: { orderId: order._id }
            });
        } catch (nErr) { console.error('Push notification error:', nErr); }

        res.status(200).json({ 
            success: true, 
            message: order.paymentType === 'online_full' ? 'Order confirmed! Full payment paid from wallet.' : 'Order confirmed! Platform fee paid from wallet.', 
            data: order 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const orders = await EcommerceOrder.find({ userId: req.user._id })
            .populate('vendorId', 'businessName phone')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        console.error('[GetMyOrders Error]:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch orders: ' + error.message });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await EcommerceOrder.findById(req.params.id)
            .populate('vendorId', 'businessName phone');
        if (!order || order.userId.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        res.status(200).json({ success: true, data: order });
    } catch (error) {
        console.error('[GetOrderById Error]:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch order: ' + error.message });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.user._id;

        const order = await EcommerceOrder.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

        if (order.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const nonCancellable = ['shipped', 'delivered', 'cancelled'];
        if (nonCancellable.includes(order.deliveryStatus)) {
            return res.status(400).json({ success: false, message: `Cannot cancel order in ${order.deliveryStatus} status` });
        }

        const oldStatus = order.deliveryStatus;
        order.deliveryStatus = 'cancelled';
        
        // If it was already paid, refund the platform fee to the user's wallet
        if (order.paymentStatus === 'paid') {
            const user = await User.findById(userId);
            const refundAmount = order.pricing.platformFee;
            
            user.wallet.balance += refundAmount;
            await user.save();

            const transaction = new Transaction({
                userId: user._id,
                type: 'refund',
                amount: refundAmount,
                status: 'completed',
                paymentMethod: 'system',
                description: `Refund for Cancelled Ecommerce Order: ${order._id.toString().slice(-8)}`,
                metadata: { orderId: order._id, reason: 'user_cancelled' }
            });
            await transaction.save();

            // Return items to stock
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
            }
        }

        await order.save();
        res.status(200).json({ success: true, message: 'Order cancelled successfully', data: order });
    } catch (error) {
        console.error('Cancel Order Error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel order: ' + error.message });
    }
};

module.exports = {
    getApprovedProducts,
    getProductDetails,
    placeOrder,
    createPaymentOrder,
    payPlatformFee,
    getMyOrders,
    getOrderById,
    cancelOrder
};
