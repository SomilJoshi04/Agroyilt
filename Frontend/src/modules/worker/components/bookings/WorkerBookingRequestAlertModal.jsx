import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiMapPin, FiClock, FiBell, FiUser, FiCalendar, FiDollarSign, FiUsers, FiStar, FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { playAlertRing, stopAlertRing } from '../../../../utils/notificationSound';
import workerService from '../../../../services/workerService';
import api from '../../../../services/api';
import { toastManager } from '../../../../utils/toastManager';

const WorkerBookingRequestAlertModal = ({ isOpen, requestData, onClose, onRequestResponded }) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [loadingAction, setLoadingAction] = useState(null);
  const [showRateInput, setShowRateInput] = useState(false);
  const [offeredRate, setOfferedRate] = useState(0);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [isTeamLeader, setIsTeamLeader] = useState(false);

  const neededMembersCount = Math.max(0, (Number(requestData?.requiredWorkers) || 1) - 1);
  const isGroupReq = Number(requestData?.requiredWorkers) > 1 ||
                     requestData?.bookingMode === 'TEAM_LEADER' ||
                     requestData?.requestType === 'team_leader';

  useEffect(() => {
    if (isOpen && requestData) {
      const validId = requestData.requestId || requestData._id || requestData.id;
      const hasWorkInfo = requestData.workTitle || requestData.workCategory ||
                          requestData.serviceName || requestData.title;
      if (!validId || !hasWorkInfo) {
        onClose();
        return;
      }

      try {
        playAlertRing(true);
      } catch (e) {}
      setTimeLeft(60);
      setOfferedRate(requestData.minRate || requestData.farmerOfferedRate || 0);

      // Check if logged in user is a Team Leader and load team members
      const loadTeamData = async () => {
        try {
          const res = await api.get('/workers/team/me');
          if (res.data?.success && res.data.team) {
            setIsTeamLeader(true);
            const rawMembers = res.data.members || [];
            
            // STRICT FILTER: Only show ONLINE / ACTIVE members
            const onlineOnlyMembers = rawMembers.filter(m => {
              const st = String(m.status || '').trim().toUpperCase();
              return ['ONLINE', 'ACTIVE', 'AVAILABLE', 'IDLE', 'FREE', 'ON_JOB'].includes(st);
            });

            setTeamMembers(onlineOnlyMembers);

            // Auto-select up to neededMembersCount online members by default
            if (onlineOnlyMembers.length > 0 && neededMembersCount > 0) {
              const defaultSelected = onlineOnlyMembers.slice(0, neededMembersCount).map(m => m._id);
              setSelectedMemberIds(defaultSelected);
            }
          }
        } catch (err) {
          console.error('[WorkerBookingAlertModal] Failed to load team:', err);
        }
      };

      loadTeamData();

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
  }, [isOpen, requestData, neededMembersCount]);

  const targetRequestId = requestData?.requestId || requestData?._id || requestData?.id;

  useEffect(() => {
    if (!isOpen) return;
    const handleCancelEvent = (e) => {
      const detail = e.detail || {};
      const cId = detail.requestId || detail.bookingId || detail._id;
      if (!cId || String(cId) === String(targetRequestId)) {
        stopAlertRing();
        onClose && onClose();
      }
    };

    window.addEventListener('workerBookingCancelled', handleCancelEvent);
    window.addEventListener('workerRequestCancelled', handleCancelEvent);
    return () => {
      window.removeEventListener('workerBookingCancelled', handleCancelEvent);
      window.removeEventListener('workerRequestCancelled', handleCancelEvent);
    };
  }, [isOpen, targetRequestId, onClose]);

  const handleTimeout = () => {
    stopAlertRing();
    onClose();
  };

  const toggleMemberSelection = (memberId) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      }
      if (prev.length >= neededMembersCount) {
        toastManager.error(`You only need to select ${neededMembersCount} members for this ${requestData.requiredWorkers}-worker job.`);
        return prev;
      }
      return [...prev, memberId];
    });
  };

  const handleAccept = async () => {
    if (!targetRequestId) {
      toastManager.error('Request ID missing');
      return;
    }

    const needsConfiguration = (requestData?.isFarmerBroadcast && requestData?.maxRate && requestData?.maxRate > requestData?.minRate) ||
                              (isGroupReq && isTeamLeader && teamMembers.length > 0);

    if (!showRateInput && needsConfiguration) {
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
      const payload = {
        offeredRate: numericRate,
        ...(isTeamLeader && selectedMemberIds.length > 0 ? { memberIds: selectedMemberIds } : {})
      };

      const res = requestData.isFarmerBroadcast
        ? await workerService.respondToFarmerRequest(targetRequestId, 'accept', payload)
        : await workerService.respondToRequest(targetRequestId, 'accept');

      if (res.success) {
        toastManager.success(isGroupReq ? 'Team Proposal Submitted!' : 'Booking Request Accepted!');
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
          className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]"
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

            <h2 className="relative z-10 text-white text-2xl font-black tracking-tight">
              {isGroupReq && isTeamLeader ? 'Team Job Request!' : 'New Booking Request!'}
            </h2>
            <div className="relative z-10 px-4 py-1 mt-1 bg-white/20 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
              {isGroupReq ? `${requestData.requiredWorkers || 4} Workers Needed` : 'Action Required'}
            </div>
          </div>

          {/* Body Section */}
          <div className="px-6 py-5 min-h-[220px] flex flex-col bg-white flex-1 overflow-y-auto">
            {/* Request Card Details */}
            <div className="bg-gray-50 rounded-[2rem] p-4 border border-gray-100 space-y-3 mb-4">
              
              {/* Farmer Row */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-xl shadow-sm border border-gray-100 text-blue-500">
                  <FiUser className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-gray-900 leading-none">{requestData.farmerName || 'Farmer'}</h4>
                  <p className="text-[11px] font-bold text-blue-600 mt-1 uppercase tracking-wider">{requestData.workCategory || requestData.workTitle || 'Farm Work'}</p>
                </div>
              </div>

              <div className="h-px bg-gray-200/50 w-full" />

              {/* Info Rows */}
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-white rounded-xl shadow-xs border border-gray-100 text-emerald-500">
                    <FiDollarSign className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {requestData.bookingType === 'DAILY' ? 'Daily Rate' : 'Hourly Rate'}
                    </p>
                    <p className="text-sm font-black text-gray-800">
                      ₹{requestData.minRate || requestData.farmerOfferedRate || 0}
                      {requestData.maxRate && requestData.maxRate > requestData.minRate ? ` - ₹${requestData.maxRate}` : ''}
                      <span className="text-[10px] text-gray-500 font-bold uppercase ml-1">
                        / {requestData.bookingType === 'DAILY' ? 'day' : 'hr'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-white rounded-xl shadow-xs border border-gray-100 text-blue-500">
                    <FiCalendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {requestData.bookingType === 'DAILY' ? 'Daily Schedule' : 'Date & Time'}
                    </p>
                    <p className="text-xs font-bold text-gray-800">
                      {requestData.bookingType === 'DAILY'
                        ? `${requestData.numberOfDays || 1} Day(s) • Starts ${requestData.startDate ? new Date(requestData.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : (requestData.scheduledDate ? new Date(requestData.scheduledDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Soon')}`
                        : `${requestData.scheduledDate ? new Date(requestData.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Today'} • ${requestData.startTime || 'Flexible'}${requestData.endTime ? ` - ${requestData.endTime}` : ''}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-white rounded-xl shadow-xs border border-gray-100 text-purple-500">
                    <FiMapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</p>
                    <p className="text-xs font-bold text-gray-800 truncate">
                      {typeof requestData.location === 'object' && requestData.location !== null
                        ? [requestData.location.addressLine1, requestData.location.city, requestData.location.state].filter(Boolean).join(', ') || 'Farmer Location'
                        : (requestData.location || 'Location Provided')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rate & Team Member Selection (when showRateInput is active) */}
            {showRateInput && (
              <div className="space-y-3 mb-3 animate-fade-in">
                {/* Rate Input */}
                <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-100">
                  <label className="block text-[11px] font-black text-emerald-800 uppercase tracking-wider mb-1">
                    Your Required Rate / Worker (₹)
                  </label>
                  <input 
                    type="number" 
                    value={offeredRate}
                    onChange={(e) => setOfferedRate(e.target.value)}
                    min={requestData?.minRate || 0}
                    max={requestData?.maxRate || 0}
                    className="w-full bg-white border-2 border-emerald-200 rounded-xl px-3 py-2 text-base font-black text-emerald-900 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-[10px] text-emerald-600 mt-1 font-bold">
                    Farmer's Budget: ₹{requestData?.minRate} - ₹{requestData?.maxRate}
                  </p>
                </div>

                {/* Team Member Selection for Team Leader */}
                {isGroupReq && isTeamLeader && (
                  <div className="bg-blue-50/80 rounded-2xl p-3.5 border border-blue-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                        <FiUsers className="text-blue-600" /> Select Online Members
                      </span>
                      <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        {selectedMemberIds.length + 1} / {requestData.requiredWorkers || 4} Total
                      </span>
                    </div>

                    {teamMembers.length > 0 ? (
                      <>
                        <p className="text-[10px] text-blue-600 mb-2.5 font-medium">
                          Select {neededMembersCount} online member(s) matching farmer requirements:
                        </p>

                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                          {teamMembers.map((member) => {
                            const isSelected = selectedMemberIds.includes(member._id);
                            const skills = Array.isArray(member.skills) ? member.skills : [];

                            return (
                              <div
                                key={member._id}
                                onClick={() => toggleMemberSelection(member._id)}
                                className={`flex items-start gap-2.5 p-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-white border-blue-500 shadow-xs'
                                    : 'bg-white/60 border-gray-200 opacity-60 hover:opacity-90'
                                }`}
                              >
                                <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border text-white shrink-0 ${
                                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                                }`}>
                                  {isSelected && <FiCheck size={10} className="stroke-[3]" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-bold text-gray-900 truncate">{member.name}</span>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
                                    {member.rating > 0 && (
                                      <span className="text-[9px] font-bold text-amber-600 flex items-center gap-0.5">
                                        <FiStar size={8} className="fill-amber-500" /> {member.rating.toFixed(1)}
                                      </span>
                                    )}
                                  </div>

                                  {skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {skills.slice(0, 3).map((sk, i) => (
                                        <span key={i} className="text-[8px] font-bold bg-gray-100 text-gray-700 px-1 py-0.2 rounded border border-gray-200">
                                          {sk}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="py-3 px-2 text-center bg-white rounded-xl border border-blue-100 mt-1">
                        <p className="text-xs font-bold text-slate-700">No Team Members Are Currently Online</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Please ask your members to open app and switch to Online status.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Timer Section */}
            <div className="flex items-center justify-between mt-auto pt-2">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="20" cy="20" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="4" />
                    <circle
                      cx="20"
                      cy="20"
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
                  <span className={`absolute text-[11px] font-black ${timeLeft > 15 ? 'text-emerald-500' : 'text-red-500 animate-pulse'}`}>
                    {timeLeft}s
                  </span>
                </div>
                <div>
                  <p className="text-xs font-black text-gray-800">Act quickly!</p>
                  <p className="text-[9px] font-bold text-gray-400">Request will expire soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-6 pt-2 bg-white flex gap-3 shrink-0">
            <button
              onClick={showRateInput ? () => setShowRateInput(false) : handleReject}
              disabled={loadingAction !== null}
              className={`flex-1 py-3.5 bg-gray-50 text-gray-600 rounded-2xl font-black text-xs active:scale-95 transition-all border border-gray-200 ${loadingAction === 'reject' ? 'opacity-50' : ''}`}
            >
              {showRateInput ? 'Back' : (loadingAction === 'reject' ? 'Declining...' : 'Decline')}
            </button>
            <button
              onClick={handleAccept}
              disabled={loadingAction !== null}
              className={`flex-[2] py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-xs active:scale-95 transition-all shadow-lg shadow-emerald-200 ${loadingAction === 'accept' ? 'opacity-50' : ''}`}
            >
              {showRateInput
                ? (loadingAction === 'accept' ? 'Submitting...' : (isGroupReq && isTeamLeader ? `Submit Team Proposal (${selectedMemberIds.length + 1} Workers)` : 'Submit Rate'))
                : (loadingAction === 'accept' ? 'Accepting...' : (isGroupReq && isTeamLeader ? 'Configure Team & Accept' : 'Accept Job'))}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export default WorkerBookingRequestAlertModal;
