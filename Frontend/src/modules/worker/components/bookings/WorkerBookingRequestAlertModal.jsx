import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiMapPin, FiClock, FiBell, FiUser, FiCalendar, FiDollarSign } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { playAlertRing, stopAlertRing } from '../../../../utils/notificationSound';
import workerService from '../../../../services/workerService';
import { toastManager } from '../../../../utils/toastManager';

const WorkerBookingRequestAlertModal = ({ isOpen, requestData, onClose, onRequestResponded }) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [loadingAction, setLoadingAction] = useState(null);
  const [showRateInput, setShowRateInput] = useState(false);
  const [offeredRate, setOfferedRate] = useState(0);

  useEffect(() => {
    if (isOpen && requestData) {
      const validId = requestData.requestId || requestData._id || requestData.id;
      if (!validId || (!requestData.workTitle && !requestData.serviceName)) {
        onClose();
        return;
      }

      try {
        playAlertRing(true);
      } catch (e) {}
      setTimeLeft(60);
      setOfferedRate(requestData.minRate || requestData.farmerOfferedRate || 0);

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(timer);
        stopAlertRing();
      };
    } else {
      stopAlertRing();
    }
    return () => stopAlertRing();
  }, [isOpen, requestData]);

  const handleTimeout = () => {
    stopAlertRing();
    onClose();
  };

  const targetRequestId = requestData?.requestId || requestData?._id || requestData?.id;

  const handleAccept = async () => {
    if (!targetRequestId) {
      toastManager.error('Request ID missing');
      return;
    }

    if (!showRateInput && requestData?.isFarmerBroadcast && requestData?.maxRate && requestData?.maxRate > requestData?.minRate) {
      setShowRateInput(true);
      return;
    }

    const maxBudget = Number(requestData?.maxRate || requestData?.farmerOfferedRate || requestData?.minRate || 0);
    const numericRate = Number(offeredRate) || maxBudget;

    if (maxBudget > 0 && numericRate > maxBudget) {
      toastManager.error(`Offered rate cannot exceed farmer's maximum budget of ₹${maxBudget}`);
      return;
    }

    if (loadingAction) return;
    setLoadingAction('accept');
    try {
      const res = requestData.isFarmerBroadcast
        ? await workerService.respondToFarmerRequest(targetRequestId, 'accept', { offeredRate: numericRate })
        : await workerService.respondToRequest(targetRequestId, 'accept');

      if (res.success) {
        toastManager.success('Booking Request Accepted!');
        onRequestResponded && onRequestResponded();
        onClose();
      } else {
        toastManager.error(res.message || 'Failed to accept request');
      }
    } catch (error) {
      toastManager.error(error?.response?.data?.message || error?.message || 'Failed to accept request');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async () => {
    if (!targetRequestId) {
      onClose();
      return;
    }
    if (loadingAction) return;
    setLoadingAction('reject');
    try {
      const res = requestData.isFarmerBroadcast
        ? await workerService.respondToFarmerRequest(targetRequestId, 'reject')
        : await workerService.respondToRequest(targetRequestId, 'reject');

      if (res.success) {
        toastManager.success('Request Declined');
        onRequestResponded && onRequestResponded();
        onClose();
      } else {
        toastManager.error(res.message || 'Failed to decline request');
      }
    } catch (error) {
      toastManager.error(error?.response?.data?.message || error?.message || 'Failed to decline request');
    } finally {
      setLoadingAction(null);
    }
  };

  if (!isOpen || !requestData) return null;

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (timeLeft / 60) * circumference;

  const content = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
        >
          {/* Header Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-6 flex flex-col items-center text-center">
            {/* Background Glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-400/20 rounded-full blur-xl pointer-events-none" />

            {/* Pulsing Bell Icon */}
            <div className="relative mb-3">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 shadow-inner">
                <FiBell className="w-8 h-8 animate-bounce text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            </div>

            <h2 className="relative z-10 text-white text-2xl font-black tracking-tight">New Booking Request!</h2>
            <div className="relative z-10 px-4 py-1 mt-1 bg-white/20 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
              Action Required
            </div>
          </div>

          {/* Body Section */}
          <div className="px-6 py-6 min-h-[250px] flex flex-col justify-center bg-white flex-1 overflow-y-auto">
            {/* Request Card Details */}
            <div className="bg-gray-50 rounded-[2rem] p-5 border border-gray-100 space-y-4 mb-6">
              
              {/* Farmer Row */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm border border-gray-100 text-blue-500">
                  <FiUser className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900 leading-none">{requestData.farmerName || 'Farmer'}</h4>
                  <p className="text-[11px] font-bold text-blue-600 mt-1 uppercase tracking-wider">{requestData.workCategory || requestData.workTitle || 'Farm Work'}</p>
                </div>
              </div>

              <div className="h-px bg-gray-200/50 w-full" />

              {/* Info Rows */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-white rounded-xl shadow-xs border border-gray-100 text-emerald-500">
                    <FiDollarSign className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Offered Rate</p>
                    <p className="text-sm font-black text-gray-800">
                      ₹{requestData.minRate || requestData.farmerOfferedRate || 0}
                      {requestData.maxRate && requestData.maxRate > requestData.minRate ? ` - ₹${requestData.maxRate}` : ''}
                      {requestData.rateUnit ? <span className="text-[10px] text-gray-500 font-bold uppercase ml-1">/ {requestData.rateUnit}</span> : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-white rounded-xl shadow-xs border border-gray-100 text-blue-500">
                    <FiCalendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date & Time</p>
                    <p className="text-sm font-bold text-gray-800">
                      {requestData.scheduledDate ? new Date(requestData.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Today'} ? {requestData.startTime || 'Flexible'}{requestData.endTime ? ` - ${requestData.endTime}` : ''}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-white rounded-xl shadow-xs border border-gray-100 text-purple-500">
                    <FiMapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</p>
                    <p className="text-sm font-bold text-gray-800">
                      {typeof requestData.location === 'object' && requestData.location !== null
                        ? [requestData.location.addressLine1, requestData.location.city, requestData.location.state].filter(Boolean).join(', ') || 'Farmer Location'
                        : (requestData.location || 'Location Provided')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timer Section */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="24" cy="24" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="4" />
                    <circle
                      cx="24"
                      cy="24"
                      r={radius}
                      fill="none"
                      stroke={timeLeft > 15 ? '#10b981' : '#ef4444'}
                      strokeWidth="4"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashoffset}
                      className="transition-all duration-1000 ease-linear"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className={`absolute text-xs font-black ${timeLeft > 15 ? 'text-emerald-500' : 'text-red-500 animate-pulse'}`}>
                    {timeLeft}s
                  </span>
                </div>
                <div>
                  <p className="text-sm font-black text-gray-800">Act quickly!</p>
                  <p className="text-[10px] font-bold text-gray-400">Request will expire soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rate Input Section */}
          {showRateInput && (
            <div className="px-6 pt-4 pb-2 bg-white shrink-0 animate-fade-in">
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Your Required Rate (₹)</label>
                <input 
                  type="number" 
                  value={offeredRate}
                  onChange={(e) => setOfferedRate(e.target.value)}
                  min={requestData?.minRate || 0}
                  max={requestData?.maxRate || 0}
                  className="w-full bg-white border-2 border-emerald-200 rounded-xl px-4 py-3 text-lg font-black text-emerald-900 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <p className="text-[10px] text-emerald-600 mt-2 font-bold">
                  Farmer's Budget: ₹{requestData?.minRate} - ₹{requestData?.maxRate}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-6 pb-6 pt-2 bg-white flex gap-3 shrink-0">
            <button
              onClick={showRateInput ? () => setShowRateInput(false) : handleReject}
              disabled={loadingAction !== null}
              className={`flex-1 py-4 bg-gray-50 text-gray-600 rounded-2xl font-black text-sm active:scale-95 transition-all border border-gray-200 ${loadingAction === 'reject' ? 'opacity-50' : ''}`}
            >
              {showRateInput ? 'Cancel' : (loadingAction === 'reject' ? 'Declining...' : 'Decline')}
            </button>
            <button
              onClick={handleAccept}
              disabled={loadingAction !== null}
              className={`flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-emerald-200 ${loadingAction === 'accept' ? 'opacity-50' : ''}`}
            >
              {showRateInput ? (loadingAction === 'accept' ? 'Submitting...' : 'Submit Rate') : (loadingAction === 'accept' ? 'Accepting...' : 'Accept Job')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default WorkerBookingRequestAlertModal;
