import api from './api';

const soilTestService = {
    request: async (data) => {
        const response = await api.post('/user/soil-test/request', data);
        return response.data;
    },
    getMyRequests: async () => {
        const response = await api.get('/user/soil-test/my-requests');
        return response.data;
    },
    payForReport: async (id, paymentMethod) => {
        const response = await api.post(`/user/soil-test/pay/${id}`, { paymentMethod });
        return response.data;
    },
    verifyPayment: async (id, data) => {
        const response = await api.post(`/user/soil-test/verify-payment/${id}`, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await api.put(`/user/soil-test/request/${id}`, data);
        return response.data;
    },
    delete: async (id) => {
        const response = await api.delete(`/user/soil-test/request/${id}`);
        return response.data;
    }
};

export default soilTestService;
