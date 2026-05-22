import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiUsers, FiBell, FiArrowRight, FiUser, FiClock, FiMapPin, FiCheckCircle, FiTrendingUp, FiChevronRight, FiAlertTriangle, FiCalendar, FiBarChart2, FiActivity, FiShoppingBag } from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import { vendorDashboardService } from '../../services/dashboardService';
import { acceptBooking, rejectBooking, assignWorker } from '../../services/bookingService';
import { BookingAlertModal } from '../../components/bookings';
import { toast } from 'react-hot-toast';
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
    loading,
    error,
    loadDashboardData
  } = useVendorDashboard();

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
  ], [stats.activeJobs, stats.workersOnline, stats.totalEarnings, stats.machinesInMaintenance, stats.ecommerceEarnings]);

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

  // Show loading state - Using Skeletons to avoid iOS rejection
  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-gray-50">
        {/* Header shows immediately */}
        <Header title="Dashboard" showBack={false} />
        
        <main className="pt-0">
          {/* Animated Profile Placeholder */}
          <div className="px-4 pt-4 pb-2">
            <div className="rounded-2xl p-4 bg-gray-200 animate-pulse h-24 border border-gray-100 shadow-sm"></div>
          </div>

          {/* Animated Quick Actions Grid */}
          <div className="px-4 py-4 grid grid-cols-2 gap-3">
             {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-16 rounded-2xl animate-pulse border border-gray-100" />
             ))}
          </div>

          {/* Animated Stats Section */}
          <div className="px-4 py-2 space-y-3">
            <div className="h-32 bg-gray-200 rounded-2xl animate-pulse border border-gray-100"></div>
            <div className="grid grid-cols-2 gap-4">
               <div className="h-32 bg-gray-200 rounded-2xl animate-pulse border border-gray-100"></div>
               <div className="h-32 bg-gray-200 rounded-2xl animate-pulse border border-gray-100"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center" style={{ background: themeColors.backgroundGradient }}>
        <div className="text-center px-6">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
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
        <div className="px-4 pt-4 pb-2">
          <div
            className="rounded-2xl p-4 cursor-pointer active:scale-98 transition-all duration-200 relative overflow-hidden"
            onClick={() => navigate('/vendor/profile')}
            style={{
              background: themeColors.button,
              border: `2px solid ${themeColors.button}`,
            }}
          >
            {/* Decorative Pattern */}
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10"
              style={{
                background: `radial-gradient(circle, ${themeColors.button} 0%, transparent 70%)`,
                transform: 'translate(20px, -20px)',
              }}
            />

            <div className="relative z-10 flex items-center gap-3">
              {/* Profile Photo */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${themeColors.button} 0%, ${themeColors.button}dd 100%)`,
                  border: `2.5px solid #FFFFFF`,
                }}
              >
                {vendorProfile.photo ? (
                  <img
                    src={vendorProfile.photo}
                    alt={vendorProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FiUser className="w-7 h-7" style={{ color: '#FFFFFF' }} />
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold uppercase tracking-wider mb-0.5" style={{
                  color: '#FFFFFF',
                  textShadow: `1px 1px 0px rgba(0, 0, 0, 0.2)`,
                  letterSpacing: '0.12em',
                }}>
                  WELCOME !
                </p>
                <h2 className="text-base font-bold text-white truncate mb-0.5">{vendorProfile.name}</h2>
                <p className="text-xs text-white truncate font-medium opacity-90">{vendorProfile.businessName}</p>
              </div>

              {/* Arrow Icon */}
              <div
                className="p-2.5 rounded-lg flex-shrink-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.35)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                }}
              >
                <FiChevronRight className="w-6 h-6" style={{ color: '#FFFFFF', fontWeight: 'bold' }} />
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
        <div className="px-4 py-4 grid grid-cols-2 gap-3">
          {quickActions.map((action, index) => (
            <div
              key={index}
              onClick={() => navigate(action.path)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-all cursor-pointer flex items-center gap-3"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: action.color }}
              >
                <action.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{action.title}</p>
                <p className="text-[10px] text-gray-500 font-medium truncate">{action.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Cards - Optimized Component */}
        <StatsCards stats={stats} />

        {/* Content Section (below gradient) */}
        <div className="px-4 py-4 space-y-4">
          {/* Pending Booking Alerts - Removed as per user request, shown in Recent Bookings instead */}

          {/* Performance Metrics */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Performance</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* Completed Jobs Card */}
              <div
                className="rounded-2xl shadow-lg relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15), 0 4px 12px rgba(16, 185, 129, 0.1), 0 0 0 2px rgba(16, 185, 129, 0.2)',
                  border: '2px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                {/* Left border accent */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
                  style={{
                    background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                  }}
                />
                {/* Top Border with Heading */}
                <div
                  className="w-full py-3 px-4 rounded-t-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <p className="text-base font-bold text-white text-center">Orders Done</p>
                </div>
                {/* Icon at top left - just below heading */}
                <div
                  className="absolute top-14 left-4 p-3 rounded-xl z-10"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.2) 100%)',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2)',
                    border: '2px solid rgba(16, 185, 129, 0.4)',
                  }}
                >
                  <FiCheckCircle className="w-7 h-7" style={{ color: '#10B981' }} />
                </div>
                {/* Content */}
                <div className="p-5 pt-16">
                  <p className="text-4xl font-bold mb-2 text-center" style={{ color: '#10B981' }}>
                    {stats.completedJobs}
                  </p>
                  <p className="text-sm text-gray-600 font-semibold text-center">Total Bookings</p>
                </div>
              </div>

              {/* Rating Card */}
              <div
                className="rounded-2xl shadow-lg relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)',
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.15), 0 4px 12px rgba(245, 158, 11, 0.1), 0 0 0 2px rgba(245, 158, 11, 0.2)',
                  border: '2px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                {/* Left border accent */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
                  style={{
                    background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                  }}
                />
                {/* Top Border with Heading */}
                <div
                  className="w-full py-3 px-4 rounded-t-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <p className="text-base font-bold text-white text-center">Rating</p>
                </div>
                {/* Icon at top left - just below heading */}
                <div
                  className="absolute top-14 left-4 p-3 rounded-xl z-10"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.2) 100%)',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2)',
                    border: '2px solid rgba(245, 158, 11, 0.4)',
                  }}
                >
                  <FiTrendingUp className="w-7 h-7" style={{ color: '#F59E0B' }} />
                </div>
                {/* Content */}
                <div className="p-5 pt-16">
                  <p className="text-4xl font-bold mb-2 text-center" style={{ color: '#F59E0B' }}>
                    {stats.rating > 0 ? stats.rating.toFixed(1) : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 font-semibold text-center">Average rating</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Jobs - List View */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Recent Bookings</h2>
              {recentJobs.length > 0 && (
                <button
                  onClick={() => navigate('/vendor/jobs')}
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, ${themeColors.button} 0%, ${themeColors.button}dd 100%)`,
                    color: '#FFFFFF',
                    boxShadow: `0 4px 12px ${hexToRgba(themeColors.button, 0.3)}, 0 2px 6px ${hexToRgba(themeColors.button, 0.2)}`,
                  }}
                >
                  View All
                </button>
              )}
            </div>
            {recentJobs.length > 0 ? (
              <div className="space-y-3">
                {recentJobs.map((job, index) => {
                  const isDarkBlue = index % 2 === 0;
                  const accentColor = isDarkBlue ? '#001947' : '#406788';

                  return (
                    <div
                      key={job.id}
                      onClick={() => navigate(`/vendor/booking/${job.id}`)}
                      className="bg-white rounded-xl shadow-lg cursor-pointer active:scale-98 transition-all duration-200 relative overflow-hidden"
                      style={{
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.08)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
                        style={{
                          background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                        }}
                      />
                      <div className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{
                              border: `2.5px solid ${accentColor}40`,
                              boxShadow: `0 2px 8px ${hexToRgba(accentColor, 0.25)}, inset 0 1px 0 rgba(255, 255, 255, 0.4)`,
                              background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}10 100%)`,
                            }}
                          >
                            <FiUser className="w-5 h-5" style={{ color: accentColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-sm font-bold text-gray-800 truncate">{job.customerName}</p>
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
                                style={{
                                  background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                                  color: '#FFFFFF',
                                  boxShadow: `0 2px 5px ${hexToRgba(accentColor, 0.3)}`,
                                }}
                              >
                                {job.serviceType || 'Equipment'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <div
                                className="flex items-center gap-1 px-2 py-0.5 rounded"
                                style={{
                                  background: 'rgba(0, 166, 166, 0.1)',
                                  border: '1px solid rgba(0, 166, 166, 0.2)',
                                }}
                              >
                                <FiMapPin className="w-3 h-3" style={{ color: themeColors.button }} />
                                <span className="text-xs font-semibold text-gray-700 truncate max-w-[100px]">{job.location}</span>
                              </div>
                              <div
                                className="flex items-center gap-1 px-2 py-0.5 rounded"
                                style={{
                                  background: 'rgba(245, 158, 11, 0.1)',
                                  border: '1px solid rgba(245, 158, 11, 0.2)',
                                }}
                              >
                                <FiClock className="w-3 h-3" style={{ color: '#F59E0B' }} />
                                <span className="text-xs font-semibold text-gray-700">{job.time}</span>
                              </div>
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{
                                  background: `${accentColor}15`,
                                  color: accentColor,
                                  border: `1px solid ${accentColor}30`,
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
                            className="p-2 rounded-lg flex-shrink-0"
                            style={{
                              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 100%)`,
                              boxShadow: `0 3px 10px ${hexToRgba(accentColor, 0.3)}`,
                            }}
                          >
                            <FiArrowRight className="w-4 h-4" style={{ color: '#FFFFFF' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                className="bg-white rounded-xl p-6 shadow-md text-center"
                style={{
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                }}
              >
                <FiBriefcase className="w-12 h-12 mx-auto mb-3" style={{ color: '#D1D5DB' }} />
                <p className="text-sm text-gray-600 mb-1">No field activities</p>
                <p className="text-xs text-gray-500">Upcoming bookings will show here</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* BookingAlertModal removed to keep dashboard clean as per user request */}
    </div>
  );
});

export default Dashboard;
