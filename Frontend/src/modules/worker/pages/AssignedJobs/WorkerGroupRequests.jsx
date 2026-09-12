import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiClock, FiMapPin, FiCalendar, FiDollarSign, FiUsers, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import workerRequestService from '../../../../services/workerRequestService';

const WorkerGroupRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Negotiation State
  const [counterRate, setCounterRate] = useState('');
  const [activeNegotiationId, setActiveNegotiationId] = useState(null);

  // Selection State
  const [activeSelectionId, setActiveSelectionId] = useState(null);
  const [selectedWorkers, setSelectedWorkers] = useState([]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await workerRequestService.getGroupRequests();
      setRequests(res.data || []);
    } catch (err) {
      toast.error('Failed to load group requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (id, action, rate = null) => {
    try {
      await workerRequestService.leaderRespondToRequest(id, action, rate);
      toast.success(action === 'counter' ? 'Counter offer sent!' : `Request ${action}ed`);
      fetchRequests();
      setActiveNegotiationId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDispatch = async (id) => {
    try {
      await workerRequestService.dispatchToMembers(id);
      toast.success('Dispatched to eligible team members');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Dispatch failed');
    }
  };

  const submitSelection = async (id, maxAllowed) => {
    if (selectedWorkers.length === 0) return toast.error('Select at least one worker');
    if (selectedWorkers.length > maxAllowed) return toast.error(`Cannot exceed ${maxAllowed} workers`);

    try {
      await workerRequestService.leaderSelectWorkers(id, selectedWorkers);
      toast.success('Workers finalized and booking confirmed!');
      fetchRequests();
      setActiveSelectionId(null);
      setSelectedWorkers([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm selection');
    }
  };

  const toggleWorkerSelection = (id) => {
    setSelectedWorkers(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const renderRequest = (req) => {
    const lastNeg = req.negotiation?.[req.negotiation.length - 1];
    const isMyTurn = req.status === 'pending' && lastNeg && lastNeg.by === 'farmer';

    return (
      <div key={req._id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="p-5">
          <div className="flex justify-between items-start mb-3">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
              {req.status}
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              {new Date(req.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="mb-4">
            <h3 className="font-black text-slate-800 text-lg">{req.workTitle}</h3>
            <p className="text-sm font-medium text-slate-500">Farmer: <span className="font-bold">{req.farmerId?.name}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Date</p>
              <p className="font-black text-slate-700">{new Date(req.scheduledDate).toDateString()}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Workers Req.</p>
              <p className="font-black text-emerald-600 text-sm">{req.requiredWorkers}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Offered Rate (Per Worker)</p>
              <p className={`font-black text-lg ${isMyTurn ? 'text-amber-600' : 'text-slate-800'}`}>
                ₹{lastNeg?.rate || req.farmerOfferedRatePerWorker} <span className="text-xs text-slate-400">/{req.rateUnit}</span>
              </p>
              <p className="text-[10px] text-slate-500 font-bold mt-1">Est. Total: ₹{(lastNeg?.rate || req.farmerOfferedRatePerWorker) * req.requiredWorkers}</p>
            </div>
          </div>

          {/* Negotiation Phase */}
          {isMyTurn && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              {activeNegotiationId === req._id ? (
                <div className="flex gap-2">
                  <input type="number" value={counterRate} onChange={e => setCounterRate(e.target.value)} placeholder="Rate per worker ₹" className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
                  <button onClick={() => handleAction(req._id, 'counter', counterRate)} className="bg-amber-500 text-white px-4 rounded-xl font-bold text-xs">Send</button>
                  <button onClick={() => setActiveNegotiationId(null)} className="bg-slate-100 text-slate-600 px-3 rounded-xl"><FiX /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => handleAction(req._id, 'accept')} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-xs">Accept Offer</button>
                  <button onClick={() => setActiveNegotiationId(req._id)} className="flex-1 bg-amber-50 text-amber-600 border border-amber-200 py-2.5 rounded-xl font-bold text-xs">Counter</button>
                </div>
              )}
            </div>
          )}

          {/* Dispatch Phase */}
          {req.status === 'leader_accepted' && (
            <div className="mt-4">
              <button onClick={() => handleDispatch(req._id)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-sm">
                Dispatch to Team Members
              </button>
            </div>
          )}

          {/* Selection Phase */}
          {(req.status === 'collecting_members' || req.status === 'selection_pending') && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="font-black text-sm text-slate-800 mb-3">Member Responses</h4>
              <div className="space-y-2 mb-4">
                {req.memberRequests.map(m => (
                  <div key={m._id} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl text-xs">
                    <span className="font-bold">{m.workerId?.name}</span>
                    <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[9px] ${
                      m.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                      m.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>

              {activeSelectionId === req._id ? (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 mb-2">Select up to {req.requiredWorkers} workers:</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {req.memberRequests.filter(m => m.status === 'accepted').map(m => (
                      <label key={m._id} className={`flex items-center gap-2 p-2 rounded-xl border ${selectedWorkers.includes(m.workerId._id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                        <input type="checkbox" checked={selectedWorkers.includes(m.workerId._id)} onChange={() => toggleWorkerSelection(m.workerId._id)} className="accent-emerald-600" />
                        <span className="text-xs font-bold">{m.workerId.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => submitSelection(req._id, req.requiredWorkers)} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl font-bold text-xs">Confirm Selection</button>
                    <button onClick={() => setActiveSelectionId(null)} className="px-4 bg-slate-100 text-slate-600 rounded-xl"><FiX /></button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setActiveSelectionId(req._id);
                    // Pre-select leader himself if he is in the accepted list? (We'll just let them choose)
                  }}
                  className="w-full bg-slate-800 text-white py-3 rounded-xl font-black text-sm"
                  disabled={req.memberRequests.filter(m => m.status === 'accepted').length === 0}
                >
                  Finalize Team Selection
                </button>
              )}
            </div>
          )}

          {req.status === 'confirmed' && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <p className="text-xs font-black text-emerald-700">✓ Booking Confirmed & Workers Assigned</p>
            </div>
          )}

        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Helmet><title>Group Requests | Agroyilt</title></Helmet>
      <div className="bg-emerald-700 sticky top-0 z-40 px-5 py-4 flex items-center gap-4 text-white">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-95">
          <FiArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black">Team Group Requests</h1>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6">
        {loading ? <p className="text-center font-bold text-slate-500">Loading...</p> : 
         requests.length === 0 ? <p className="text-center font-bold text-slate-500">No group requests</p> :
         requests.map(renderRequest)}
      </div>
    </div>
  );
};

export default WorkerGroupRequests;
