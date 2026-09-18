import api from '../../../services/api';

/**
 * Availability Service
 * Manages equipment availability and time-slots
 */
const availabilityService = {
    /**
     * Get available slots for a service and date
     * @param {string} serviceId 
     * @param {string} date (YYYY-MM-DD)
     */
    getAvailableSlots: async (serviceId, date) => {
        const response = await api.get(`/availabilities?serviceId=${serviceId}&date=${date}`);
        return response.data;
    }
};

export default availabilityService;
