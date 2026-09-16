import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSearch, 
  FiCheckCircle, 
  FiXCircle, 
  FiSlash, 
  FiUser, 
  FiUsers, 
  FiStar, 
  FiTrash2, 
  FiEye, 
  FiX, 
  FiExternalLink, 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiFileText, 
  FiDollarSign, 
  FiAlertCircle, 
  FiBriefcase,
  FiShield
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import workerService from '../../services/workerService';
import LogoLoader from '../../../../components/common/LogoLoader';

const StatusBadge = ({ status }) => {
  const styles = {
    approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border border-amber-200',
    suspended: 'bg-rose-100 text-rose-700 border border-rose-200',
    rejected: 'bg-slate-100 text-slate-700 border border-slate-200'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 ${styles[status] || styles.pending}`}>
      {status === 'approved' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
      {status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
      {status === 'rejected' && <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>}
      {status === 'suspended' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>}
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

  // Worker Details & Document Modal State
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerStats, setWorkerStats] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await workerService.getAllWorkers({
        search,
        approvalStatus: statusFilter || undefined,
        limit: 100
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

  // Open worker details modal and fetch full details
  const handleOpenDetails = async (worker) => {
    setSelectedWorker(worker);
    setIsDetailsModalOpen(true);
    setDetailsLoading(true);
    try {
      const res = await workerService.getWorkerDetails(worker._id);
      if (res && res.success) {
        setSelectedWorker(res.data.worker || res.data);
        setWorkerStats(res.data.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch full worker details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

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
        
        // If the action was performed on the currently open modal worker
        if (selectedWorker && selectedWorker._id === id) {
          if (actionStr === 'delete') {
            setIsDetailsModalOpen(false);
            setSelectedWorker(null);
          } else {
            setSelectedWorker(prev => ({
              ...prev,
              approvalStatus: actionStr === 'approve' ? 'approved' : actionStr === 'reject' ? 'rejected' : actionStr === 'suspend' ? 'suspended' : prev.approvalStatus,
              isActive: actionStr === 'approve' ? true : actionStr === 'suspend' ? false : prev.isActive
            }));
          }
        }

        fetchWorkers();
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
                        {/* Eye Button - View Details & Documents */}
                        <button
                          onClick={() => handleOpenDetails(worker)}
                          className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm hover:shadow"
                          title="View Details & Documents"
                        >
                          <FiEye size={16} />
                        </button>

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

      {/* Worker Details & Documents Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedWorker && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100000] flex items-center justify-center p-2.5 sm:p-6 pb-20 sm:pb-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[82vh] sm:max-h-[88vh] border border-slate-100 my-auto"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-lg sm:text-xl flex items-center justify-center overflow-hidden shadow-md shrink-0">
                    {selectedWorker.profilePhoto ? (
                      <img src={selectedWorker.profilePhoto} alt={selectedWorker.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedWorker.name?.charAt(0)?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-xl font-black text-slate-900 truncate">{selectedWorker.name}</h3>
                      <StatusBadge status={selectedWorker.approvalStatus} />
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                      <span className="flex items-center gap-1"><FiPhone className="text-blue-500 shrink-0" /> {selectedWorker.phone}</span>
                      {selectedWorker.email && (
                        <span className="hidden sm:flex items-center gap-1"><FiMail className="text-indigo-500 shrink-0" /> {selectedWorker.email}</span>
                      )}
                      <span className="bg-slate-200/70 text-slate-700 font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                        {selectedWorker.workerType === 'TEAM_LEADER' ? <FiUsers /> : <FiUser />}
                        {selectedWorker.workerType === 'TEAM_LEADER' ? 'Team Leader' : 'Independent'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedWorker(null);
                  }}
                  className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
                {detailsLoading ? (
                  <div className="py-12 flex justify-center items-center">
                    <LogoLoader />
                  </div>
                ) : (
                  <>
                    {/* Rejection Notice if applicable */}
                    {selectedWorker.approvalStatus === 'rejected' && (
                      <div className="p-3.5 sm:p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
                        <FiAlertCircle className="text-red-600 text-xl shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Application Rejected</p>
                          <p className="text-sm text-red-700 mt-0.5 font-medium">
                            {selectedWorker.rejectionReason || 'No specific reason provided.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Verification Documents (Aadhar Card) Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                          <FiShield className="text-blue-600" /> Verification Documents
                        </h4>
                        {selectedWorker.aadhar?.number && (
                          <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                            Aadhar: {selectedWorker.aadhar.number}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {/* Aadhar Front */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <FiFileText className="text-blue-500" /> Aadhar Front
                            </span>
                            {selectedWorker.aadhar?.document && (
                              <a
                                href={selectedWorker.aadhar.document}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 hover:underline"
                              >
                                Full View <FiExternalLink size={12} />
                              </a>
                            )}
                          </div>

                          {selectedWorker.aadhar?.document ? (
                            <div 
                              onClick={() => setPreviewImage(selectedWorker.aadhar.document)}
                              className="relative group rounded-xl overflow-hidden bg-slate-900/5 aspect-[16/10] border border-slate-200 flex items-center justify-center cursor-pointer"
                            >
                              <img
                                src={selectedWorker.aadhar.document}
                                alt="Aadhar Front"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                                <FiEye size={16} /> Click to Zoom
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border-2 border-dashed border-slate-200 aspect-[16/10] flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                              <FiFileText size={24} className="mb-1 text-slate-300" />
                              <span className="text-xs font-semibold">Front not uploaded</span>
                            </div>
                          )}
                        </div>

                        {/* Aadhar Back */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <FiFileText className="text-blue-500" /> Aadhar Back
                            </span>
                            {selectedWorker.aadhar?.backDocument && (
                              <a
                                href={selectedWorker.aadhar.backDocument}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 hover:underline"
                              >
                                Full View <FiExternalLink size={12} />
                              </a>
                            )}
                          </div>

                          {selectedWorker.aadhar?.backDocument ? (
                            <div 
                              onClick={() => setPreviewImage(selectedWorker.aadhar.backDocument)}
                              className="relative group rounded-xl overflow-hidden bg-slate-900/5 aspect-[16/10] border border-slate-200 flex items-center justify-center cursor-pointer"
                            >
                              <img
                                src={selectedWorker.aadhar.backDocument}
                                alt="Aadhar Back"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5">
                                <FiEye size={16} /> Click to Zoom
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border-2 border-dashed border-slate-200 aspect-[16/10] flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                              <FiFileText size={24} className="mb-1 text-slate-300" />
                              <span className="text-xs font-semibold">Back not uploaded</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Rating</span>
                        <div className="flex items-center gap-1 font-black text-amber-500 text-sm sm:text-base mt-0.5">
                          <FiStar className="fill-amber-500" /> {selectedWorker.rating?.toFixed(1) || '0.0'}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Jobs</span>
                        <p className="font-black text-slate-800 text-sm sm:text-base mt-0.5">
                          {workerStats?.totalJobs ?? selectedWorker.totalJobs ?? 0}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
                        <p className="font-black text-emerald-600 text-sm sm:text-base mt-0.5">
                          {workerStats?.completedJobs ?? selectedWorker.completedJobs ?? 0}
                        </p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Reg. Fee</span>
                        <p className={`font-black text-xs mt-1 uppercase ${selectedWorker.registrationFeeStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {selectedWorker.registrationFeeStatus || 'UNPAID'}
                        </p>
                      </div>
                    </div>

                    {/* Skills & Pricing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {/* Skills & Categories */}
                      <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100 space-y-2.5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <FiBriefcase className="text-blue-500" /> Skills & Services
                        </h4>
                        <div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedWorker.skills?.length > 0 ? (
                              selectedWorker.skills.map((s, idx) => (
                                <span key={idx} className="bg-white border border-blue-200 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-lg shadow-2xs">
                                  {s}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">No skills specified</span>
                            )}
                          </div>
                        </div>

                        {selectedWorker.serviceCategories?.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60">
                            <span className="text-[10px] text-slate-400 font-bold block mb-1">Categories:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedWorker.serviceCategories.map((c, idx) => (
                                <span key={idx} className="bg-slate-200/80 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-lg">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Standard Pricing */}
                      <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100 space-y-2.5">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <FiDollarSign className="text-emerald-500" /> Standard Rates
                        </h4>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs bg-white p-2 rounded-xl border border-slate-200/80">
                            <span className="text-slate-500 font-medium">Hourly Rate:</span>
                            <span className="font-black text-slate-800">₹{selectedWorker.hourlyRate || 0} / hr</span>
                          </div>
                          <div className="flex justify-between items-center text-xs bg-white p-2 rounded-xl border border-slate-200/80">
                            <span className="text-slate-500 font-medium">Daily Rate:</span>
                            <span className="font-black text-slate-800">₹{selectedWorker.dailyRate || 0} / day</span>
                          </div>
                          <div className="flex justify-between items-center text-xs bg-white p-2 rounded-xl border border-slate-200/80">
                            <span className="text-slate-500 font-medium">Land Rate:</span>
                            <span className="font-black text-slate-800">₹{selectedWorker.landRate || 0} / acre</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Address & Location */}
                    <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-100 space-y-1.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <FiMapPin className="text-rose-500" /> Address Details
                      </h4>
                      <div className="text-xs text-slate-600 font-medium space-y-0.5">
                        <p>
                          <span className="font-bold text-slate-700">Full Address: </span>
                          {selectedWorker.address?.fullAddress || selectedWorker.address?.addressLine1 || 'Not specified'}
                        </p>
                        {(selectedWorker.address?.city || selectedWorker.address?.state || selectedWorker.address?.pincode) && (
                          <p className="text-slate-500">
                            {[selectedWorker.address?.city, selectedWorker.address?.state, selectedWorker.address?.pincode]
                              .filter(Boolean)
                              .join(', ')}
                            {selectedWorker.address?.landmark && ` (Near ${selectedWorker.address.landmark})`}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer - Actions (Approve, Reject, Delete, Close) */}
              <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/95 backdrop-blur-xs flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleAction(selectedWorker._id, 'delete')}
                  disabled={actionLoading === selectedWorker._id}
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FiTrash2 size={14} /> Delete Worker
                </button>

                <div className="w-full sm:w-auto flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Reject button */}
                  {selectedWorker.approvalStatus !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => handleAction(selectedWorker._id, 'reject')}
                      disabled={actionLoading === selectedWorker._id}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <FiXCircle size={15} /> Reject
                    </button>
                  )}

                  {/* Approve / Re-activate button */}
                  {selectedWorker.approvalStatus !== 'approved' && (
                    <button
                      type="button"
                      onClick={() => handleAction(selectedWorker._id, 'approve')}
                      disabled={actionLoading === selectedWorker._id}
                      className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <FiCheckCircle size={15} /> Approve Worker
                    </button>
                  )}

                  {/* Suspend button if approved */}
                  {selectedWorker.approvalStatus === 'approved' && (
                    <button
                      type="button"
                      onClick={() => handleAction(selectedWorker._id, 'suspend')}
                      disabled={actionLoading === selectedWorker._id}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-100 text-amber-800 hover:bg-amber-600 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <FiSlash size={14} /> Suspend
                    </button>
                  )}

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setSelectedWorker(null);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer text-center justify-center"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div 
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100001] flex items-center justify-center p-3 sm:p-6 cursor-zoom-out"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 text-white hover:bg-black flex items-center justify-center cursor-pointer"
              >
                <FiX size={20} />
              </button>
              <img
                src={previewImage}
                alt="Document Preview"
                className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain mx-auto"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AllWorkers;
