import api from './api';

export const ecommerceCartService = {
  // Get user's e-commerce cart
  getCart: async () => {
    const response = await api.get('/user/ecommerce-cart');
    return response.data;
  },

  // Add item to e-commerce cart
  addToCart: async (productId, quantity = 1) => {
    const response = await api.post('/user/ecommerce-cart', { productId, quantity });
    return response.data;
  },

  // Update item quantity in e-commerce cart
  updateItem: async (itemId, quantity) => {
    const response = await api.put(`/user/ecommerce-cart/${itemId}`, { quantity });
    return response.data;
  },

  // Remove item from e-commerce cart
  removeItem: async (itemId) => {
    const response = await api.delete(`/user/ecommerce-cart/${itemId}`);
    return response.data;
  },

  // Clear e-commerce cart
  clearCart: async () => {
    const response = await api.delete('/user/ecommerce-cart');
    return response.data;
  }
};

export default ecommerceCartService;
