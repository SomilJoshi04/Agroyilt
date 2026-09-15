import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiArrowLeft, FiClock, FiMapPin, FiUsers, FiCalendar,
  FiCheck, FiX, FiXCircle, FiAlertCircle, FiRefreshCcw, FiCreditCard
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import workerBookingService from '../../../../services/workerBookingService';

const STATUS_CONFIG = {
  pending:                    { color: 'bg-amber-100 text-amber-700 border-amber-200',    label: 'Waiting for Responses' },
  matching:                   { color: 'bg-blue-100 text-blue-700 border-blue-200',       label: 'Matching Workers...'    },
  awaiting_farmer_confirmation:{ color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Select Workers to Book' },
  confirmed:                  { color: 'bg-emerald-100 text-emerald-700 border-emerald-200',label: 'Confirmed'             },
  rejected:                   { color: 'bg-red-100 text-red-700 border-red-200',          label: 'No Workers Available'   },
  cancelled:                  { color: 'bg-slate-100 text-slate-700 border-slate-200',    label: 'Cancelled'              },
  expired:                    { color: 'bg-slate-100 text-slate-600 border-slate-200',    label: 'Expired'                },
};

const FarmerRequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const handleCancelConfirm = async () => {
    try {
      setCancelling(true);
      setIsCancelModalOpen(false);
      await workerBookingService.cancelFarmerRequest(id);
      toast.success('Request cancelled successfully');
      navigate('/user/my-worker-requests', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel request');
    } finally {
      setCancelling(false);
    }
  };

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
    const interval = setInterval(() => {
      if (request && ['pending', 'matching', 'awaiting_farmer_confirmation'].includes(request.status)) {
        fetchRequest();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchRequest, request?.status]);

  const toggleWorkerSelection = (workerId) => {
    setSelectedWorkerIds(prev => {
      if (prev.includes(workerId)) return prev.filter(id => id !== workerId);
      if (prev.length >= request.requiredWorkers) {
         toast.error(`You can only select up to ${request.requiredWorkers} workers.`);
         return prev;
      }
      return [...prev, workerId];
    });
  };

  const handleProceedToPayment = async () => {
    if (selectedWorkerIds.length === 0) {
       toast.error('Please select at least one worker to proceed.');
       return;
    }
    try {
       setProcessing(true);
       await workerBookingService.selectWorkersForBooking(id, selectedWorkerIds);
       navigate(`/user/worker-booking-payment/${id}`);
    } catch (error) {
       toast.error(error?.response?.data?.message || 'Failed to process selection.');
    } finally {
       setProcessing(false);
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

  if (!request) return null;

  const statusConf = STATUS_CONFIG[request.status] || { color: 'bg-slate-100', label: request.status };
  const canCancel = ['pending', 'matching', 'awaiting_farmer_confirmation'].includes(request.status);

  // Safely get available offers (Privacy DTO means some info is missing until payment)
  const offers = request.workerOffers || [];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Helmet><title>Request Details | AgroYilt</title></Helmet>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/user/my-worker-requests')}
              className="w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center active:scale-95 transition-transform"
            >
              <FiArrowLeft size={20} />
            </button>
            <h1 className="font-black text-lg text-slate-800">Request Details</h1>
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-black px-2.5 py-1 rounded-full border ${statusConf.color}`}>
            {statusConf.label}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 mt-2">
        
        {/* Basic Info */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 opacity-50" />
          
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 mb-1">{request.workTitle}</h2>
              <p className="text-sm font-bold text-slate-500 bg-slate-50 inline-block px-2 py-0.5 rounded-lg border border-slate-100">
                {request.requestType === 'independent_broadcast' ? 'Independent Workers' : 'Team Leader'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-600">?{request.maxRate}</p>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Per Worker / Day</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <FiCalendar size={14} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Date</p>
                <p className="text-sm font-bold text-slate-700">{new Date(request.scheduledDate).toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <FiClock size={14} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Time</p>
                <p className="text-sm font-bold text-slate-700">{request.startTime} - {request.endTime}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FiUsers size={14} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Required</p>
                <p className="text-sm font-bold text-slate-700">{request.requiredWorkers} Worker(s)</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <FiMapPin size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Location</p>
                <p className="text-sm font-bold text-slate-700 truncate">{request.location?.city}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Worker Selection (Pre-payment) */}
        {['awaiting_farmer_confirmation', 'matching', 'pending'].includes(request.status) && request.paymentStatus !== 'success' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-black text-slate-700 text-sm uppercase tracking-wide mb-1">Select Workers to Book</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">
               Select up to {request.requiredWorkers} workers. Their exact rates and contact details will be revealed after you lock in the payment for the maximum budget. Any unused amount (if they bid lower) is instantly refunded to your wallet!
            </p>

            {offers.length === 0 ? (
               <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                 <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                   <FiClock className="text-slate-400" size={20} />
                 </div>
                 <p className="text-sm font-bold text-slate-600 mb-1">Waiting for Workers...</p>
                 <p className="text-xs text-slate-500 px-6">Workers in your area are reviewing your request.</p>
               </div>
            ) : (
               <div className="space-y-3">
                 {offers.map((offer, idx) => {
                   const worker = offer.workerId;
                   const isSelected = selectedWorkerIds.includes(worker._id);
                   const isSelectable = offer.status === 'pending' || offer.status === 'selected';

                   return (
                     <div 
                       key={worker._id || idx} 
                       onClick={() => isSelectable && toggleWorkerSelection(worker._id)}
                       className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                         !isSelectable ? 'opacity-50 border-slate-100 bg-slate-50' :
                         isSelected ? 'border-emerald-500 bg-emerald-50/30 shadow-sm' : 'border-slate-100 bg-white cursor-pointer hover:border-emerald-200'
                       }`}
                     >
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                         {isSelected ? <FiCheck /> : (worker?.name ? worker.name.charAt(0).toUpperCase() : '?')}
                       </div>
                       
                       <div className="flex-1 min-w-0">
                         <p className="text-sm font-bold text-slate-800 truncate">
                           {worker?.name || 'Worker'}
                         </p>
                         <div className="flex items-center gap-2 mt-1">
                           {worker?.rating > 0 && (
                             <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                               ? {worker.rating.toFixed(1)}
                             </span>
                           )}
                           <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                             Privacy Hidden
                           </span>
                         </div>
                       </div>
                       
                       <div className="text-right">
                         {isSelectable ? (
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                               {isSelected && <FiCheck size={12} />}
                            </div>
                         ) : (
                            <span className="text-xs font-bold text-slate-400 capitalize">{offer.status}</span>
                         )}
                       </div>
                     </div>
                   );
                 })}

                 {/* Proceed Button */}
                 {selectedWorkerIds.length > 0 && (
                   <div className="mt-5 pt-5 border-t border-slate-100">
                     <button
                       onClick={handleProceedToPayment}
                       disabled={processing}
                       className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-[0_4px_12px_rgba(5,150,105,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                     >
                       {processing ? (
                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                       ) : (
                         <>
                           Proceed to Payment ({selectedWorkerIds.length})
                           <FiArrowLeft className="rotate-180" />
                         </>
                       )}
                     </button>
                   </div>
                 )}
               </div>
            )}
          </div>
        )}

        {/* Confirmed Workers (Post-payment) */}
        {request.paymentStatus === 'success' && request.finalWorkers?.length > 0 && (
          <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-sm p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 opacity-50" />
            
            <div className="flex items-center gap-2 mb-4">
               <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                 <FiCheck size={16} className="stroke-[3]" />
               </div>
               <h3 className="font-black text-emerald-800 text-sm uppercase tracking-wide">
                 Booking Confirmed
               </h3>
            </div>
            
            <p className="text-xs text-slate-500 font-medium mb-4">Your payment was successful and worker details are now unlocked. You can contact them directly.</p>

            <div className="space-y-3">
              {request.finalWorkers.map((w, i) => (
                <div key={w?._id || i} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-emerald-700 font-black text-lg shrink-0">
                    {w?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800">{w?.name || 'Worker'}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {w?.rating > 0 && <span className="text-xs text-slate-500 font-bold">★ {w?.rating?.toFixed(1)}</span>}
                      {w?.phone && <span className="text-xs text-slate-600 font-bold">📞 {w?.phone}</span>}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end mr-3">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Agreed Rate</p>
                    <p className="text-lg font-black text-emerald-600">₹{request.workerOffers?.find(o => o.workerId?._id === w?._id || o.workerId === w?._id)?.offeredRate || request.maxRate}</p>
                  </div>
                  {w?.phone && (
                    <a
                      href={`tel:${w?.phone}`}
                      className="w-10 h-10 rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-200 flex items-center justify-center active:scale-95 transition-transform shrink-0"
                      title={`Call ${w.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                      </svg>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work Description */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-black text-slate-700 text-sm uppercase tracking-wide mb-2">Work Description</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{request.workDescription}</p>
        </div>

        {/* Cancel button */}
        {canCancel && request.paymentStatus !== 'success' && (
          <button
            onClick={() => setIsCancelModalOpen(true)}
            disabled={cancelling}
            className="w-full py-4 border-2 border-red-100 text-red-500 bg-red-50/50 hover:bg-red-50 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 transition-all mt-4"
          >
            {cancelling ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <FiX size={16} />}
            Cancel Request
          </button>
        )}
      </div>
      {/* Custom Cancel Confirmation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
              <FiXCircle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Cancel Request?</h3>
            <p className="text-slate-500 text-center text-sm mb-6">
              Are you sure you want to cancel this work request? Workers who were notified will be informed.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all"
              >
                No, Keep it
              </button>
              <button 
                onClick={handleCancelConfirm}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 active:scale-95 transition-all shadow-md shadow-red-200"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerRequestDetail;




