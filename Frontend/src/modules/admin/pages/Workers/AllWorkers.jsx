import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiFilter, FiCheckCircle, FiXCircle, FiSlash, FiUser, FiUsers, FiStar, FiChevronDown, FiChevronUp, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import workerService from '../../services/workerService';
import LogoLoader from '../../../../components/common/LogoLoader';

const StatusBadge = ({ status }) => {
  const styles = {
    approved: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    suspended: 'bg-red-100 text-red-700',
    rejected: 'bg-slate-100 text-slate-700'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
};

const AllWorkers = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await workerService.getAllWorkers({
        search,
        approvalStatus: statusFilter || undefined,
        limit: 100 // Get a good batch
      });
      if (res.success) {
        setWorkers(res.data);
      }
    } catch (err) {
      toast.error('Failed to load workers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchWorkers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, statusFilter]);

  const handleAction = async (id, actionStr) => {
    try {
      setActionLoading(id);
      let res;
      if (actionStr === 'approve') {
        res = await workerService.approveWorker(id);
      } else if (actionStr === 'reject') {
        const reason = window.prompt('Enter reason for rejecting this worker application (optional):');
        if (reason === null) {
          setActionLoading(null);
          return;
        }
        res = await workerService.rejectWorker(id, reason || 'Application does not meet requirements');
      } else if (actionStr === 'suspend') {
        res = await workerService.suspendWorker(id);
      } else if (actionStr === 'delete') {
        if (!window.confirm('Are you sure you want to delete this worker? This action cannot be undone.')) {
          setActionLoading(null);
          return;
        }
        res = await workerService.deleteWorker(id);
      }
      
      if (res && res.success) {
        toast.success(res.message || `Worker ${actionStr}d successfully`);
        fetchWorkers(); // Refresh
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${actionStr} worker`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <FiSearch className="text-slate-400 mr-3" />
          <input
            type="text"
            placeholder="Search by name, phone, or skill..."
            className="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 overflow-x-auto">
        {[
          { id: '', label: 'All Workers' },
          { id: 'pending', label: '⏳ Pending Approval' },
          { id: 'approved', label: '✅ Approved' },
          { id: 'rejected', label: '❌ Rejected' },
          { id: 'suspended', label: '⚠️ Suspended' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              statusFilter === tab.id
                ? tab.id === 'pending'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : tab.id === 'approved'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : tab.id === 'rejected'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : tab.id === 'suspended'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <LogoLoader />
        </div>
      ) : workers.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiUsers className="text-slate-400 text-2xl" />
          </div>
          <h3 className="text-lg font-black text-slate-800">No workers found</h3>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search term.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider font-black text-slate-500">
                <th className="py-4 px-4">Worker</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Skills</th>
                <th className="py-4 px-4 text-center">Rating</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {workers.map((worker) => (
                  <motion.tr
                    key={worker._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-500 shrink-0">
                          {worker.profilePhoto ? (
                            <img src={worker.profilePhoto} alt={worker.name} className="w-full h-full object-cover" />
                          ) : (
                            worker.name?.charAt(0)?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{worker.name}</p>
                          <p className="text-xs font-medium text-slate-500">{worker.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg inline-flex">
                        {worker.workerType === 'TEAM_LEADER' ? <FiUsers /> : <FiUser />}
                        {worker.workerType === 'TEAM_LEADER' ? 'Team Leader' : 'Independent'}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {worker.skills?.slice(0, 2).map((skill, i) => (
                          <span key={i} className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                            {skill}
                          </span>
                        ))}
                        {worker.skills?.length > 2 && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                            +{worker.skills.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 font-black text-amber-500 text-sm">
                        <FiStar className="fill-amber-500" />
                        {worker.rating?.toFixed(1) || '0.0'}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-bold">{worker.totalJobs || 0} jobs</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={worker.approvalStatus} />
                        {worker.approvalStatus === 'rejected' && worker.rejectionReason && (
                          <span className="text-[10px] text-red-500 max-w-[150px] truncate" title={worker.rejectionReason}>
                            {worker.rejectionReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {worker.approvalStatus === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(worker._id, 'approve')}
                              disabled={actionLoading === worker._id}
                              className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                              title="Approve Worker"
                            >
                              <FiCheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => handleAction(worker._id, 'reject')}
                              disabled={actionLoading === worker._id}
                              className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                              title="Reject Worker"
                            >
                              <FiXCircle size={16} />
                            </button>
                          </>
                        )}
                        {worker.approvalStatus === 'approved' && (
                          <button
                            onClick={() => handleAction(worker._id, 'suspend')}
                            disabled={actionLoading === worker._id}
                            className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                            title="Suspend Worker"
                          >
                            <FiSlash size={16} />
                          </button>
                        )}
                        {worker.approvalStatus === 'suspended' && (
                          <button
                            onClick={() => handleAction(worker._id, 'approve')}
                            disabled={actionLoading === worker._id}
                            className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                            title="Re-activate Worker"
                          >
                            <FiCheckCircle size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(worker._id, 'delete')}
                          disabled={actionLoading === worker._id}
                          className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
                          title="Delete Worker"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllWorkers;
