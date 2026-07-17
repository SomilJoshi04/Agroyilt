const mongoose = require('mongoose');

const ecommerceCartItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    }
}, { _id: true });

const ecommerceCartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    items: [ecommerceCartItemSchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('EcommerceCart', ecommerceCartSchema);
