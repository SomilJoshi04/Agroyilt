import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch, FiCheckCircle, FiTruck, FiPackage, FiClipboard,
  FiClock, FiUser, FiCalendar, FiArrowLeft, FiRefreshCw,
  FiMapPin, FiChevronRight, FiAlertCircle
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { adminBookingService } from '../../../../services/adminBookingService';
import { toastManager } from '../../../../utils/toastManager';

const Tracking = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [mobileTab, setMobileTab] = useState('orders'); // 'orders' | 'tracking'

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch bookings from backend
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        limit: 50,
        search: debouncedSearch
      };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter.toLowerCase();
      }

      const res = await adminBookingService.getAllBookings(params);
      if (res.success) {
        const data = res.data || [];
        setBookings(data);

        // Auto-select first order if none selected or if previously selected order is not in current list
        setSelectedOrder(prev => {
          if (!prev && data.length > 0) return data[0];
          if (prev) {
            const found = data.find(b => b._id === prev._id);
            return found || (data.length > 0 ? data[0] : null);
          }
          return null;
        });
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toastManager.error(error.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [debouncedSearch, statusFilter]);

  const getStatusStep = (status) => {
    switch (status) {
      case 'pending':
      case 'confirmed':
      case 'accepted': return 0;
      case 'assigned': return 1;
      case 'journey_started':
      case 'visited': return 2;
      case 'in_progress': return 3;
      case 'work_done': return 4;
      case 'completed': return 5;
      default: return 0;
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'completed':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Completed' };
      case 'work_done':
        return { bg: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500', label: 'Work Done' };
      case 'in_progress':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500 animate-pulse', label: 'In Progress' };
      case 'journey_started':
      case 'visited':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500 animate-pulse', label: 'Journey Started' };
      case 'assigned':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', label: 'Assigned' };
      case 'confirmed':
      case 'accepted':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Confirmed' };
      case 'pending':
        return { bg: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', label: 'Pending' };
      case 'cancelled':
      case 'rejected':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Cancelled' };
      default:
        return { bg: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400', label: s || 'Unknown' };
    }
  };

  const steps = [
    { title: 'Booking Placed', desc: 'Order received and confirmed', icon: FiClipboard, key: 'pending' },
    { title: 'Worker Assigned', desc: 'Specialist allocated to job', icon: FiUser, key: 'assigned' },
    { title: 'Journey Started', desc: 'Worker en route to field', icon: FiTruck, key: 'journey_started' },
    { title: 'Work In Progress', desc: 'Agricultural service underway', icon: FiPackage, key: 'in_progress' },
    { title: 'Work Done', desc: 'Service completed, pending review', icon: FiCheckCircle, key: 'work_done' },
    { title: 'Completed', desc: 'Finalized and payment verified', icon: FiCheckCircle, key: 'completed' }
  ];

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setMobileTab('tracking'); // Auto-switch to tracking view on mobile
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Header & Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📍</span> Live Booking Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time workflow status and field progress
          </p>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by Booking # or Customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={fetchBookings}
            disabled={loading}
            title="Refresh bookings"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition flex-shrink-0 disabled:opacity-50"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-semibold">
        {[
          { key: 'ALL', label: 'All Orders' },
          { key: 'IN_PROGRESS', label: '⚡ Active / In Progress' },
          { key: 'JOURNEY_STARTED', label: '🚚 On The Way' },
          { key: 'ASSIGNED', label: '👤 Assigned' },
          { key: 'COMPLETED', label: '✓ Completed' },
          { key: 'PENDING', label: '⏳ Pending' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              statusFilter === tab.key
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile Tab Switcher (< lg screens) */}
      <div className="flex lg:hidden bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
        <button
          onClick={() => setMobileTab('orders')}
          className={`flex-1 py-2 rounded-lg text-center transition ${
            mobileTab === 'orders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📋 Orders List ({bookings.length})
        </button>
        <button
          onClick={() => setMobileTab('tracking')}
          className={`flex-1 py-2 rounded-lg text-center transition flex items-center justify-center gap-1.5 ${
            mobileTab === 'tracking' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>📍</span> Live Timeline
          {selectedOrder && (
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          )}
        </button>
      </div>

      {/* Main Dual-Pane Container */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Pane: Orders List */}
        <div className={`w-full lg:flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col ${
          mobileTab === 'tracking' ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Header count */}
          <div className="p-3.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              {bookings.length} {bookings.length === 1 ? 'Booking' : 'Bookings'} Available
            </span>
            <span className="text-slate-400 text-[11px]">
              Click any order to view tracking
            </span>
          </div>

          {/* List Content */}
          <div className="overflow-y-auto max-h-[calc(100vh-320px)] divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="animate-pulse flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                    <div className="w-10 h-10 bg-slate-200 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-1/3" />
                      <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                    </div>
                    <div className="w-16 h-6 bg-slate-200 rounded-full" />
                  </div>
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <FiPackage className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No Bookings Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {search ? `No orders matched "${search}". Try clearing search filters.` : 'When farmers make service requests, they will show up here for live tracking.'}
                </p>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="mt-4 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              bookings.map((booking) => {
                const isSelected = selectedOrder?._id === booking._id;
                const badge = getStatusBadge(booking.status);
                const orderId = booking.bookingNumber || booking._id?.slice(-6).toUpperCase();

                return (
                  <div
                    key={booking._id}
                    onClick={() => handleSelectOrder(booking)}
                    className={`p-4 transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Service Icon / Avatar */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base flex-shrink-0 font-bold ${
                        isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                      }`}>
                        {booking.serviceId?.iconUrl ? (
                          <img src={booking.serviceId.iconUrl} alt="" className="w-6 h-6 object-contain" />
                        ) : (
                          '🚜'
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                            #{orderId}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">
                          {booking.userId?.name || 'Farmer Customer'}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <FiCalendar className="w-3 h-3 text-slate-400" />
                            {new Date(booking.createdAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                          {booking.serviceName && (
                            <span className="truncate max-w-[120px] text-slate-500 font-medium">
                              • {booking.serviceName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectOrder(booking);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 flex-shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white'
                      }`}
                    >
                      <span>Track</span>
                      <FiChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Live Tracking Details Panel */}
        <div className={`w-full lg:w-[420px] flex-shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col ${
          mobileTab === 'orders' ? 'hidden lg:flex' : 'flex'
        }`}>
          {selectedOrder ? (
            <div className="p-5 flex flex-col h-full">
              {/* Top back button for mobile */}
              <div className="flex lg:hidden items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <button
                  onClick={() => setMobileTab('orders')}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  <span>Back to Orders List</span>
                </button>
                <span className="text-[11px] text-slate-400">Order Tracking</span>
              </div>

              {/* Order Header Summary */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 mb-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Tracking Order
                    </span>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      #{selectedOrder.bookingNumber || selectedOrder._id?.slice(-6).toUpperCase()}
                    </h2>
                  </div>
                  {(() => {
                    const badge = getStatusBadge(selectedOrder.status);
                    return (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] font-semibold">Farmer</span>
                    <p className="font-bold text-slate-800 truncate">
                      {selectedOrder.userId?.name || 'Customer'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {selectedOrder.userId?.phone || selectedOrder.userId?.email || 'No contact'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] font-semibold">Service</span>
                    <p className="font-bold text-slate-800 truncate">
                      {selectedOrder.serviceName || selectedOrder.serviceId?.title || 'Farming Service'}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {selectedOrder.totalAmount ? `₹${selectedOrder.totalAmount}` : 'Flexible'}
                    </p>
                  </div>
                </div>

                {/* Worker / Provider assignment if present */}
                {selectedOrder.workerId && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Assigned Worker:</span>
                    <span className="font-bold text-slate-800">
                      {selectedOrder.workerId.name} {selectedOrder.workerId.phone ? `(${selectedOrder.workerId.phone})` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Real-time Workflow Timeline */}
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span>⚡</span> Workflow Timeline
              </h3>

              <div className="relative pl-5 border-l-2 border-slate-200 space-y-6 my-2 flex-1">
                {steps.map((step, index) => {
                  const currentStepIdx = getStatusStep(selectedOrder.status);
                  const isCompleted = index < currentStepIdx;
                  const isCurrent = index === currentStepIdx;

                  const Icon = step.icon;

                  return (
                    <div key={index} className="relative group">
                      {/* Step Circle Marker */}
                      <div className={`absolute -left-[27px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                          : isCurrent
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/40 ring-4 ring-blue-100 animate-pulse'
                          : 'bg-white border-slate-300 text-slate-400'
                      }`}>
                        <Icon className="w-3 h-3 stroke-[2.5]" />
                      </div>

                      <div className="pl-3">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-xs font-bold ${
                            isCompleted ? 'text-slate-800' : isCurrent ? 'text-blue-600 font-extrabold' : 'text-slate-400'
                          }`}>
                            {step.title}
                          </h4>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider">
                              In Progress
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/bookings/${selectedOrder._id}`)}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2"
                >
                  <span>View Full Order Details</span>
                  <FiChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center h-full min-h-[350px]">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-3">
                <FiMapPin className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No Order Selected</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Select any order from the list on the left to inspect its live field tracking timeline.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tracking;
