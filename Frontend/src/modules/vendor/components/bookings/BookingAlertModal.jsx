import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiMapPin, FiClock, FiDollarSign, FiArrowRight, FiBell, FiAlertCircle, FiMinimize2, FiUsers } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { vendorTheme as themeColors } from '../../../../theme';
import { playAlertRing, stopAlertRing } from '../../../../utils/notificationSound';

const BookingAlertCard = ({ booking, onAccept, onReject, onAssign, initialTimeLeft = 60 }) => {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [loadingAction, setLoadingAction] = useState(null);

  const handleAction = async (actionFn, actionType) => {
    if (loadingAction) return;
    setLoadingAction(actionType);
    const bookingId = booking?.id || booking?._id;
    localStorage.removeItem(`alert_start_${bookingId}`);
    try {
      if (actionFn) await actionFn(bookingId);
    } catch (error) {
      console.error(error);
    } finally {
      if (typeof window !== 'undefined') {
        // Prevent immediate re-enabling if unmounted, handled by React state memory leak warning natively, but usually safe
        setLoadingAction(null);
      }
    }
  };

  useEffect(() => {
    if (!booking) return;

    const bookingId = booking.id || booking._id;
    const storageKey = `alert_start_${bookingId}`;
    let startTime = parseInt(localStorage.getItem(storageKey));

    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem(storageKey, startTime.toString());
      setTimeLeft(initialTimeLeft);
    } else {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remaining = initialTimeLeft - elapsedSeconds;

      if (remaining <= 0) {
        setTimeLeft(0);
        onReject?.(bookingId);
        localStorage.removeItem(storageKey);
        return;
      }
      setTimeLeft(remaining);
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const currentElapsed = Math.floor((Date.now() - startTime) / 1000);
        const currentRemaining = initialTimeLeft - currentElapsed;

        if (currentRemaining <= 0) {
          clearInterval(timer);
          onReject?.(bookingId);
          localStorage.removeItem(storageKey);
          return 0;
        }
        return currentRemaining;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [booking, onReject, initialTimeLeft]);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (timeLeft / 60) * circumference;
  const dashoffset = circumference - progress;

  return (
    <div className="bg-white w-full sm:w-[350px] flex-none rounded-[3rem] overflow-y-auto max-h-[90vh] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative scrollbar-hide snap-center">
      {/* Header Section */}
      <div className="relative h-32 bg-gradient-to-br from-teal-600 to-emerald-700 flex flex-col items-center justify-center pt-2">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute -bottom-10 -right-10 w-48 h-48 bg-white rounded-full"
          />
        </div>

        <div className="relative z-10 mb-1">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 flex items-center justify-center shadow-lg relative">
            <FiBell className="w-6 h-6 text-white animate-bounce" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          </div>
        </div>

        <h2 className="relative z-10 text-white text-xl font-black tracking-tight">New Order Alert!</h2>
        <div className="relative z-10 px-3 py-0.5 mt-1 bg-white/20 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-bold text-white uppercase tracking-widest">
          Action Required Immediately
        </div>
      </div>

      {/* Body Section */}
      <div className="px-6 py-5">
        <div className="flex justify-center -mt-12 mb-4">
          <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl p-0.5">
            <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="5" />
              <motion.circle
                cx="40" cy="40" r={radius} fill="none"
                stroke={timeLeft <= 10 ? '#EF4444' : '#059669'} strokeWidth="6"
                strokeDasharray={circumference} strokeDashoffset={dashoffset}
                strokeLinecap="round" className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="text-center">
              <span className={`text-2xl font-black block leading-none ${timeLeft <= 10 ? 'text-red-500' : 'text-emerald-600'}`}>{timeLeft}</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Sec left</span>
            </div>
            {timeLeft <= 10 && <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" />}
          </div>
        </div>

        <div className="flex items-center justify-center mb-6 bg-emerald-50/50 py-3 rounded-2xl border border-emerald-100/50">
          <div className="text-center">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1 block">Travel Distance</span>
            <div className="text-2xl font-black text-emerald-600 tracking-tight flex items-center gap-1 justify-center">
              <FiMapPin className="w-4 h-4" />
              {booking.location?.distance || (booking.distance ? (String(booking.distance).includes('km') ? booking.distance : `${booking.distance} km`) : 'Near You')}
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          {/* Category & Urgent Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
              {booking.categoryIcon ? (
                <img src={booking.categoryIcon} alt="Cat" className="w-5 h-5 object-contain" />
              ) : (
                <span className="w-5 h-5 flex items-center justify-center bg-gray-200 rounded-full text-[10px]">⚡</span>
              )}
              <span className="text-[11px] font-black tracking-widest text-gray-700 uppercase">
                {booking.serviceCategory || 'Category'}
              </span>
            </div>
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 px-2 py-1.5 rounded-lg shadow-sm">
              <span className="text-[10px] font-black text-red-600 tracking-widest uppercase flex items-center justify-center gap-1.5">
                <FiBell className="w-3.5 h-3.5 animate-pulse" /> Urgent
              </span>
            </div>
          </div>

          {/* Service Details Card */}
          <div className="bg-white rounded-[1.5rem] p-4 border border-teal-100 shadow-[0_8px_25px_-5px_rgba(20,184,166,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-teal-400 to-emerald-500" />

            <div className="pl-3">
              <p className="text-[10px] font-black text-teal-600/80 uppercase tracking-[0.2em] mb-1">Service Requested</p>
              <h4 className="text-[17px] font-black text-gray-900 leading-tight mb-3">
                {booking.serviceName || booking.serviceType || 'Service Request'}
              </h4>

              {(typeof booking.brandName === 'string' || typeof booking.brandIcon === 'string') && (
                <div className="flex items-center gap-2.5 bg-gray-50/80 rounded-xl p-2.5 border border-gray-100 shadow-sm w-fit mt-1">
                  {typeof booking.brandIcon === 'string' && booking.brandIcon ? (
                    <div className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm p-1 border border-gray-50">
                      <img src={booking.brandIcon} alt={typeof booking.brandName === 'string' ? booking.brandName : 'Brand'} className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-50 text-xs font-black text-gray-500">
                      {typeof booking.brandName === 'string' && booking.brandName ? booking.brandName.substring(0, 2).toUpperCase() : 'BR'}
                    </div>
                  )}
                  <div className="flex flex-col pr-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] leading-none mb-0.5">Brand</span>
                    <span className="text-xs font-black text-gray-800 uppercase tracking-wide">{typeof booking.brandName === 'string' ? booking.brandName : 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50/50 rounded-3xl p-4 border border-gray-100 mb-6">
          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="p-1 bg-white rounded-lg shadow-xs border border-gray-100"><FiMapPin className="text-gray-400 w-3.5 h-3.5" /></div>
              <div className="flex-1">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Arrival Location</p>
                <p className="text-xs font-bold text-gray-800 line-clamp-1">{booking.location?.address || booking.address?.addressLine1 || 'Address not available'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="p-1 bg-white rounded-lg shadow-xs border border-gray-100"><FiClock className="text-gray-400 w-3.5 h-3.5" /></div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Scheduled Time</p>
                <p className="text-xs font-bold text-gray-800">
                  {booking.timeSlot?.date || (booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString() : '')} {booking.timeSlot?.time || booking.scheduledTime || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            disabled={!!loadingAction}
            onClick={() => handleAction(onAccept, 'accept')}
            className="w-full py-4 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100">
            {loadingAction === 'accept' ? 'Accepting...' : 'Accept (Myself)'} {loadingAction !== 'accept' && <FiArrowRight className="w-5 h-5" />}
          </button>

          <button
            disabled={!!loadingAction}
            onClick={() => handleAction(onAssign, 'assign')}
            className="w-full py-4 rounded-2xl text-white font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100"
            style={{ background: themeColors.button }}>
            {loadingAction === 'assign' ? 'Assigning...' : 'Assign to Operator'} {loadingAction !== 'assign' && <FiUsers className="w-5 h-5" />}
          </button>

          <button
            disabled={!!loadingAction}
            onClick={() => handleAction(onReject, 'reject')}
            className="w-full py-3 rounded-2xl bg-red-50 to-red-100 border border-red-100 text-red-500 font-bold text-xs active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100">
            {loadingAction === 'reject' ? 'Declining...' : <><FiX className="w-4 h-4" /> Decline Order</>}
          </button>
        </div>
      </div>
    </div>
  );
};

const BookingAlertModal = ({ isOpen, booking, bookings, onAccept, onReject, onAssign, onMinimize, timeLeft = 60 }) => {
  const alertsArray = bookings || (booking ? [booking] : []);

  useEffect(() => {
    if (isOpen && alertsArray.length > 0) {
      playAlertRing(true);
    } else {
      stopAlertRing();
    }
    return () => stopAlertRing();
  }, [isOpen, alertsArray.length]);

  if (!isOpen || alertsArray.length === 0) return null;

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
        {onMinimize && (
          <button onClick={() => { stopAlertRing(); onMinimize(); }} className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/30 backdrop-blur-md rounded-full text-white transition-all active:scale-95" title="Minimize Alert">
            <FiMinimize2 className="w-5 h-5" />
          </button>
        )}

        <div className="w-full overflow-x-auto snap-x snap-mandatory scrollbar-hide flex gap-4 px-8 items-center h-full">
          <div className="flex gap-4 m-auto">
            {alertsArray.filter(b => b).map(b => (
              <BookingAlertCard
                key={b?.id || b?._id || Math.random().toString()}
                booking={b}
                onAccept={onAccept}
                onReject={onReject}
                onAssign={onAssign}
                initialTimeLeft={timeLeft}
              />
            ))}
          </div>
        </div>

        {alertsArray.length > 1 && (
          <div className="absolute bottom-10 left-0 right-0 flex justify-center text-white text-sm font-medium animate-pulse drop-shadow-lg">
            Swipe to see all {alertsArray.length} alerts →
          </div>
        )}
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default BookingAlertModal;
