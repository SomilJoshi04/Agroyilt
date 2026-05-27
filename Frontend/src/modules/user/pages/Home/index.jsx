import React, { useState, useEffect, useLayoutEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import SearchBar from './components/SearchBar';
import ServiceCategories from './components/ServiceCategories';
import { publicCatalogService } from '../../../../services/catalogService';
import { useCart } from '../../../../context/CartContext';
import { useCity } from '../../../../context/CityContext';
import { toast } from 'react-hot-toast';
import { registerFCMToken } from '../../../../services/pushNotificationService';
import { motion } from 'framer-motion';

import { userAuthService } from '../../../../services/authService';
// Lazy load heavy components for better initial load performance
import PromoCarousel from './components/PromoCarousel';
// Lazy load OTHER heavy components
const NewAndNoteworthy = lazy(() => import('./components/NewAndNoteworthy'));
const MostBookedServices = lazy(() => import('./components/MostBookedServices'));
const CuratedServices = lazy(() => import('./components/CuratedServices'));
const ServiceSectionWithRating = lazy(() => import('./components/ServiceSectionWithRating'));
const Banner = lazy(() => import('./components/Banner'));
const ReferEarnSection = lazy(() => import('./components/ReferEarnSection'));
import CategoryModal from './components/CategoryModal';
import SearchOverlay from './components/SearchOverlay';
import WeatherWidget from './components/WeatherWidget';
import AgriMarketplaceSection from './components/AgriMarketplaceSection';
import MachineryDiscoverySection from './components/MachineryDiscoverySection';
import LogoLoader from '../../../../components/common/LogoLoader';
import AddressSelectionModal from '../Checkout/components/AddressSelectionModal';



const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [address, setAddress] = useState(localStorage.getItem('currentAddress') || 'Select Location');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [houseNumber, setHouseNumber] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLocationSupported, setIsLocationSupported] = useState(true);
  const [detectedCityName, setDetectedCityName] = useState(localStorage.getItem('currentCity') || null);


  const { cartCount, addToCart } = useCart();
  const { currentCity, cities, selectCity, loading: cityLoading } = useCity();

  // Clean up legacy storage keys on mount
  useEffect(() => {
    ['userAddress', 'detectedCity', 'user_formatted_address', 'user_city'].forEach(key => localStorage.removeItem(key));
  }, []);

  // Sync detectedCityName with Address on mount/update if not already set
  useEffect(() => {
    if (address && address !== 'Select Location' && cities && cities.length > 0) {
      const foundCity = cities.find(c =>
        address.toLowerCase().includes(c.name.toLowerCase())
      );
      if (foundCity) {
        if (detectedCityName !== foundCity.name) {
          setDetectedCityName(foundCity.name);
          localStorage.setItem('currentCity', foundCity.name);
        }
      } else {
        // Address is present but doesn't contain any supported city name
        // Try to parse ANY city from the address string (e.g. "Bhopal")
        const parts = address.split(',').map(p => p.trim());
        // Usually city is 2nd or 3rd to last in Google address strings
        const cityCandidate = parts.length > 2 ? parts[parts.length - 3] : (parts.length > 1 ? parts[parts.length - 2] : parts[0]);

        if (detectedCityName !== cityCandidate) {
          setDetectedCityName(cityCandidate);
          localStorage.setItem('currentCity', cityCandidate);
        }
        setIsLocationSupported(false);
      }
    }
  }, [address, cities, detectedCityName]);

  // Validate city whenever detected name or cities list changes
  useEffect(() => {
    if (!detectedCityName || !cities || cities.length === 0) return;

    const matchedCity = cities.find(c =>
      c.name.toLowerCase() === detectedCityName.toLowerCase() ||
      c.name.toLowerCase().includes(detectedCityName.toLowerCase()) ||
      detectedCityName.toLowerCase().includes(c.name.toLowerCase())
    );

    if (matchedCity) {
      setIsLocationSupported(true);
      const matchedId = matchedCity._id || matchedCity.id;
      const currentId = currentCity?._id || currentCity?.id;

      if (!cityLoading && currentId && matchedId !== currentId) {
        selectCity(matchedCity);
        toast.success(`Location updated to ${matchedCity.name}`);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } else {
      setIsLocationSupported(false);
      if (currentCity) selectCity(null);
    }
  }, [detectedCityName, cities, currentCity, cityLoading]);


  const handleAddressSave = (savedHouseNumber, locationObj) => {
    if (locationObj) {
      const newAddress = locationObj.address;
      setAddress(newAddress);
      localStorage.setItem('currentAddress', newAddress);

      // Try to parse city from location object (Google Places)
      const components = locationObj.components || locationObj.address_components;
      let city = '';
      if (components) {
        const getComponent = (type) => components.find(c => c.types.includes(type))?.long_name || '';
        city = getComponent('locality') || getComponent('administrative_area_level_2');
      }

      // Fallback city parsing from address string if components failed
      if (!city && newAddress) {
        const parts = newAddress.split(',').map(p => p.trim());
        city = parts.length > 2 ? parts[parts.length - 3] : (parts.length > 1 ? parts[parts.length - 2] : parts[0]);
      }

      if (city) {
        setDetectedCityName(city);
        localStorage.setItem('currentCity', city);

        // Sync location with profile for Weather Notifications
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken && locationObj.lat && locationObj.lng) {
          userAuthService.updateProfile({
            addresses: [{
              addressLine1: newAddress,
              city: city,
              lat: locationObj.lat,
              lng: locationObj.lng,
              isDefault: true
            }]
          }).catch(err => console.log('Manual location sync failed', err));
        }

        // Immediate update of selected city if supported
        if (cities && cities.length > 0) {
          const matchedCity = cities.find(c =>
            c.name.toLowerCase() === city.toLowerCase() ||
            c.name.toLowerCase().includes(city.toLowerCase()) ||
            city.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchedCity) {
            selectCity(matchedCity);
          } else {
            selectCity(null);
          }
        }

        toast.success(`Location set to ${city}`);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
    setHouseNumber(savedHouseNumber);
    setIsAddressModalOpen(false);
  };

  // Auto-detect location on mount
  useEffect(() => {
    const autoDetectLocation = async () => {
      if (navigator.geolocation) {
        if (address === 'Select Location') {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const { latitude, longitude } = position.coords;
                const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                const response = await fetch(
                  `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
                );
                const data = await response.json();

                if (data.status === 'OK' && data.results.length > 0) {
                  const result = data.results[0];
                  const getComponent = (type) =>
                    result.address_components.find(c => c.types.includes(type))?.long_name || '';

                  const area = getComponent('sublocality_level_1') || getComponent('neighborhood') || getComponent('locality');
                  const city = getComponent('locality') || getComponent('administrative_area_level_2');
                  const state = getComponent('administrative_area_level_1');

                  const formattedAddress = `${area}, ${city}, ${state}`;
                  setAddress(formattedAddress);
                  localStorage.setItem('currentAddress', formattedAddress);

                  if (city) {
                    setDetectedCityName(city);
                    localStorage.setItem('currentCity', city);

                    // Sync location with profile for Weather Notifications
                    const accessToken = localStorage.getItem('accessToken');
                    if (accessToken) {
                      userAuthService.updateProfile({
                        addresses: [{
                          addressLine1: formattedAddress,
                          city: city,
                          state: state,
                          lat: latitude,
                          lng: longitude,
                          isDefault: true
                        }]
                      }).catch(err => console.log('Location sync failed', err));
                    }

                    // Immediate update of selected city if supported
                    if (cities && cities.length > 0) {
                      const matchedCity = cities.find(c =>
                        c.name.toLowerCase() === city.toLowerCase() ||
                        c.name.toLowerCase().includes(city.toLowerCase()) ||
                        city.toLowerCase().includes(c.name.toLowerCase())
                      );
                      if (matchedCity) {
                        selectCity(matchedCity);
                      } else {
                        selectCity(null);
                      }
                    }
                  }
                }
              } catch (error) {
                // Silent fail
              }
            },
            (error) => {
              console.log("GPS Error:", error);
            },
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            }
          );
        }
      }
    };

    autoDetectLocation();

    // Register FCM token for user to receive push notifications
    registerFCMToken('user', true).catch(err => {/* Silent fail */ });
  }, []);

  const [categories, setCategories] = useState([]);
  const [homeContent, setHomeContent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Handle scroll separately (only when needed)
  useEffect(() => {
    if (location.state?.scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.state?.scrollToTop, location.pathname]);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Fetch categories and home content on mount (and when city changes)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const cityId = currentCity?._id || currentCity?.id;

        const [categoriesRes, homeContentRes] = await Promise.all([
          publicCatalogService.getCategories(cityId),
          publicCatalogService.getHomeContent(cityId)
        ]);

        let hasData = false;

        if (categoriesRes.success) {
          const mappedCategories = categoriesRes.categories.map(cat => ({
            id: cat.id,
            title: cat.title,
            slug: cat.slug,
            icon: toAssetUrl(cat.icon),
            hasSaleBadge: cat.hasSaleBadge,
            badge: cat.badge,
            requiresDriver: cat.requiresDriver
          }));
          setCategories(mappedCategories);
          if (mappedCategories.length > 0) hasData = true;
        }

        if (homeContentRes.success) {
          setHomeContent(homeContentRes.homeContent);
          if (homeContentRes.homeContent) hasData = true;
        }

        if (!hasData && categoriesRes.categories?.length === 0 && !homeContentRes.homeContent) {
          // If no data, maybe we should still stop loading?
        }

        setLoading(false);
      } catch (error) {
        // Silent fail
        setLoading(false);
      }
    };

    fetchData();
  }, [currentCity]);
  // Open category modal from navigation state (e.g. from Cart 'Add Services')
  useEffect(() => {
    if (!loading && categories.length > 0 && (location.state?.openCategoryId || location.state?.openCategoryName)) {
      const targetId = location.state.openCategoryId;
      const targetName = location.state.openCategoryName;

      const cat = categories.find(c =>
        (targetId && (c.id === targetId || c._id === targetId)) ||
        (targetName && c.title === targetName)
      );

      if (cat) {
        handleCategoryClick(cat);
        // Clear state to prevent reopening on subsequent renders/refreshes
        window.history.replaceState({}, '', location.pathname);
      }
    }
  }, [loading, categories, location.state]);

  const handleSearch = (query) => {
    // Navigate to search results page
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handlePromoClick = (promo) => {
    if (promo.targetCategoryId) {
      const cat = categories.find(c => (c.id === promo.targetCategoryId || c._id === promo.targetCategoryId));
      if (cat) {
        handleCategoryClick(cat);
        return;
      }
    }
    if (promo.slug) {
      navigate(`/user/${promo.slug}`);
      return;
    }
    if (promo.route && !promo.slug) {
      if (promo.scrollToSection) {
        navigate(promo.route, {
          state: { scrollToSection: promo.scrollToSection }
        });
      } else {
        navigate(promo.route);
      }
    }
  };

  const handleServiceClick = (service) => {
    if (!service) return;
    if (service.targetCategoryId) {
      const cat = categories.find(c => (c.id === service.targetCategoryId || c._id === service.targetCategoryId));
      if (cat) {
        handleCategoryClick(cat);
        return;
      }
    }
    // Fallback if no targetCategoryId but has slug/title, we no longer navigate to slug
  };

  const handleAddClick = async (service) => {
    try {
      if (service.targetCategoryId) {
        const cat = categories.find(c => c.id === service.targetCategoryId);
        if (cat) {
          handleCategoryClick(cat);
          return;
        }
      }

      if (service.serviceId && service.categoryId) {
        const cartItemData = {
          serviceId: service.serviceId,
          categoryId: service.categoryId,
          title: service.title,
          description: service.subtitle || service.description || '',
          icon: service.image || '',
          category: service.category || 'Equipment',
          price: parseInt(service.price?.toString().replace(/,/g, '') || 0),
          originalPrice: service.originalPrice ? parseInt(service.originalPrice.toString().replace(/,/g, '')) : null,
          unitPrice: parseInt(service.price?.toString().replace(/,/g, '') || 0),
          serviceCount: 1,
          rating: service.rating || "4.8",
          reviews: service.reviews || "10k+",
          vendorId: service.vendorId || null,
          sectionId: service.sectionId || null // VITAL: Added for plan benefits
        };

        const response = await addToCart(cartItemData);
        if (response.success) {
          toast.success(`${service.title} added to cart!`);
          navigate('/user/cart');
        } else {
          toast.error(response.message || 'Failed to add to cart');
        }
      } else {
        if (service.targetCategoryId) {
          const cat = categories.find(c => (c.id === service.targetCategoryId || c._id === service.targetCategoryId));
          if (cat) {
            handleCategoryClick(cat);
          } else {
            toast.error('Unable to add this item to cart.');
          }
        } else {
          toast.error('Unable to add this item to cart.');
        }
      }
    } catch (error) {
      toast.error('Failed to add to cart. Please try again.');
    }
  };

  const handleReferClick = () => {
    navigate('/user/rewards');
  };

  const handleLocationClick = () => {
    setIsAddressModalOpen(true);
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  if (loading) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen pb-20 relative" style={{ backgroundColor: '#F1F8E9' }}>
      {/* Refined Brand Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(at 0% 0%, ${themeColors?.brand?.teal || '#347989'}25 0%, transparent 70%),
              radial-gradient(at 100% 0%, ${themeColors?.brand?.yellow || '#D68F35'}20 0%, transparent 70%),
              radial-gradient(at 100% 100%, ${themeColors?.brand?.orange || '#BB5F36'}15 0%, transparent 75%),
              radial-gradient(at 0% 100%, ${themeColors?.brand?.teal || '#347989'}10 0%, transparent 70%),
              radial-gradient(at 50% 50%, ${themeColors?.brand?.teal || '#347989'}03 0%, transparent 100%),
              #F1F8E9
            `
          }}
        />
        {/* Elegant Dot Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(${themeColors?.brand?.teal || '#347989'} 0.8px, transparent 0.8px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      <motion.div
        className="relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div
          variants={itemVariants}
          className="backdrop-blur-xl sticky top-0 z-50 border-b border-black/[0.03] rounded-b-[24px] shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-300"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}
        >
          <Header
            location={address}
            onLocationClick={handleLocationClick}
          />
          <div className="px-5 pb-5 pt-1 max-w-lg mx-auto w-full">
            <SearchBar onInputClick={() => setIsSearchOpen(true)} />
          </div>
        </motion.div>

        <main className="pt-6 space-y-8 pb-24 max-w-screen-xl mx-auto w-full">
          {!isLocationSupported && (
            <div
              className="flex items-center justify-between gap-3 py-2.5 px-4 mx-4 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)'
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,146,60,0.18)', border: '1px solid rgba(251,146,60,0.35)' }}>
                  <span className="text-sm">📍</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-black text-white leading-tight" style={{ letterSpacing: '0.01em' }}>
                    Service not available in your city
                  </p>
                  <p className="text-[9.5px] font-semibold leading-tight" style={{ color: 'rgba(251,146,60,0.75)' }}>
                    Showing All-India default catalog
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #f97316, #ea580c)',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(249,115,22,0.45)'
                }}
              >
                Change
              </button>
            </div>
          )}

          <>
            {/* Hero Section - Promo Carousel (Includes Banners and Promos) */}
            {(homeContent?.isPromosVisible !== false || homeContent?.isBannersVisible !== false) && (
                <motion.section variants={itemVariants} className="relative z-0">
                  <PromoCarousel
                    promos={[
                      ...(homeContent?.banners || []).map(b => ({
                        id: b.id || b._id,
                        title: b.text || '',
                        subtitle: '',
                        buttonText: '',
                        image: toAssetUrl(b.imageUrl),
                        targetCategoryId: b.targetCategoryId,
                        slug: b.slug,
                        order: b.order || 0,
                        route: '/'
                      })),
                      ...(homeContent?.promos || []).map(promo => ({
                        id: promo.id || promo._id,
                        title: promo.title || '',
                        subtitle: promo.subtitle || promo.description || '',
                        buttonText: promo.buttonText || 'Book now',
                        className: promo.gradientClass || 'from-[#00A6A6] to-[#008a8a]',
                        image: toAssetUrl(promo.imageUrl),
                        targetCategoryId: promo.targetCategoryId,
                        slug: promo.slug,
                        scrollToSection: promo.scrollToSection,
                        order: promo.order || 0,
                        route: '/'
                      }))
                    ].sort((a, b) => (a.order || 0) - (b.order || 0))}
                    onPromoClick={handlePromoClick}
                  />
                </motion.section>
              )}

              {/* Quick Agri Actions (PhonePe Style) */}
              <motion.section variants={itemVariants} className="px-6 py-2">
                <div className="flex justify-between items-start">
                  
                  {/* Weather Button */}
                  <WeatherWidget />

                  {/* Soil Testing Button */}
                  <div
                    onClick={() => navigate('/user/soil-testing')}
                    className="flex flex-col items-center cursor-pointer active:scale-95 transition-all group w-[70px]"
                  >
                    <div className="relative">
                      <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center bg-gradient-to-tr from-[#1A73E8] to-[#4285F4] shadow-md group-hover:shadow-lg group-hover:shadow-[#1A73E8]/30 transition-all border border-white/20">
                         <div className="absolute inset-0 bg-white/10 rounded-full" />
                         <svg className="w-7 h-7 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.673.337a4 4 0 01-2.506.326l-1.623-.27a2 2 0 00-1.182.15l-1.615.807a2 2 0 01-2.342-.308l-.337-.337a2 2 0 00-2.828 0l-.337.337a2 2 0 01-2.342.308l-1.615-.807a2 2 0 00-1.182-.15l-1.623.27a4 4 0 01-2.506-.326l-.673-.337a6 6 0 00-3.86-.517l-2.387.477a2 2 0 00-1.022.547l-.955 3.185a1 1 0 00.957 1.287h15.756a1 1 0 00.957-1.287l-.955-3.185z" />
                         </svg>
                      </div>
                    </div>
                    <div className="text-center mt-2 w-full">
                      <p className="text-[10px] font-black text-slate-800 leading-tight uppercase tracking-tight truncate">Soil Test</p>
                      <p className="text-[8px] font-bold text-slate-400 truncate">Lab Reports</p>
                    </div>
                  </div>

                  {/* Agri Marketplace Shortcut */}
                  <div
                    onClick={() => navigate('/user/agri-marketplace')}
                    className="flex flex-col items-center cursor-pointer active:scale-95 transition-all group w-[70px]"
                  >
                    <div className="relative">
                      <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center bg-gradient-to-tr from-[#D68F35] to-[#FCA311] shadow-md group-hover:shadow-lg group-hover:shadow-[#D68F35]/30 transition-all border border-white/20">
                         <div className="absolute inset-0 bg-white/10 rounded-full" />
                         <svg className="w-7 h-7 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                         </svg>
                      </div>
                    </div>
                    <div className="text-center mt-2 w-full">
                      <p className="text-[10px] font-black text-slate-800 leading-tight uppercase tracking-tight truncate">Market</p>
                      <p className="text-[8px] font-bold text-slate-400 truncate">Buy Needs</p>
                    </div>
                  </div>



                </div>
              </motion.section>


              {/* Categories Section - Split into Driver Based and Farming Equipment */}
              {homeContent?.isCategoriesVisible !== false && (
                <>
                  {/* Section 1: Driver Based Equipment */}
                  {categories.some(c => c.requiresDriver) && (
                    <motion.section variants={itemVariants} className="relative overflow-hidden pt-2 mb-4">
                      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-transparent pointer-events-none -z-10" />
                      <ServiceCategories
                        title="Driver Based Equipment"
                        subtitle="MACHINERY WITH PROFESSIONAL OPERATORS"
                        categories={categories.filter(c => c.requiresDriver)}
                        onCategoryClick={handleCategoryClick}
                        onSeeAllClick={() => { }}
                      />
                    </motion.section>
                  )}

                  {/* Section 2: Farming Equipment (Without Driver) */}
                  {categories.some(c => !c.requiresDriver) && (
                    <motion.section variants={itemVariants} className="relative overflow-hidden pt-2">
                      <div className="absolute inset-0 bg-gradient-to-b from-green-50/30 to-transparent pointer-events-none -z-10" />
                      <ServiceCategories
                        title="Farming Equipment"
                        subtitle="SELF-OPERATED TOOLS & IMPLEMENTS"
                        categories={categories.filter(c => !c.requiresDriver)}
                        onCategoryClick={handleCategoryClick}
                        onSeeAllClick={() => { }}
                      />
                    </motion.section>
                  )}
                </>
              )}

              {/* Curated Services */}
              {homeContent?.isCuratedVisible !== false && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <CuratedServices
                      services={(homeContent?.curated || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => ({
                        id: item.id || item._id,
                        title: item.title,
                        gif: toAssetUrl(item.gifUrl),
                        slug: item.slug,
                        targetCategoryId: item.targetCategoryId
                      }))}
                      onServiceClick={handleServiceClick}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* New & Noteworthy */}
              {homeContent?.isNoteworthyVisible !== false && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <NewAndNoteworthy
                      services={(homeContent?.noteworthy || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => ({
                        id: item.id || item._id,
                        title: item.title,
                        image: toAssetUrl(item.imageUrl),
                        slug: item.slug,
                        targetCategoryId: item.targetCategoryId
                      }))}
                      onServiceClick={handleServiceClick}
                    />
                  </Suspense>
                </motion.div>
              )}

              {/* Most Booked */}
              {homeContent?.isBookedVisible !== false && (
                <motion.div variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <MostBookedServices
                      services={(homeContent?.booked || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map(item => ({
                        id: item.id || item._id,
                        title: item.title,
                        rating: item.rating,
                        reviews: item.reviews,
                        price: item.price,
                        originalPrice: item.originalPrice,
                        discount: item.discount,
                        image: toAssetUrl(item.imageUrl),
                        targetCategoryId: item.targetCategoryId,
                        slug: item.slug
                      }))}
                      onServiceClick={handleServiceClick}
                      onAddClick={handleAddClick}
                    />
                  </Suspense>
                </motion.div>
              )}


              {/* Machinery Discovery Section */}
              <motion.div variants={itemVariants}>
                <MachineryDiscoverySection />
              </motion.div>

              {/* Agriculture Marketplace */}
              <motion.div variants={itemVariants}>
                <AgriMarketplaceSection />
              </motion.div>

              {/* Dynamic Sections */}
              {homeContent?.isCategorySectionsVisible !== false && (homeContent?.categorySections || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map((section, sIdx) => (
                <motion.div key={section._id || sIdx} variants={itemVariants}>
                  <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                    <ServiceSectionWithRating
                      title={section.title}
                      subtitle={section.subtitle}
                      services={section.cards?.map((card, cIdx) => {
                        const processedImage = toAssetUrl(card.imageUrl);
                        return {
                          id: card._id || cIdx,
                          title: card.title,
                          rating: card.rating || "4.8",
                          reviews: card.reviews || "10k+",
                          price: card.price,
                          originalPrice: card.originalPrice,
                          discount: card.discount,
                          image: processedImage,
                          targetCategoryId: card.targetCategoryId,
                          slug: card.slug
                        };
                      }) || []}
                      onSeeAllClick={() => {
                        if (section.seeAllTargetCategoryId) {
                          const cat = categories.find(c => (c.id === section.seeAllTargetCategoryId || c._id === section.seeAllTargetCategoryId));
                          if (cat) handleCategoryClick(cat);
                        }
                      }}
                      onServiceClick={(service) => handleServiceClick(service)}
                      onAddClick={handleAddClick}
                    />
                  </Suspense>
                </motion.div>
              ))}

              {/* Refer & Earn Section */}
              <motion.div variants={itemVariants}>
                <Suspense fallback={<div className="h-32 bg-gray-50 animate-pulse rounded-xl mx-4" />}>
                  <ReferEarnSection onReferClick={handleReferClick} />
                </Suspense>
              </motion.div>
            </>
        </main>
      </motion.div>

      {/* Bottom Navigation */}
      {!isAddressModalOpen && <BottomNav />}

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        location={address}
        cartCount={cartCount}
        currentCity={currentCity}
      />

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        categories={categories}
        onCategoryClick={handleCategoryClick}
      />

      {/* Address Selection Modal */}
      <AddressSelectionModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        houseNumber={houseNumber}
        onHouseNumberChange={setHouseNumber}
        onSave={handleAddressSave}
      />


    </div>
  );
};

export default Home;
