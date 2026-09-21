import api from '../../../services/api';

const ecommerceService = {
  // Get all approved products — Backend: GET /user/ecommerce/marketplace
  getMarketplaceProducts: async () => {
    const response = await api.get('/user/ecommerce/marketplace');
    return response.data;
  },

  // Get product details with price break-up — Backend: GET /user/ecommerce/products/:id
  getProductDetails: async (id) => {
    const response = await api.get(`/user/ecommerce/products/${id}`);
    return response.data;
  },

  // Place initial order — Backend: POST /user/ecommerce/orders
  placeOrder: async (orderData) => {
    const response = await api.post('/user/ecommerce/orders', orderData);
    return response.data;
  },

  // Get all user orders — Backend: GET /user/ecommerce/my-orders
  getMyOrders: async () => {
    const response = await api.get('/user/ecommerce/my-orders');
    return response.data;
  },

  // Get order by id — Backend: GET /user/ecommerce/orders/:id  (not separately defined, use my-orders)
  getOrderById: async (id) => {
    const response = await api.get(`/user/ecommerce/orders/${id}`);
    return response.data;
  },

  // Pay platform fee to confirm order — Backend: POST /user/ecommerce/orders/:id/pay-platform-fee
  payPlatformFee: async (orderId) => {
    const response = await api.post(`/user/ecommerce/orders/${orderId}/pay-platform-fee`, {});
    return response.data;
  }
};

export default ecommerceService;
