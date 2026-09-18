import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft, FiSearch, FiStar, FiMapPin, FiFilter,
  FiUser, FiAward, FiChevronRight, FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import workerBookingService from '../../../../services/workerBookingService';

const RATE_UNITS = { hourly: '/hr', daily: '/day' };

const StarRow = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(s => (
      <svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={s <= Math.round(rating) ? '#f59e0b' : '#e2e8f0'}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ))}
    <span className="text-[10px] text-slate-500 ml-1">{rating?.toFixed(1) || '0.0'}</span>
  </div>
);

const WorkerCard = ({ worker, onSelect, onCardClick }) => {
  const isLeader = worker.workerType === 'TEAM_LEADER';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onCardClick(worker)}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:border-slate-300 transition-colors"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden">
              {worker.profilePhoto
                ? <img src={worker.profilePhoto} alt={worker.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-slate-500">
                    {worker.name?.[0]?.toUpperCase()}
                  </div>
              }
            </div>
            {isLeader && (
              <span className="absolute -top-1 -right-1 bg-amber-400 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                LEADER
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-black text-slate-800 text-base truncate">{worker.name}</h3>
              {worker.approvalStatus === 'approved' && (
                <span className="text-[9px] bg-emerald-50 text-emerald-600 font-black px-1.5 py-0.5 rounded-full border border-emerald-200">✓ VERIFIED</span>
              )}
            </div>
            <StarRow rating={worker.rating} />
            <div className="flex flex-wrap gap-1 mt-2">
              {worker.skills?.slice(0, 3).map(sk => (
                <span key={sk} className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">{sk}</span>
              ))}
            </div>
          </div>

          {/* Rate */}
          <div className="shrink-0 text-right">
            <p className="text-xs text-slate-400 font-bold">Daily Rate</p>
            <p className="text-lg font-black text-slate-800">₹{worker.dailyRate || 0}</p>
            <p className="text-[10px] text-slate-400">/day</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-50">
          <div className="text-center">
            <p className="text-sm font-black text-slate-800">{worker.completedJobs || 0}</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase">Jobs Done</p>
          </div>
          {worker.address?.city && (
            <div className="flex items-center gap-1 text-slate-500 text-xs">
              <FiMapPin size={11} />
              <span className="font-medium">{worker.address.city}</span>
            </div>
          )}
          {worker.teamId && (
            <div className="flex items-center gap-1 text-amber-600 text-xs font-bold">
              <FiAward size={11} />
              <span>{worker.teamId.name}</span>
            </div>
          )}
          <div className="ml-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(worker);
              }}
              className="px-4 py-2 bg-slate-800 text-white rounded-2xl font-bold text-xs flex items-center gap-1 active:scale-95 transition-all hover:bg-slate-700"
            >
              Hire <FiChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FilterPanel = ({ filters, setFilters, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className="fixed inset-0 bg-black/40 z-50 flex items-end"
    onClick={onClose}
  >
    <div className="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-slate-800 text-lg">Filter Workers</h3>
        <button onClick={onClose}><FiX size={22} className="text-slate-500" /></button>
      </div>
      <div className="space-y-5">
        <div>
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Skill</label>
          <input
            type="text"
            placeholder="e.g. Harvesting, Ploughing"
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filters.skill}
            onChange={e => setFilters(p => ({ ...p, skill: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Min Rating</label>
          <div className="flex gap-2">
            {[0, 3, 4, 4.5].map(r => (
              <button
                key={r}
                onClick={() => setFilters(p => ({ ...p, minRating: r }))}
                className={`flex-1 py-2 rounded-2xl text-xs font-black border transition-all ${filters.minRating === r ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
              >
                {r === 0 ? 'Any' : `${r}+ ★`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Max Daily Rate (₹)</label>
          <input
            type="number"
            placeholder="e.g. 800"
            className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filters.maxRate}
            onChange={e => setFilters(p => ({ ...p, maxRate: e.target.value }))}
          />
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-full mt-6 py-4 bg-slate-800 text-white rounded-2xl font-black text-sm"
      >
        Apply Filters
      </button>
    </div>
  </motion.div>
);

const WorkerDetailsModal = ({ worker, onClose, onHire }) => {
  if (!worker) return null;
  const isLeader = worker.workerType === 'TEAM_LEADER';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full rounded-t-[2rem] flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header / Image */}
        <div className="relative h-48 bg-slate-100 rounded-t-[2rem] overflow-hidden shrink-0">
          {worker.profilePhoto ? (
            <img src={worker.profilePhoto} alt={worker.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
              <span className="text-6xl font-black text-slate-400">{worker.name?.[0]?.toUpperCase()}</span>
            </div>
          )}
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all"
          >
            <FiX size={20} />
          </button>
          
          {isLeader && (
            <div className="absolute top-4 left-4 bg-amber-400 text-white text-xs font-black px-3 py-1 rounded-full shadow-sm">
              TEAM LEADER
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                {worker.name}
                {worker.approvalStatus === 'approved' && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 font-black px-2 py-1 rounded-full border border-emerald-200">✓ VERIFIED</span>
                )}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <StarRow rating={worker.rating} />
                <span className="text-xs text-slate-400 font-bold">? {worker.completedJobs || 0} Jobs Done</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400 font-bold">Daily Rate</p>
              <p className="text-2xl font-black text-slate-800">₹{worker.dailyRate || 0}</p>
            </div>
          </div>

          {worker.address?.city && (
            <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <FiMapPin size={16} className="text-blue-500" />
              <span className="font-semibold">{worker.address.city} {worker.address.state ? `, ${worker.address.state}` : ''}</span>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
              <FiAward className="text-amber-500" /> Skills & Services
            </h3>
            <div className="flex flex-wrap gap-2">
              {worker.skills?.map(sk => (
                <span key={sk} className="text-xs bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-full border border-blue-100">
                  {sk}
                </span>
              ))}
              {(!worker.skills || worker.skills.length === 0) && (
                <span className="text-sm text-slate-400 italic">No skills listed</span>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-between gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1">
               <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">Hourly Rate</p>
               <p className="font-black text-slate-800">₹{worker.hourlyRate || 0} <span className="text-[10px] text-slate-500">/hr</span></p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1">
               <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wider">Land Rate</p>
               <p className="font-black text-slate-800">₹{worker.landRate || 0} <span className="text-[10px] text-slate-500">/acre</span></p>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-5 border-t border-slate-100 bg-white shrink-0">
          <button
            onClick={() => {
              onClose();
              onHire(worker);
            }}
            className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-lg active:scale-[0.98] transition-transform shadow-lg shadow-slate-300"
          >
            Hire {worker.name}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────

const SingleWorkerList = () => {
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ skill: '', minRating: 0, maxRate: '' });
  const [selectedWorkerDetails, setSelectedWorkerDetails] = useState(null);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await workerBookingService.listWorkers({
        skill: filters.skill || undefined,
        minRating: filters.minRating || undefined,
        maxRate: filters.maxRate || undefined
      });
      setWorkers(res.data || []);
    } catch (err) {
      toast.error('Failed to load workers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWorkers(); }, [filters]);

  const filtered = workers.filter(w =>
    !search ||
    w.name?.toLowerCase().includes(search.toLowerCase()) ||
    w.skills?.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
    w.address?.city?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (worker) => {
    navigate(`/user/worker-request/${worker._id}`, { state: { worker } });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Helmet>
        <title>Hire a Worker | Agroyilt</title>
      </Helmet>

      {/* Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-slate-100 px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/user/worker-explorer')} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600">
            <FiArrowLeft size={20} />
          </button>
          <div className="flex-1 flex items-center bg-slate-50 rounded-2xl px-4 gap-2 border border-slate-100">
            <FiSearch size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search workers by name, skill…"
              className="flex-1 py-3 bg-transparent text-sm font-medium focus:outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilter(true)}
            className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white"
          >
            <FiFilter size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-slate-600">
            {loading ? 'Loading…' : `${filtered.length} workers available`}
          </p>
          <button
            onClick={() => navigate('/user/my-worker-requests')}
            className="text-xs font-black text-blue-600"
          >
            My Requests →
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-3xl h-40 animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FiUser className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-black text-slate-700 text-lg">No Workers Found</p>
            <p className="text-slate-500 text-sm mt-2">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(w => (
              <WorkerCard 
                key={w._id} 
                worker={w} 
                onSelect={handleSelect} 
                onCardClick={(worker) => setSelectedWorkerDetails(worker)} 
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showFilter && (
          <FilterPanel filters={filters} setFilters={setFilters} onClose={() => setShowFilter(false)} />
        )}
        {selectedWorkerDetails && (
          <WorkerDetailsModal 
            worker={selectedWorkerDetails} 
            onClose={() => setSelectedWorkerDetails(null)} 
            onHire={handleSelect} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default SingleWorkerList;
