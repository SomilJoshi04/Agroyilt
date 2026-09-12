import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiArrowLeft, FiClock, FiMapPin, FiUsers, FiCalendar,
  FiCheck, FiX, FiAlertCircle, FiRefreshCcw
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import workerBookingService from '../../../../services/workerBookingService';

// ── Status display config ───────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:                    { color: 'bg-amber-100 text-amber-700 border-amber-200',    label: 'Waiting for Responses' },
  matching:                   { color: 'bg-blue-100 text-blue-700 border-blue-200',       label: 'Matching Workers...'    },
  awaiting_farmer_confirmation:{ color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Your Confirmation Needed' },
  confirmed:                  { color: 'bg-emerald-100 text-emerald-700 border-emerald-200',label: 'Confirmed'             },
  rejected:                   { color: 'bg-red-100 text-red-700 border-red-200',          label: 'No Workers Available'   },
  cancelled:                  { color: 'bg-slate-100 text-slate-700 border-slate-200',    label: 'Cancelled'              },
  expired:                    { color: 'bg-slate-100 text-slate-600 border-slate-200',    label: 'Expired'                },
};

const WORKER_STATUS_CONFIG = {
  pending:   { color: 'bg-amber-100 text-amber-700', label: '⏳ Pending'  },
  accepted:  { color: 'bg-emerald-100 text-emerald-700', label: '✅ Accepted' },
  rejected:  { color: 'bg-red-100 text-red-700', label: '❌ Rejected'  },
  withdrawn: { color: 'bg-slate-100 text-slate-600', label: '↩ Withdrawn' },
};

// ── Component ───────────────────────────────────────────────────────────────

const FarmerRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchRequest = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workerBookingService.getFarmerRequestById(id);
      setRequest(res.data);
    } catch (err) {
      toast.error('Failed to load request details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
    // Poll every 20 seconds while status is pending/matching/awaiting
    const interval = setInterval(() => {
      if (request && ['pending', 'matching'].includes(request.status)) {
        fetchRequest();
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchRequest, request?.status]);

  const handleConfirm = async (accept) => {
    if (!window.confirm(
      accept
        ? `Confirm booking for ${request.acceptedWorkersCount} worker(s)? Final availability will be re-verified.`
        : 'Are you sure you want to reject? This will cancel the request.'
    )) return;

    try {
      setConfirming(true);
      const res = await workerBookingService.confirmFarmerRequest(id, accept);
      toast.success(res.message || (accept ? 'Booking confirmed!' : 'Request cancelled.'));
      fetchRequest();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this work request? Workers who were notified will be informed.')) return;
    try {
      setCancelling(true);
      await workerBookingService.cancelFarmerRequest(id);
      toast.success('Request cancelled.');
      navigate('/user/my-worker-requests', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel request.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-slate-500 font-medium mb-4">Request not found.</p>
          <button onClick={() => navigate('/user/my-worker-requests')} className="text-emerald-600 font-bold">
            ← Back to My Requests
          </button>
        </div>
      </div>
    );
  }

  const statusConf = STATUS_CONFIG[request.status] || { color: 'bg-slate-100 text-slate-600 border-slate-200', label: request.status };
  const isPartialConfirmation = request.status === 'awaiting_farmer_confirmation';
  const acceptedWorkers = request.dispatchedTo?.filter(d => d.status === 'accepted') || [];
  const pendingWorkers  = request.dispatchedTo?.filter(d => d.status === 'pending') || [];
  const rejectedWorkers = request.dispatchedTo?.filter(d => d.status === 'rejected') || [];
  const canCancel = ['pending', 'matching', 'awaiting_farmer_confirmation'].includes(request.status);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Helmet>
        <title>{request.workTitle} | Worker Request | Agroyilt</title>
      </Helmet>

      {/* Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-slate-100 px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <button
            onClick={() => {
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate('/user/my-worker-requests', { replace: true });
              }
            }}
            className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95"
          >
            <FiArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-800 truncate">{request.workTitle}</h1>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusConf.color}`}>
              {statusConf.label}
            </span>
          </div>
          <button
            onClick={fetchRequest}
            className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 active:scale-95"
          >
            <FiRefreshCcw size={15} />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-5 space-y-4">

        {/* ── Partial Confirmation Alert ─────────────────────────────────── */}
        {isPartialConfirmation && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-3xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <FiAlertCircle size={22} className="text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-orange-800 text-base mb-1">Worker Availability Update</h3>
                <p className="text-sm text-orange-700 leading-relaxed">
                  You requested <strong>{request.requiredWorkers} workers</strong>.
                  {request.acceptedWorkersCount >= request.requiredWorkers
                    ? ` All ${request.acceptedWorkersCount} workers are ready!`
                    : ` Only ${request.acceptedWorkersCount} worker(s) are currently available.`
                  }
                </p>
              </div>
            </div>

            {/* Counter bar */}
            <div className="bg-white rounded-2xl p-3 mb-4 border border-orange-100">
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                <span>Workers Available</span>
                <span>{request.acceptedWorkersCount} / {request.requiredWorkers}</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (request.acceptedWorkersCount / request.requiredWorkers) * 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                id="accept-partial-btn"
                onClick={() => handleConfirm(true)}
                disabled={confirming || request.acceptedWorkersCount === 0}
                className="py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-60 transition-all"
              >
                {confirming ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiCheck size={16} />}
                Accept {request.acceptedWorkersCount} Workers
              </button>
              <button
                id="reject-partial-btn"
                onClick={() => handleConfirm(false)}
                disabled={confirming}
                className="py-3.5 bg-white border-2 border-red-200 text-red-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-60 transition-all"
              >
                <FiX size={16} />
                Reject
              </button>
            </div>
          </div>
        )}

        {/* ── Request Summary ────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-black text-slate-700 text-sm uppercase tracking-wide mb-3">Request Summary</h3>
          <div className="space-y-2.5">
            {[
              { icon: <FiUsers size={14} />, label: 'Workers Needed', value: `${request.requiredWorkers}` },
              { icon: <FiCalendar size={14} />, label: 'Date', value: new Date(request.scheduledDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) },
              { icon: <FiClock size={14} />, label: 'Time', value: `${request.startTime} – ${request.endTime}` },
              { icon: <FiMapPin size={14} />, label: 'Location', value: [request.location?.city, request.location?.state].filter(Boolean).join(', ') || 'Not specified' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-slate-400 w-4 shrink-0">{item.icon}</span>
                <span className="text-xs font-bold text-slate-500 w-28 shrink-0">{item.label}</span>
                <span className="text-sm font-semibold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>

          {/* Skills */}
          {request.requiredSkills?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 mb-2">Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {request.requiredSkills.map(s => (
                  <span key={s} className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-semibold border border-emerald-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Budget */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-1">Budget</p>
            <p className="text-base font-black text-slate-800">
              ₹{request.minRate}{request.maxRate && request.maxRate !== request.minRate ? ` – ₹${request.maxRate}` : ''} / {request.rateUnit}
            </p>
          </div>

          {/* Routing type */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-1">Routing</p>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${request.requestType === 'independent_broadcast' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
              {request.requestType === 'independent_broadcast' ? '👤 Independent Workers' : '👥 Team Leader'}
            </span>
          </div>
        </div>

        {/* ── Live Counters ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Dispatched', value: request.dispatchedWorkersCount || 0, color: 'bg-blue-50 text-blue-700' },
            { label: 'Accepted',   value: request.acceptedWorkersCount  || 0, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Pending',    value: pendingWorkers.length,               color: 'bg-amber-50 text-amber-700' },
          ].map(item => (
            <div key={item.label} className={`${item.color} rounded-2xl p-4 text-center`}>
              <p className="text-2xl font-black">{item.value}</p>
              <p className="text-xs font-bold mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        {/* ── Worker Responses ───────────────────────────────────────────── */}
        {request.dispatchedTo?.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-black text-slate-700 text-sm uppercase tracking-wide mb-3">Worker Responses</h3>
            <div className="space-y-2">
              {request.dispatchedTo.map((entry, i) => {
                const worker = entry.workerId;
                const wConf  = WORKER_STATUS_CONFIG[entry.status] || { color: 'bg-slate-100 text-slate-600', label: entry.status };
                const isAccepted = entry.status === 'accepted';
                return (
                  <div key={entry._id || i} className={`py-3 border-b border-slate-50 last:border-0 ${isAccepted ? 'bg-emerald-50/50 rounded-2xl px-3 -mx-1' : ''}`}>
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${isAccepted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {worker?.name ? worker.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {worker?.name || 'Worker'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {worker?.rating > 0 && (
                            <span className="text-xs text-slate-400">⭐ {worker.rating.toFixed(1)}</span>
                          )}
                          {isAccepted && worker?.phone && (
                            <span className="text-xs text-slate-500 font-medium">📞 {worker.phone}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isAccepted && worker?.phone && (
                          <a
                            href={`tel:${worker.phone}`}
                            className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-95 transition-transform"
                            title={`Call ${worker.name}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                            </svg>
                          </a>
                        )}
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${wConf.color}`}>
                          {wConf.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Description ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-black text-slate-700 text-sm uppercase tracking-wide mb-2">Work Description</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{request.workDescription}</p>
          {request.additionalInstructions && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 mb-1">Additional Instructions</p>
              <p className="text-sm text-slate-600">{request.additionalInstructions}</p>
            </div>
          )}
        </div>

        {/* ── Confirmed Workers ──────────────────────────────────────────── */}
        {request.status === 'confirmed' && request.finalWorkers?.length > 0 && (
          <div className="bg-emerald-50 rounded-3xl border border-emerald-100 p-5">
            <h3 className="font-black text-emerald-800 text-sm uppercase tracking-wide mb-3">
              ✅ Confirmed Workers ({request.finalWorkers.length})
            </h3>
            <div className="space-y-2">
              {request.finalWorkers.map((w, i) => (
                <div key={w._id || i} className="flex items-center gap-3 bg-white rounded-2xl px-3 py-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-sm shrink-0">
                    {w.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800">{w.name || 'Worker'}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {w.rating > 0 && <span className="text-xs text-slate-400">⭐ {w.rating.toFixed(1)}</span>}
                      {w.phone && <span className="text-xs text-slate-500 font-medium">📞 {w.phone}</span>}
                    </div>
                  </div>
                  {w.phone && (
                    <a
                      href={`tel:${w.phone}`}
                      className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center active:scale-95 transition-transform shrink-0"
                      title={`Call ${w.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Cancel button ──────────────────────────────────────────────── */}
        {canCancel && (
          <button
            id="cancel-farmer-request-btn"
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-3.5 border-2 border-red-200 text-red-600 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 transition-all"
          >
            {cancelling
              ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
              : <FiX size={15} />
            }
            Cancel Request
          </button>
        )}
      </div>
    </div>
  );
};

export default FarmerRequestDetail;
