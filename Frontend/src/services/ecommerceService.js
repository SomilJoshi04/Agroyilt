import api from './api';

const ecommerceService = {
    /**
     * Marketplace Browsing
     */
    getProducts: async (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.categoryId) queryParams.append('categoryId', params.categoryId);
        if (params.query) queryParams.append('query', params.query);
        if (params.cityId) queryParams.append('cityId', params.cityId);
        if (params.lat) queryParams.append('lat', params.lat);
        if (params.lng) queryParams.append('lng', params.lng);
        if (params.radius) queryParams.append('radius', params.radius);
        
        const response = await api.get(`/user/ecommerce/marketplace?${queryParams.toString()}`);
        return response.data;
    },

    getProductDetails: async (id) => {
        const response = await api.get(`/user/ecommerce/products/${id}`);
        return response.data;
    },

    /**
     * Ordering & Payment
     */
    placeOrder: async (data) => {
        // data: { productId, quantity, shippingAddress, paymentMethod }
        const response = await api.post('/user/ecommerce/orders', data);
        return response.data;
    },

    createPaymentOrder: async (orderId) => {
        const response = await api.post(`/user/ecommerce/orders/${orderId}/create-payment-order`);
        return response.data;
    },

    payPlatformFee: async (orderId, paymentData = {}) => {
        const response = await api.post(`/user/ecommerce/orders/${orderId}/pay-platform-fee`, paymentData);
        return response.data;
    },

    /**
     * Order Tracking
     */
    getMyOrders: async () => {
        const response = await api.get('/user/ecommerce/my-orders');
        return response.data;
    },

    getOrderById: async (orderId) => {
        const response = await api.get(`/user/ecommerce/orders/${orderId}`);
        return response.data;
    },

    cancelOrder: async (orderId) => {
        const response = await api.post(`/user/ecommerce/orders/${orderId}/cancel`);
        return response.data;
    }
};

export default ecommerceService;
