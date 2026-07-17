const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/authMiddleware');
const { isUser } = require('../../middleware/roleMiddleware');
const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
} = require('../../controllers/userControllers/ecommerceCartController');

// All routes require user authentication
router.get('/', authenticate, isUser, getCart);
router.post('/', authenticate, isUser, addToCart);
router.put('/:itemId', authenticate, isUser, updateCartItem);
router.delete('/:itemId', authenticate, isUser, removeFromCart);
router.delete('/', authenticate, isUser, clearCart);

module.exports = router;
