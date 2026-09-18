import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch,
  FiFilter,
  FiDownload,
  FiUser,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiAlertCircle,
  FiDollarSign,
  FiRefreshCcw,
  FiAward,
  FiCreditCard,
  FiPhone,
  FiBriefcase,
  FiPlus,
  FiX,
  FiCopy,
  FiCheck,
  FiExternalLink,
  FiArrowUpRight,
  FiArrowDownLeft
} from 'react-icons/fi';
import { adminTransactionService } from '../../../../services/adminTransactionService';
import workerService from '../../services/workerService';
import toast from 'react-hot-toast';
import { exportToCSV } from '../../../../utils/csvExport';
import { formatCurrency } from '../../utils/adminHelpers';
import { useNavigate } from 'react-router-dom';

const WorkerPayments = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalRefunds: 0,
    netRevenue: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all'
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Pay Worker Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [workersList, setWorkersList] = useState([]);
  const [payFormData, setPayFormData] = useState({
    workerId: '',
    amount: '',
    reference: '',
    notes: '',
    paymentMethod: 'bank_transfer'
  });
  const [submittingPay, setSubmittingPay] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 450);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [response, statsRes] = await Promise.all([
        adminTransactionService.getAllTransactions({
          page: pagination.page,
          limit: pagination.limit,
          search: debouncedSearch,
          status: filters.status,
          type: filters.type,
          entity: 'worker'
        }),
        adminTransactionService.getTransactionStats({ entity: 'worker' })
      ]);

      if (response.success) {
        setTransactions(response.data || []);
        if (response.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.pagination.total,
            pages: response.pagination.pages
          }));
        }
      }

      if (statsRes.success) {
        setStats(statsRes.data || { totalRevenue: 0, totalRefunds: 0, netRevenue: 0 });
      }
    } catch (error) {
      console.error('Error fetching worker transactions:', error);
      toast.error('Failed to load worker transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.page, debouncedSearch, filters.status, filters.type]);

  // Load workers for pay modal
  const openPayModal = async () => {
    setIsPayModalOpen(true);
    try {
      const res = await workerService.getAllWorkers({ limit: 100, approvalStatus: 'approved' });
      if (res.success && res.data) {
        setWorkersList(res.data);
      }
    } catch (err) {
      console.error('Failed to load workers list:', err);
    }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payFormData.workerId) {
      toast.error('Please select a worker');
      return;
    }
    if (!payFormData.amount || isNaN(payFormData.amount) || Number(payFormData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSubmittingPay(true);
      const res = await workerService.payWorker(payFormData.workerId, {
        amount: Number(payFormData.amount),
        reference: payFormData.reference || `ADMIN-PAY-${Date.now().toString().slice(-6)}`,
        notes: payFormData.notes || `Manual payout by admin (${payFormData.paymentMethod})`
      });

      if (res.success) {
        toast.success(res.message || 'Payment recorded successfully');
        setIsPayModalOpen(false);
        setPayFormData({ workerId: '', amount: '', reference: '', notes: '', paymentMethod: 'bank_transfer' });
        fetchData();
      }
    } catch (err) {
      console.error('Pay worker error:', err);
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmittingPay(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('ID copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'cancelled':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <FiCheckCircle className="w-3.5 h-3.5 mr-1" />;
      case 'pending':
        return <FiClock className="w-3.5 h-3.5 mr-1" />;
      case 'failed':
        return <FiXCircle className="w-3.5 h-3.5 mr-1" />;
      default:
        return <FiAlertCircle className="w-3.5 h-3.5 mr-1" />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'earnings_credit':
      case 'credit':
        return {
          label: 'Earnings Credited',
          className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          icon: <FiArrowDownLeft className="text-emerald-600 mr-1" />
        };
      case 'worker_payment':
      case 'settlement':
        return {
          label: 'Payout / Paid',
          className: 'text-blue-700 bg-blue-50 border-blue-200',
          icon: <FiArrowUpRight className="text-blue-600 mr-1" />
        };
      case 'cash_collected':
        return {
          label: 'Cash Collected',
          className: 'text-amber-700 bg-amber-50 border-amber-200',
          icon: <FiDollarSign className="text-amber-600 mr-1" />
        };
      case 'withdrawal':
      case 'debit':
        return {
          label: 'Withdrawal / Debit',
          className: 'text-rose-700 bg-rose-50 border-rose-200',
          icon: <FiArrowUpRight className="text-rose-600 mr-1" />
        };
      case 'penalty':
      case 'tds_deduction':
        return {
          label: 'Deduction / Penalty',
          className: 'text-purple-700 bg-purple-50 border-purple-200',
          icon: <FiAlertCircle className="text-purple-600 mr-1" />
        };
      default:
        return {
          label: (type || 'Payment').replace(/_/g, ' ').toUpperCase(),
          className: 'text-slate-700 bg-slate-50 border-slate-200',
          icon: <FiCreditCard className="mr-1" />
        };
    }
  };

  const handleExport = () => {
    if (!transactions || transactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    exportToCSV(transactions, 'worker_payments', [
      { key: '_id', label: 'Transaction ID' },
      { key: 'referenceId', label: 'Reference ID' },
      { key: 'workerId.name', label: 'Worker Name' },
      { key: 'workerId.phone', label: 'Phone' },
      { key: 'workerId.workerType', label: 'Worker Type' },
      { key: 'bookingId.bookingNumber', label: 'Booking Number' },
      { key: 'type', label: 'Type' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Date', type: 'datetime' },
      { key: 'description', label: 'Description' }
    ]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header Section */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FiDollarSign className="text-blue-600" />
            Worker Payments & Payouts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track farm worker earnings, completed payouts, settlements, cash collections, and dues.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={openPayModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
          >
            <FiPlus size={16} /> Record Payout
          </button>
          <button
            onClick={handleExport}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <FiDownload size={14} /> Export
          </button>
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh"
          >
            <FiRefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Earnings */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-3xl shadow-lg shadow-emerald-500/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Total Worker Earnings</span>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <FiDollarSign size={18} />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black">{formatCurrency(stats.totalRevenue || 0)}</h3>
          <p className="text-[11px] text-emerald-100 mt-2 font-medium">Credited to farm workers & team leaders</p>
        </div>

        {/* Payouts Disbursed */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-5 rounded-3xl shadow-lg shadow-blue-500/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Disbursed / Payouts</span>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <FiArrowUpRight size={18} />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black">{formatCurrency(stats.totalRefunds || 0)}</h3>
          <p className="text-[11px] text-blue-100 mt-2 font-medium">Bank transfers & manual settlements</p>
        </div>

        {/* Net Balance / Volume */}
        <div className="bg-gradient-to-br from-purple-500 to-violet-600 text-white p-5 rounded-3xl shadow-lg shadow-purple-500/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-purple-100 uppercase tracking-wider">Net Transaction Value</span>
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <FiCheckCircle size={18} />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black">{formatCurrency(stats.netRevenue || stats.totalRevenue || 0)}</h3>
          <p className="text-[11px] text-purple-100 mt-2 font-medium">Total processed worker transactions</p>
        </div>
      </div>

      {/* Filters Container */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
          <input
            type="text"
            placeholder="Search by Worker name, phone, Txn ID, or Booking #..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          {filters.search && (
            <button
              onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <FiX />
            </button>
          )}
        </div>

        {/* Status & Type Selectors */}
        <div className="flex items-center gap-2">
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="earnings_credit">Earnings Credit</option>
            <option value="worker_payment">Worker Payout</option>
            <option value="settlement">Settlement</option>
            <option value="cash_collected">Cash Collected</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="penalty">Penalty / Deduction</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FiDollarSign className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <h4 className="text-base font-bold text-slate-700">No worker payments found</h4>
            <p className="text-xs text-slate-500 mt-1">Transactions related to workers will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Transaction / Ref ID</th>
                  <th className="py-3.5 px-4">Worker Details</th>
                  <th className="py-3.5 px-4">Booking / Context</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Payment Method</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {transactions.map((txn) => {
                  const typeBadge = getTypeBadge(txn.type);
                  const isTeamLeader = txn.workerId?.workerType === 'TEAM_LEADER';
                  const refId = txn.referenceId || `#${txn._id.slice(-6).toUpperCase()}`;

                  return (
                    <tr key={txn._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Ref ID */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                          <span>{refId}</span>
                          <button
                            onClick={() => handleCopy(txn.referenceId || txn._id, txn._id)}
                            className="text-slate-400 hover:text-blue-600 transition-colors p-0.5"
                            title="Copy ID"
                          >
                            {copiedId === txn._id ? <FiCheck className="text-emerald-500" size={13} /> : <FiCopy size={13} />}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans block truncate max-w-[120px]">
                          {txn.description}
                        </span>
                      </td>

                      {/* Worker Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {txn.workerId?.profilePhoto || txn.workerId?.profileImage ? (
                            <img
                              src={txn.workerId?.profilePhoto || txn.workerId?.profileImage}
                              alt={txn.workerId?.name}
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isTeamLeader ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {txn.workerId?.name?.charAt(0) ?.toUpperCase() || 'W'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-bold text-slate-900 truncate">{txn.workerId?.name || 'Worker'}</p>
                              {isTeamLeader && (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded">
                                  Leader
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono">{txn.workerId?.phone || 'N/A'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Booking / Context */}
                      <td className="py-3.5 px-4">
                        {txn.bookingId ? (
                          <div>
                            <button
                              onClick={() => navigate(`/admin/bookings/${txn.bookingId._id || txn.bookingId}`)}
                              className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                            >
                              #{txn.bookingId.bookingNumber || txn.bookingId._id?.slice(-6) ?.toUpperCase()}
                              <FiExternalLink size={11} />
                            </button>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[120px]">
                              {txn.bookingId.serviceName || txn.bookingId.userId?.name || 'Farm Job'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Direct Payout / Fee</span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${typeBadge.className}`}>
                          {typeBadge.icon}
                          {typeBadge.label}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                        {formatCurrency(txn.amount || 0)}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold uppercase tracking-wider">
                          {txn.paymentMethod || 'Wallet'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusColor(txn.status)}`}>
                          {getStatusIcon(txn.status)}
                          {txn.status?.toUpperCase() || 'COMPLETED'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {txn.createdAt ? new Date(txn.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                        <span className="text-[10px] text-slate-400 block">
                          {txn.createdAt ? new Date(txn.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedTxn(txn)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-xl text-xs font-bold transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Page {pagination.page} of {pagination.pages} ({pagination.total} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Payout Modal */}
      <AnimatePresence>
        {isPayModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <FiDollarSign size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900">Record Worker Payout</h3>
                    <p className="text-xs text-slate-500">Credit payment directly to a worker's account</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPayModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handlePaySubmit} className="space-y-4 text-xs">
                {/* Select Worker */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Select Farm Worker / Team Leader *</label>
                  <select
                    value={payFormData.workerId}
                    onChange={(e) => setPayFormData(prev => ({ ...prev, workerId: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Choose Worker --</option>
                    {workersList.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name} ({w.phone}) - {w.workerType === 'TEAM_LEADER' ? '👑 Team Leader' : '👷 Worker'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payout Amount (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-slate-400">₹</span>
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      value={payFormData.amount}
                      onChange={(e) => setPayFormData(prev => ({ ...prev, amount: e.target.value }))}
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={payFormData.paymentMethod}
                    onChange={(e) => setPayFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT / IMPS / UPI)</option>
                    <option value="cash">Cash Settlement</option>
                    <option value="wallet">Wallet Balance Credit</option>
                    <option value="razorpay">Online Payment Gateway</option>
                  </select>
                </div>

                {/* Reference */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Reference / UTR / Transaction No. (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-928374928"
                    value={payFormData.reference}
                    onChange={(e) => setPayFormData(prev => ({ ...prev, reference: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Notes / Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Weekly farm labor payout for harvesting job"
                    value={payFormData.notes}
                    onChange={(e) => setPayFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPay}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition-colors disabled:opacity-50"
                  >
                    {submittingPay ? 'Recording...' : 'Confirm Payout'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {selectedTxn && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <FiDollarSign size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900">Worker Payment Receipt</h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {selectedTxn.referenceId || `#${selectedTxn._id.slice(-6).toUpperCase()}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTxn(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Amount Banner */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Amount</span>
                    <span className="text-2xl font-black text-slate-900">
                      {formatCurrency(selectedTxn.amount || 0)}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full font-bold border ${getStatusColor(selectedTxn.status)}`}>
                    {selectedTxn.status?.toUpperCase() || 'COMPLETED'}
                  </span>
                </div>

                {/* Worker Details */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Worker Information</span>
                  <p className="font-bold text-slate-800 text-sm">{selectedTxn.workerId?.name || 'Worker'}</p>
                  <p className="text-slate-500 flex items-center gap-1"><FiPhone size={12} /> {selectedTxn.workerId?.phone || 'N/A'}</p>
                  <span className="inline-block mt-1 bg-white text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                    Role: {selectedTxn.workerId?.workerType === 'TEAM_LEADER' ? '👑 Team Leader' : '👷 Independent Worker'}
                  </span>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Payment Method</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedTxn.paymentMethod || 'Wallet'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Type</span>
                    <span className="font-bold text-slate-800 capitalize">{selectedTxn.type?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Date & Time</span>
                    <span className="font-bold text-slate-800">
                      {selectedTxn.createdAt ? new Date(selectedTxn.createdAt).toLocaleString('en-IN') : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Linked Booking</span>
                    {selectedTxn.bookingId ? (
                      <span className="font-bold text-blue-600">
                        #{selectedTxn.bookingId.bookingNumber || selectedTxn.bookingId._id?.slice(-6) ?.toUpperCase()}
                      </span>
                    ) : (
                      <span className="font-bold text-slate-500">None (Direct Payout)</span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {selectedTxn.description && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Description / Note</span>
                    <p className="font-medium text-slate-700 mt-0.5">{selectedTxn.description}</p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedTxn(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WorkerPayments;
