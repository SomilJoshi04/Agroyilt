import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const BrandContext = createContext();

export const BrandProvider = ({ children }) => {
  const [brandSettings, setBrandSettings] = useState({
    appName: 'AgroYilt',
    appTagline: 'Smart Agriculture Equipment Booking',
    appLogo: '/AgroyiltLogo.png',
    appFavicon: '/AgroyiltLogo.png',
    isLoading: true
  });

  const fetchBrandSettings = async () => {
    try {
      const response = await api.get('/public/config');
      if (response.data && response.data.success && response.data.settings) {
        const s = response.data.settings;
        setBrandSettings(prev => ({
          ...prev,
          appName: s.appName || 'AgroYilt',
          appTagline: s.appTagline || 'Smart Agriculture Equipment Booking',
          appLogo: s.appLogo || '/AgroyiltLogo.png',
          appFavicon: s.appFavicon || '/AgroyiltLogo.png',
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('Error fetching brand settings:', error);
      setBrandSettings(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchBrandSettings();
  }, []);

  // Update favicon dynamically in Chrome tab
  useEffect(() => {
    if (brandSettings.appFavicon) {
      let favicon = document.querySelector("link[rel*='icon']");
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(favicon);
      }
      favicon.href = brandSettings.appFavicon;
    }
  }, [brandSettings.appFavicon]);

  return (
    <BrandContext.Provider value={{ ...brandSettings, refreshBrandSettings: fetchBrandSettings }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    return {
      appName: 'AgroYilt',
      appTagline: 'Smart Agriculture Equipment Booking',
      appLogo: '/AgroyiltLogo.png',
      appFavicon: '/AgroyiltLogo.png',
      refreshBrandSettings: () => {}
    };
  }
  return context;
};
