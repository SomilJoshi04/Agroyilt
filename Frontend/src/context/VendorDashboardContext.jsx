import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { vendorDashboardService } from '../modules/vendor/services/dashboardService';
import maintenanceService from '../modules/vendor/services/maintenanceService';
import { isWithinInterval, parseISO } from 'date-fns';
import { registerFCMToken } from '../services/pushNotificationService';

const VendorDashboardContext = createContext(null);

export const VendorDashboardProvider = ({ children }) => {
  // Helper to load initial cached stats for instant rendering
  const getInitialStats = () => {
    try {
      const cached = localStorage.getItem('vendorDashboardStats');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error('Failed to parse cached stats', e);
    }
    return {
      todayEarnings: 0,
      activeJobs: 0,
      pendingAlerts: 0,
      totalEarnings: 0,
      completedJobs: 0,
      rating: 0,
      complianceAlerts: [],
      machinesInMaintenance: 0,
      ecommerceEarnings: 0
    };
  };

  const getInitialRecentJobs = () => {
    try {
      const cached = localStorage.getItem('vendorDashboardRecentJobs');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error('Failed to parse cached recent jobs', e);
    }
    return [];
  };

  const getInitialProfile = () => {
    try {
      const profile = JSON.parse(localStorage.getItem('vendorData') || '{}');
      return {
        name: profile.name || 'Vendor Name',
        businessName: profile.businessName || 'Business Name',
        photo: profile.profilePhoto || null,
        service: profile.service || []
      };
    } catch (e) {
      return { name: 'Vendor Name', businessName: 'Business Name', photo: null, service: [] };
    }
  };

  // Check if we have enough cached data to skip the initial full-screen loading spinner
  const hasCachedData = !!localStorage.getItem('vendorDashboardStats');

  const [stats, setStats] = useState(getInitialStats);
  const [vendorProfile, setVendorProfile] = useState(getInitialProfile);
  const [recentJobs, setRecentJobs] = useState(getInitialRecentJobs);
  const [pendingBookings, setPendingBookings] = useState([]);
  
  // Start with loading = false if we have cached data for instant UI
  const [loading, setLoading] = useState(!hasCachedData);
  const [error, setError] = useState(null);
  const [activeAlertBookings, setActiveAlertBookings] = useState([]);
  
  const hasLoadedOnceRef = useRef(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(hasCachedData);

  const ignoredBookingIds = useRef(new Set());
  const lastFetchedVendorId = useRef(null);

  // Helper to get current vendor ID
  const getCurrentVendorId = () => {
    try {
      const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
      return String(vendorData._id || vendorData.id || '');
    } catch {
      return '';
    }
  };

  // Process API response - extracted to avoid duplication
  const processApiResponse = useCallback((response) => {
    if (!response.success) return;

    const { stats: apiStats, recentBookings } = response.data;

    // Include all bookings in the recent list, but keep the separate filter for stats if needed
    const requestedBookings = (recentBookings || []).filter(booking => {
      const status = booking.status?.toLowerCase();
      return status === 'requested' || status === 'searching';
    });
    
    // We will show ALL bookings in the recent jobs section
    const allBookings = recentBookings || [];

    // Build pending bookings map
    const mergedMap = new Map();
    const vendorId = getCurrentVendorId();

    requestedBookings.forEach(b => {
      const id = String(b._id || b.id);

      // Find distance for this vendor if available
      let distance = 'N/A';
      if (b.potentialVendors && vendorId) {
        const potentialVendor = b.potentialVendors.find(pv =>
          String(pv.vendorId?._id || pv.vendorId) === vendorId
        );
        if (potentialVendor && potentialVendor.distance) {
          distance = `${potentialVendor.distance.toFixed(1)} km`;
        }
      }

      mergedMap.set(id, {
        ...b, // Spread first!
        id,
        serviceType: b.serviceId?.title || 'Service Request',
        customerName: b.userId?.name || 'Farmer',
        location: {
          address: b.address?.addressLine1 || 'Address not available',
          distance: distance
        },
        // Prioritize vendorEarnings, fallback to 90% of finalAmount if finalAmount > 0
        price: (b.vendorEarnings > 0 ? b.vendorEarnings : (b.finalAmount > 0 ? b.finalAmount * 0.9 : 0)).toFixed(2),
        vendorEarnings: b.vendorEarnings, // Ensure it's explicitly passed
        timeSlot: {
          date: new Date(b.scheduledDate).toLocaleDateString(),
          time: b.scheduledTime || 'Time not set'
        },
        status: b.status
      });
    });

    // Filter out locally ignored bookings
    const finalMap = new Map();
    mergedMap.forEach((value, key) => {
      if (!ignoredBookingIds.current.has(key)) {
        finalMap.set(key, value);
      }
    });

    // Merge with local storage to avoid losing real-time updates that haven't hit API yet
    const localPending = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
    const apiPending = Array.from(finalMap.values());
    const mergedPending = [...apiPending];

    localPending.forEach(localJob => {
      const id = String(localJob.id || localJob._id);
      if (!mergedPending.find(job => String(job.id || job._id) === id) && !ignoredBookingIds.current.has(id)) {
        const createdAt = localJob.createdAt ? new Date(localJob.createdAt).getTime() : Date.now();
        const age = Date.now() - createdAt;
        const lowerStatus = String(localJob.status || '').toLowerCase();
        if (age < 120000 && (lowerStatus === 'requested' || lowerStatus === 'searching')) {
          mergedPending.push(localJob);
        }
      }
    });

    setPendingBookings(mergedPending);
    localStorage.setItem('vendorPendingJobs', JSON.stringify(mergedPending));

    // Update stats with cache persist
    setStats(prev => {
      const updatedStats = {
        todayEarnings: apiStats.vendorEarnings || 0,
        activeJobs: apiStats.inProgressBookings || 0,
        pendingAlerts: mergedPending.length,
        totalEarnings: apiStats.vendorEarnings || 0,
        completedJobs: apiStats.completedBookings || 0,
        rating: apiStats.rating || 0,
        complianceAlerts: apiStats.complianceAlerts || [],
        machinesInMaintenance: prev.machinesInMaintenance || 0,
        ecommerceEarnings: apiStats.ecommerceEarnings || 0
      };
      localStorage.setItem('vendorDashboardStats', JSON.stringify(updatedStats));
      return updatedStats;
    });

    // Recent jobs with cache persist
    const recentJobsData = allBookings.slice(0, 5).map(booking => ({
      id: booking._id,
      serviceType: booking.serviceId?.title || 'Service',
      customerName: booking.userId?.name || 'Farmer',
      location: booking.address?.addressLine1 || 'Address not available',
      price: (booking.vendorEarnings > 0 ? booking.vendorEarnings : (booking.finalAmount ? booking.finalAmount * 0.9 : 0)).toFixed(2),
      vendorEarnings: booking.vendorEarnings,
      timeSlot: {
        date: new Date(booking.scheduledDate).toLocaleDateString(),
        time: booking.scheduledTime || 'Time not set'
      },
      status: booking.status,
      assignedTo: booking.workerId ? { name: booking.workerId.name } : null,
    }));
    setRecentJobs(recentJobsData);
    localStorage.setItem('vendorDashboardRecentJobs', JSON.stringify(recentJobsData));

    // Load vendor profile from localStorage
    const profile = JSON.parse(localStorage.getItem('vendorData') || '{}');
    setVendorProfile({
      name: profile.name || 'Vendor Name',
      businessName: profile.businessName || 'Business Name',
      photo: profile.profilePhoto || null,
      service: profile.service || []
    });
  }, []);

  // Main data loader
  const loadDashboardData = useCallback(async (showSpinner = true, forceRefresh = false) => {
    const currentVendorId = getCurrentVendorId();

    // Reset cache if vendor changes
    if (lastFetchedVendorId.current !== currentVendorId) {
      lastFetchedVendorId.current = currentVendorId;
      forceRefresh = true;
    }

    // Skip if already loaded and not forced
    if (hasLoadedOnceRef.current && !forceRefresh) {
      return;
    }

    try {
      if (showSpinner) setLoading(true);
      setError(null);

      // Run both API calls in PARALLEL
      const [response, maintRes] = await Promise.all([
        vendorDashboardService.getDashboardStats(),
        maintenanceService.getSchedules()
      ]);

      const activeMaintenanceCount = (maintRes.data || []).filter(m =>
        isWithinInterval(new Date(), {
          start: parseISO(m.startDate),
          end: parseISO(m.endDate)
        })
      ).length;

      processApiResponse(response);

      setStats(prev => {
        const updatedStats = {
          ...prev,
          machinesInMaintenance: activeMaintenanceCount
        };
        localStorage.setItem('vendorDashboardStats', JSON.stringify(updatedStats));
        return updatedStats;
      });
      
      hasLoadedOnceRef.current = true;
      setHasLoadedOnce(true);
    } catch (err) {
      console.error('Error loading dashboard data in context:', err);
      setError(String(err.message || 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }, [processApiResponse]);

  // Handle socket / background updates
  const handleUpdate = useCallback(() => {
    console.log('🔄 Dashboard Context: Refreshing data due to real-time update event');
    loadDashboardData(false, true); // Don't show spinner, but do a background force-refresh
  }, [loadDashboardData]);

  // Initial load when context mounts
  useEffect(() => {
    const token = localStorage.getItem('vendorAccessToken');
    if (token) {
      // If we have cached data, do a silent background fetch without showing spinner
      const hasCache = !!localStorage.getItem('vendorDashboardStats');
      loadDashboardData(!hasCache, false);
    }
  }, [loadDashboardData]);

  // Handle event listeners for real-time updates and push notifications
  useEffect(() => {
    // DELAY NOTIFICATION PERMISSION REQUEST BY 5 SECONDS
    // This prevents iOS WebView from blocking/hanging the initial dashboard render 
    // and avoids App Store rejection for immediate permission requests.
    const fcmTimer = setTimeout(() => {
      registerFCMToken('vendor', true).catch(err => console.error('FCM registration failed:', err));
    }, 5000);

    const handleShowAlert = (e) => {
      if (e.detail) {
        setActiveAlertBookings(prev => {
          if (prev.find(b => String(b.id || b._id) === String(e.detail.id || e.detail._id))) return prev;
          return [e.detail, ...prev];
        });
        setPendingBookings(prev => {
          if (prev.find(b => b.id === e.detail.id)) return prev;
          return [e.detail, ...prev];
        });
      }
    };

    const handleRemoveBooking = (e) => {
      if (e.detail?.id) {
        const idToRemove = String(e.detail.id);

        ignoredBookingIds.current.add(idToRemove);

        setPendingBookings(prev => prev.filter(b => String(b.id || b._id) !== idToRemove));
        setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== idToRemove));
        setRecentJobs(prev => prev.filter(b => String(b.id || b._id) !== idToRemove));
      }
    };

    window.addEventListener('vendorJobsUpdated', handleUpdate);
    window.addEventListener('vendorStatsUpdated', handleUpdate);
    window.addEventListener('showDashboardBookingAlert', handleShowAlert);
    window.addEventListener('removeVendorBooking', handleRemoveBooking);

    return () => {
      clearTimeout(fcmTimer); // Clear timer on unmount
      window.removeEventListener('vendorJobsUpdated', handleUpdate);
      window.removeEventListener('vendorStatsUpdated', handleUpdate);
      window.removeEventListener('showDashboardBookingAlert', handleShowAlert);
      window.removeEventListener('removeVendorBooking', handleRemoveBooking);
    };
  }, [handleUpdate]);

  return (
    <VendorDashboardContext.Provider value={{
      stats,
      vendorProfile,
      recentJobs,
      pendingBookings,
      loading,
      error,
      activeAlertBookings,
      setActiveAlertBookings,
      setPendingBookings,
      setRecentJobs,
      loadDashboardData,
      hasLoadedOnce
    }}>
      {children}
    </VendorDashboardContext.Provider>
  );
};

export const useVendorDashboard = () => {
  const context = useContext(VendorDashboardContext);
  if (!context) {
    throw new Error('useVendorDashboard must be used within a VendorDashboardProvider');
  }
  return context;
};

