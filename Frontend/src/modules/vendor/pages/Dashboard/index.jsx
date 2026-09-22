import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiUsers, FiBell, FiArrowRight, FiUser, FiClock, FiMapPin, FiCheckCircle, FiTrendingUp, FiChevronRight, FiAlertTriangle, FiCalendar, FiBarChart2, FiActivity, FiShoppingBag } from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import { vendorDashboardService } from '../../services/dashboardService';
import { acceptBooking, rejectBooking } from '../../services/bookingService';
import { BookingAlertModal } from '../../components/bookings';
import { toastManager } from '../../../../utils/toastManager';
import { io } from 'socket.io-client';
import maintenanceService from '../../services/maintenanceService';
import { isWithinInterval, parseISO } from 'date-fns';

import { registerFCMToken } from '../../../../services/pushNotificationService';
import LogoLoader from '../../../../components/common/LogoLoader';
import StatsCards from './components/StatsCards';
import { useVendorDashboard } from '../../../../context/VendorDashboardContext';
// PendingBookings import removed


const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:5000';

const Dashboard = memo(() => {
  const navigate = useNavigate();

  // Helper function to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const {
    stats,
    vendorProfile,
    recentJobs,
    pendingBookings,
    activeAlertBookings,
    setActiveAlertBookings,
    loading,
    error,
    loadDashboardData
  } = useVendorDashboard();

  const handleAcceptAlert = async (bookingId) => {
    // Immediately mark as ignored so API refresh doesn't bring it back
    window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id: String(bookingId) } }));
    try {
      await acceptBooking(bookingId);
      toastManager.success('Booking accepted successfully');
    } catch (error) {
      const status = error?.response?.status;
      if (status === 409) {
        toastManager.error('This job was already accepted by another vendor.');
      } else {
        toastManager.error('Failed to accept booking');
      }
    } finally {
      window.dispatchEvent(new Event('vendorStatsUpdated'));
    }
  };

  const handleRejectAlert = async (bookingId) => {
    // Immediately mark as ignored so API refresh doesn't bring it back
    window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id: String(bookingId) } }));
    try {
      const result = await rejectBooking(bookingId);
      if (result?.alreadyTaken) {
        toastManager.error('This job was already accepted by another vendor.');
      } else {
        toastManager.success('Booking declined');
      }
    } catch (error) {
      // Silently ignore — booking is already removed from modal
      console.error('Reject booking error (modal already closed):', error);
    } finally {
      window.dispatchEvent(new Event('vendorStatsUpdated'));
    }
  };
  
  const handleAssignAlert = (bookingId) => {
    navigate(`/vendor/booking/${bookingId}`);
  };

  // Set background gradient
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  // Memoize quickActions to prevent recreation on every render
  const quickActions = useMemo(() => [
    {
      title: 'Field Operations',
      icon: FiBriefcase,
      color: '#00a6a6',
      path: '/vendor/jobs',
      count: stats.activeJobs,
      subtitle: `${stats.activeJobs} on field`,
    },

    {
      title: 'Wallet',
      icon: FaWallet,
      color: '#F59E0B',
      path: '/vendor/wallet',
      subtitle: `₹${stats.totalEarnings.toLocaleString()} total`,
    },
    {
      title: 'Maintenance',
      icon: FiCalendar,
      color: '#10B981',
      path: '/vendor/maintenance',
      subtitle: stats.machinesInMaintenance > 0 ? `${stats.machinesInMaintenance} Machines in Care` : 'Equipment Care',
    },
    {
      title: 'Analytics',
      icon: FiBarChart2,
      color: '#0F766E',
      path: '/vendor/analytics',
      subtitle: 'Equipment ROI',
    },
    {
      title: 'Soil Testing',
      icon: FiActivity,
      color: '#347989',
      path: '/vendor/soil-tests',
      subtitle: 'Manage Tests',
    },
    {
      title: 'Agri Market',
      icon: FiShoppingBag,
      color: '#E11D48',
      path: '/vendor/store/orders',
      subtitle: `₹${(stats.ecommerceEarnings || 0).toLocaleString()} Earnings`,
    },
  ], [stats.activeJobs, stats.totalEarnings, stats.machinesInMaintenance, stats.ecommerceEarnings]);

  const getStatusColor = (status) => {
    const s = String(status).toLowerCase();
    const statusColors = {
      'accepted': '#3B82F6',
      'confirmed': '#10B981',
      'assigned': '#8B5CF6',
      'journey_started': '#F59E0B',
      'visited': '#F59E0B',
      'in_progress': '#F59E0B',
      'work_done': '#10B981',
      'completed': '#10B981',
      'worker_paid': '#06B6D4',
      'settlement_pending': '#F97316',
    };
    return statusColors[s] || '#6B7280';
  };

  const getStatusLabel = (status) => {
    const s = String(status).toLowerCase();
    const labels = {
      'requested': 'New Order',
      'searching': 'Finding Hub',
      'accepted': 'Accepted',
      'confirmed': 'Order Confirmed',
      'assigned': 'Driver Assigned',
      'journey_started': 'Heading to Farm',
      'visited': 'At Farm',
      'in_progress': 'Operating',
      'work_done': 'Work Completed',
      'completed': 'Job Done',
      'worker_paid': 'Driver Paid',
      'settlement_pending': 'Settlement',
      'cancelled': 'Cancelled',
      'rejected': 'Rejected'
    };
    return labels[s] || status;
  };



  // Show error state
  if (error) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center" style={{ background: themeColors.backgroundGradient }}>
        <div className="text-center px-6">
          <FiAlertTriangle className="text-amber-400 w-12 h-12 mb-3 mx-auto" />
          <h2 className="text-white text-xl font-semibold mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => loadDashboardData(true, true)}
            className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Dashboard" showBack={false} notificationCount={stats.pendingAlerts} />

      <main className="pt-0">
        {/* Profile Card Section */}
        <div className="px-4 pt-3 pb-1">
          <div
            className="rounded-xl p-3 cursor-pointer active:scale-[0.99] transition-all duration-200 relative overflow-hidden shadow-sm"
            onClick={() => navigate('/vendor/profile')}
            style={{
              background: themeColors.button,
              border: `1px solid rgba(255, 255, 255, 0.25)`,
            }}
          >
            {/* Decorative Pattern */}
            <div
              className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 pointer-events-none"
              style={{
                background: `radial-gradient(circle, #FFFFFF 0%, transparent 70%)`,
                transform: 'translate(15px, -15px)',
              }}
            />

            <div className="relative z-10 flex items-center gap-2.5">
              {/* Profile Photo */}
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.button} 0%, ${themeColors.button}dd 100%)`,
                  border: `2px solid #FFFFFF`,
                }}
              >
                {vendorProfile.photo ? (
                  <img
                    src={vendorProfile.photo}
                    alt={vendorProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FiUser className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/80 mb-0.5" style={{
                  letterSpacing: '0.1em',
                }}>
                  WELCOME !
                </p>
                <h2 className="text-sm font-bold text-white truncate leading-tight">{vendorProfile.name}</h2>
                <p className="text-[11px] text-white/90 truncate font-medium mt-0.5">{vendorProfile.businessName}</p>
              </div>

              {/* Arrow Icon */}
              <div
                className="p-1.5 rounded-lg flex-shrink-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
              >
                <FiChevronRight className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Incomplete Profile Prompt */}
        {(!vendorProfile.service || vendorProfile.service.length === 0) && (
          <div className="px-4 pt-2 -mb-2">
            <div
              onClick={() => navigate('/vendor/profile')}
              className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r shadow-sm cursor-pointer hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FiClock className="h-5 w-5 text-orange-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-bold text-orange-700">Inventory Incomplete</p>
                  <p className="text-sm text-orange-600">
                    Add equipment or products to your profile to start receiving bookings.
                  </p>
                </div>
                <div className="ml-auto">
                  <FiArrowRight className="h-4 w-4 text-orange-500" />
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Compliance Alerts Section */}
        {stats.complianceAlerts && stats.complianceAlerts.length > 0 && (
          <div className="px-4 pt-2 -mb-2">
            <div
              onClick={() => navigate('/vendor/compliance')}
              className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm cursor-pointer hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FiAlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-bold text-red-700">Compliance Alert</p>
                  <p className="text-sm text-red-600">
                    {stats.complianceAlerts[0].message}
                    {stats.complianceAlerts.length > 1 && ` (+${stats.complianceAlerts.length - 1} more)`}
                  </p>
                </div>
                <div className="ml-auto">
                  <FiArrowRight className="h-4 w-4 text-red-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="px-4 py-2.5 grid grid-cols-2 gap-2.5">
          {quickActions.map((action, index) => (
            <div
              key={index}
              onClick={() => navigate(action.path)}
              className="bg-white/95 backdrop-blur-sm p-2.5 rounded-xl shadow-xs border border-gray-100 active:scale-95 transition-all cursor-pointer flex items-center gap-2.5"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-xs flex-shrink-0"
                style={{ backgroundColor: action.color }}
              >
                <action.icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{action.title}</p>
                <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">{action.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Cards - Optimized Component */}
        <StatsCards stats={stats} />

        {/* Content Section (below gradient) */}
        <div className="px-4 py-2 space-y-3">
          {/* Pending Booking Alerts - Removed as per user request, shown in Recent Bookings instead */}

          {/* Performance Metrics */}
          <div>
            <h2 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5">
              <FiTrendingUp className="w-4 h-4 text-emerald-600" /> Performance
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Completed Jobs Card */}
              <div
                className="rounded-xl shadow-xs relative overflow-hidden bg-white border border-emerald-500/20 p-2.5"
              >
                <div
                  className="w-full py-1.5 px-2 rounded-lg text-white font-bold text-[11px] text-center flex items-center justify-center gap-1.5 mb-1.5"
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <FiCheckCircle className="w-3.5 h-3.5" />
                  <span>Orders Done</span>
                </div>
                <div className="text-center py-1">
                  <p className="text-2xl font-black mb-0.5" style={{ color: '#10B981' }}>
                    {stats.completedJobs}
                  </p>
                  <p className="text-[10px] text-gray-500 font-semibold">Total Bookings</p>
                </div>
              </div>

              {/* Rating Card */}
              <div
                className="rounded-xl shadow-xs relative overflow-hidden bg-white border border-amber-500/20 p-2.5"
              >
                <div
                  className="w-full py-1.5 px-2 rounded-lg text-white font-bold text-[11px] text-center flex items-center justify-center gap-1.5 mb-1.5"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)',
                  }}
                >
                  <FiTrendingUp className="w-3.5 h-3.5" />
                  <span>Rating</span>
                </div>
                <div className="text-center py-1">
                  <p className="text-2xl font-black mb-0.5" style={{ color: '#F59E0B' }}>
                    {stats.rating > 0 ? stats.rating.toFixed(1) : 'N/A'}
                  </p>
                  <p className="text-[10px] text-gray-500 font-semibold">Average Rating</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Jobs - List View */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-bold text-gray-800">Recent Bookings</h2>
              {recentJobs.length > 0 && (
                <button
                  onClick={() => navigate('/vendor/jobs')}
                  className="px-2.5 py-1 rounded-md font-semibold text-xs transition-all duration-300 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${themeColors.button} 0%, ${themeColors.button}dd 100%)`,
                    color: '#FFFFFF',
                    boxShadow: `0 2px 6px ${hexToRgba(themeColors.button, 0.25)}`,
                  }}
                >
                  View All
                </button>
              )}
            </div>
            {recentJobs.length > 0 ? (
              <div className="space-y-2">
                {recentJobs.map((job, index) => {
                  const isDarkBlue = index % 2 === 0;
                  const accentColor = isDarkBlue ? '#001947' : '#406788';

                  return (
                    <div
                      key={job.id}
                      onClick={() => navigate(`/vendor/booking/${job.id}`)}
                      className="bg-white rounded-xl shadow-xs cursor-pointer active:scale-[0.99] transition-all duration-200 relative overflow-hidden border border-gray-100"
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                        style={{
                          background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                        }}
                      />
                      <div className="px-2.5 py-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{
                              border: `1.5px solid ${accentColor}40`,
                              boxShadow: `0 2px 6px ${hexToRgba(accentColor, 0.15)}`,
                              background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}10 100%)`,
                            }}
                          >
                            <FiUser className="w-4 h-4" style={{ color: accentColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <p className="text-xs font-bold text-gray-800 truncate">{job.customerName}</p>
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                                style={{
                                  background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                                  color: '#FFFFFF',
                                }}
                              >
                                {job.serviceType || 'Equipment'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                                style={{
                                  background: 'rgba(0, 166, 166, 0.08)',
                                  border: '1px solid rgba(0, 166, 166, 0.15)',
                                }}
                              >
                                <FiMapPin className="w-2.5 h-2.5" style={{ color: themeColors.button }} />
                                <span className="text-[10px] font-semibold text-gray-700 truncate max-w-[90px]">{job.location}</span>
                              </div>
                              <div
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                                style={{
                                  background: 'rgba(245, 158, 11, 0.08)',
                                  border: '1px solid rgba(245, 158, 11, 0.15)',
                                }}
                              >
                                <FiClock className="w-2.5 h-2.5" style={{ color: '#F59E0B' }} />
                                <span className="text-[10px] font-semibold text-gray-700">{job.time}</span>
                              </div>
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: `${accentColor}15`,
                                  color: accentColor,
                                  border: `1px solid ${accentColor}25`,
                                }}
                              >
                                {getStatusLabel(job.status)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/vendor/booking/${job.id}`);
                            }}
                            className="p-1.5 rounded-lg flex-shrink-0 active:scale-90 transition-transform"
                            style={{
                              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                              boxShadow: `0 2px 6px ${hexToRgba(accentColor, 0.25)}`,
                            }}
                          >
                            <FiArrowRight className="w-3.5 h-3.5" style={{ color: '#FFFFFF' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="bg-white rounded-xl p-5 shadow-xs text-center border border-gray-100"
              >
                <FiBriefcase className="w-9 h-9 mx-auto mb-2 text-gray-300" />
                <p className="text-xs text-gray-600 font-semibold mb-0.5">No field activities</p>
                <p className="text-[11px] text-gray-400">Upcoming bookings will show here</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <BookingAlertModal 
        isOpen={activeAlertBookings && activeAlertBookings.length > 0}
        bookings={activeAlertBookings}
        onAccept={handleAcceptAlert}
        onReject={handleRejectAlert}
        onAssign={handleAssignAlert}
        onMinimize={() => setActiveAlertBookings([])}
        servicePayoutPct={stats?.servicePayoutPercentage || 70}
      />
    </div>
  );
});

export default Dashboard;
