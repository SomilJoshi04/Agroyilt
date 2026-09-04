const CropDiagnosisFactory = require('../../providers/cropDiagnosisProvider');

const farmerAgriInfoController = {
  // Get Mandi Prices (Mock)
  getMandiPrices: async (req, res) => {
    try {
      const { state, commodity } = req.query;
      
      // MOCK: This would typically call data.gov.in API
      const mockData = [
        { state: 'Maharashtra', district: 'Pune', market: 'Pune', commodity: 'Wheat', min_price: 2100, max_price: 2400, modal_price: 2250, date: new Date().toISOString().split('T')[0] },
        { state: 'Maharashtra', district: 'Pune', market: 'Pune', commodity: 'Soyabean', min_price: 4500, max_price: 4800, modal_price: 4650, date: new Date().toISOString().split('T')[0] }
      ];

      res.status(200).json({ success: true, data: mockData });
    } catch (error) {
      console.error('Error fetching mandi prices:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Get Weather (Mock)
  getWeather: async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      // MOCK: This would typically call OpenWeatherMap or IMD API
      const mockData = {
        location: { lat, lng },
        current: {
          temp: 28,
          condition: 'Partly Cloudy',
          humidity: 65,
          windSpeed: 12
        },
        forecast: [
          { day: 'Tomorrow', temp: 29, condition: 'Sunny' },
          { day: 'Day After', temp: 26, condition: 'Rain' }
        ]
      };

      res.status(200).json({ success: true, data: mockData });
    } catch (error) {
      console.error('Error fetching weather:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  },

  // Diagnose Crop
  diagnoseCrop: async (req, res) => {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ success: false, message: 'Image URL is required' });
      }

      const provider = CropDiagnosisFactory.getProvider();
      const result = await provider.diagnose(imageUrl);

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('Error diagnosing crop:', error);
      res.status(500).json({ success: false, message: 'Server Error' });
    }
  }
};

module.exports = farmerAgriInfoController;
