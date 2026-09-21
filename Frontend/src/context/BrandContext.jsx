import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const BrandContext = createContext();

const DEFAULT_BRANDING = {
  appName: 'AgroYilt',
  appTagline: 'Smart Agriculture Equipment Booking',
  appLogo: '/AgroyiltLogo.png',
  appFavicon: '/AgroyiltLogo.png',
  isLoading: true
};

export const BrandProvider = ({ children }) => {
  const [brandSettings, setBrandSettings] = useState(DEFAULT_BRANDING);

  const fetchBrandSettings = useCallback(async () => {
    try {
      const response = await api.get('/public/config');
      if (response.data && response.data.success && response.data.settings) {
        const s = response.data.settings;
        setBrandSettings(prev => ({
          ...prev,
          appName: s.appName || 'AgroYilt',
          appTagline: s.appTagline || 'Smart Agriculture Equipment Booking',
          appLogo: s.appLogo || '/AgroyiltLogo.png',
          appFavicon: s.appFavicon || s.appLogo || '/AgroyiltLogo.png',
          isLoading: false
        }));
      }
    } catch (error) {
      console.error('[BrandContext] Error fetching brand settings:', error);
      setBrandSettings(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchBrandSettings();
  }, [fetchBrandSettings]);

  // Real-time synchronization via BroadcastChannel & Custom Events (from Socket/Admin)
  useEffect(() => {
    const handleBrandingUpdate = (e) => {
      const data = e.detail;
      if (data) {
        setBrandSettings(prev => ({
          ...prev,
          appName: data.appName || prev.appName,
          appTagline: data.appTagline || prev.appTagline,
          appLogo: data.appLogo || prev.appLogo,
          appFavicon: data.appFavicon || data.appLogo || prev.appFavicon,
          isLoading: false
        }));
      }
    };

    window.addEventListener('brandingUpdated', handleBrandingUpdate);

    // BroadcastChannel for cross-tab synchronization
    let bc;
    try {
      bc = new BroadcastChannel('agroyilt_branding');
      bc.onmessage = (event) => {
        if (event.data?.type === 'BRANDING_UPDATED' && event.data?.data) {
          handleBrandingUpdate({ detail: event.data.data });
        }
      };
    } catch (err) {
      // BroadcastChannel not supported in older browser environments
    }

    return () => {
      window.removeEventListener('brandingUpdated', handleBrandingUpdate);
      if (bc) bc.close();
    };
  }, []);

  // Update DOM elements: favicon, apple-touch-icon, og:image, twitter:image, title, JSON-LD
  useEffect(() => {
    if (brandSettings.isLoading) return;

    const logoUrl = brandSettings.appLogo || '/AgroyiltLogo.png';
    const faviconUrl = brandSettings.appFavicon || logoUrl;

    const toAbsoluteUrl = (url) => {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      const cleanPath = url.startsWith('/') ? url : `/${url}`;
      return `${window.location.origin}${cleanPath}`;
    };

    const fullLogoUrl = toAbsoluteUrl(logoUrl);
    const fullFaviconUrl = toAbsoluteUrl(faviconUrl);

    // 1. Favicon (<link rel="icon">)
    let favicon = document.getElementById('dynamic-favicon') || document.querySelector("link[rel*='icon']");
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.id = 'dynamic-favicon';
      favicon.rel = 'shortcut icon';
      document.head.appendChild(favicon);
    }
    favicon.id = 'dynamic-favicon';
    favicon.href = fullFaviconUrl;

    // 2. Apple Touch Icon (<link rel="apple-touch-icon">)
    let appleIcon = document.getElementById('dynamic-apple-icon') || document.querySelector("link[rel='apple-touch-icon']");
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.id = 'dynamic-apple-icon';
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.id = 'dynamic-apple-icon';
    appleIcon.href = fullLogoUrl;

    // 3. Open Graph Image (<meta property="og:image">)
    let ogImage = document.getElementById('dynamic-og-image') || document.querySelector("meta[property='og:image']");
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.id = 'dynamic-og-image';
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.id = 'dynamic-og-image';
    ogImage.setAttribute('content', fullLogoUrl);

    // 4. Twitter Image (<meta name="twitter:image">)
    let twitterImage = document.getElementById('dynamic-twitter-image') || document.querySelector("meta[name='twitter:image']");
    if (!twitterImage) {
      twitterImage = document.createElement('meta');
      twitterImage.id = 'dynamic-twitter-image';
      twitterImage.setAttribute('name', 'twitter:image');
      document.head.appendChild(twitterImage);
    }
    twitterImage.id = 'dynamic-twitter-image';
    twitterImage.setAttribute('content', fullLogoUrl);

    // 5. App Title & Open Graph Title
    if (brandSettings.appName) {
      let ogTitle = document.getElementById('dynamic-og-title') || document.querySelector("meta[property='og:title']");
      if (!ogTitle) {
        ogTitle = document.createElement('meta');
        ogTitle.id = 'dynamic-og-title';
        ogTitle.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitle);
      }
      ogTitle.id = 'dynamic-og-title';
      ogTitle.setAttribute('content', `${brandSettings.appName} | ${brandSettings.appTagline || 'Modern Farming Solutions'}`);

      // Only set title if on default or landing page
      if (!document.title || document.title.includes('Agroyilt') || document.title.includes('AgroYilt')) {
        document.title = `${brandSettings.appName} | ${brandSettings.appTagline || 'Professional Agriculture Equipment & Farm Solutions'}`;
      }
    }

    // 6. Organization JSON-LD (<script type="application/ld+json">)
    let jsonLdScript = document.getElementById('dynamic-jsonld-org') || document.querySelector('script[type="application/ld+json"]');
    if (jsonLdScript) {
      jsonLdScript.id = 'dynamic-jsonld-org';
      try {
        const schema = JSON.parse(jsonLdScript.textContent);
        if (schema && (schema['@type'] === 'Organization' || schema.name)) {
          schema.name = brandSettings.appName || schema.name;
          schema.logo = fullLogoUrl;
          jsonLdScript.textContent = JSON.stringify(schema, null, 2);
        }
      } catch (e) {
        // Silent fail on malformed JSON
      }
    }
  }, [brandSettings]);

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
      isLoading: false,
      refreshBrandSettings: () => {}
    };
  }
  return context;
};

