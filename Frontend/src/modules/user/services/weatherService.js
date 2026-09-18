import api from '../../../services/api';

/**
 * Weather Service
 * Fetches weather data for the farmer/user
 */
const weatherService = {
    /**
     * Get weather data for lat/lon
     * @param {number} lat 
     * @param {number} lon 
     */
    getWeather: async (lat, lon) => {
        const response = await api.get(`/weather?lat=${lat}&lon=${lon}`);
        return response.data;
    }
};

export default weatherService;
