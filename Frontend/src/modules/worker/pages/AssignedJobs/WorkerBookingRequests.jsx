import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiClock, FiMapPin, FiCalendar, FiDollarSign, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import workerRequestService from '../../../../services/workerRequestService';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-700',
  expired: 'bg-slate-100 text-slate-700',
};

const WorkerBookingRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [counterRate, setCounterRate] = useState('');
  const [activeNegotiationId, setActiveNegotiationId] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await workerRequestService.getIncomingRequests();
      setRequests(res.data || []);
    } catch (err) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (id, action, rate = null) => {
    try {
      await workerRequestService.respondToRequest(id, action, rate);
      toast.success(action === 'counter' ? 'Counter offer sent!' : `Request ${action}ed`);
      fetchRequests();
      setActiveNegotiationId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const renderRequest = (req) => {
    const lastNeg = req.negotiation?.[req.negotiation.length - 1];
    const isMyTurn = req.status === 'pending' && lastNeg && lastNeg.by === 'farmer';

    return (
      <div key={req._id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-4">
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[req.status] || STATUS_COLORS.pending}`}>
              {req.status}
            </span>
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <FiClock size={10} />
              {new Date(req.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="mb-4">
            <h3 className="font-black text-slate-800 text-lg">{req.workTitle}</h3>
            <p className="text-sm font-medium text-slate-500">From: <span className="font-bold">{req.farmerId?.name || 'Farmer'}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><FiCalendar /> Date</p>
              <p className="font-black text-slate-700">{new Date(req.scheduledDate).toDateString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><FiClock /> Time</p>
              <p className="font-black text-slate-700">{req.startTime} - {req.endTime}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><FiMapPin /> Location</p>
              <p className="font-black text-slate-700 truncate">{req.location?.city || 'Not specified'}</p>
            </div>
            <div className="col-span-2 mt-2 pt-2 border-t border-slate-200">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><FiDollarSign /> Offered Rate</p>
              <p className={`font-black text-lg ${isMyTurn ? 'text-amber-600' : 'text-slate-800'}`}>
                ₹{lastNeg?.rate || req.farmerOfferedRate} <span className="text-xs text-slate-400 font-medium">/{req.rateUnit}</span>
              </p>
            </div>
          </div>

          {isMyTurn && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              {activeNegotiationId === req._id ? (
                <div className="flex gap-2">
                  <input type="number" value={counterRate} onChange={e => setCounterRate(e.target.value)} placeholder="New Rate ₹" className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
                  <button onClick={() => handleAction(req._id, 'counter', counterRate)} className="bg-amber-500 text-white px-4 rounded-xl font-bold text-xs">Send</button>
                  <button onClick={() => setActiveNegotiationId(null)} className="bg-slate-100 text-slate-600 px-3 rounded-xl"><FiX /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => handleAction(req._id, 'accept')} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs">Accept</button>
                  <button onClick={() => setActiveNegotiationId(req._id)} className="flex-1 bg-amber-50 text-amber-600 border border-amber-200 py-2.5 rounded-xl font-bold text-xs">Counter</button>
                  <button onClick={() => handleAction(req._id, 'reject')} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-xs">Reject</button>
                </div>
              )}
            </div>
          )}

          {!isMyTurn && req.status === 'pending' && (
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100 text-center">
              <p className="text-xs font-bold text-amber-700">Waiting for farmer to respond to your counter offer.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Helmet><title>Work Requests | Agroyilt</title></Helmet>

      <div className="bg-slate-800 sticky top-0 z-40 px-5 py-4 flex items-center gap-4 text-white">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-95">
          <FiArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black">Work Requests</h1>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6">
        {loading ? (
          <p className="text-center text-slate-500 font-bold text-sm">Loading requests...</p>
        ) : requests.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📋</p>
            <p className="font-black text-slate-700 text-lg">No incoming requests</p>
          </div>
        ) : (
          requests.map(renderRequest)
        )}
      </div>
    </div>
  );
};

export default WorkerBookingRequests;
