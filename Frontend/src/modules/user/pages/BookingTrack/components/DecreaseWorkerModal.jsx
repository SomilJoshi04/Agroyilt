import React, { useState } from 'react';
import { FiX, FiAlertTriangle, FiCheck, FiUserX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../../../services/api';

/**
 * DecreaseWorkerModal
 *
 * Allows Farmer to decrease an individual worker on a DAILY booking.
 * The worker will complete the current day's work and be settled upon completion.
 * Future days will not be worked and unused reserve will be refunded.
 */
const DecreaseWorkerModal = ({ isOpen, onClose, worker, requestId, onDecreased }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !worker) return null;

  const handleDecrease = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/users/farmer-worker-request/${requestId}/decrease-worker`, {
        assignmentId: worker.assignmentId,
        reason: reason.trim() || 'Decreased by farmer'
      });

      if (res.data?.success) {
        toast.success(`Worker ${worker.workerName} schedule concluded after today.`);
        if (onDecreased) onDecreased(res.data.data);
        onClose();
      } else {
        toast.error(res.data?.message || 'Failed to decrease worker');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decrease worker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all"
        >
          <FiX size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <FiUserX size={24} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg">Decrease Worker</h3>
            <p className="text-xs text-slate-500">Stop future days for {worker.workerName}</p>
          </div>
        </div>

        {/* Warning Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex gap-3 items-start">
          <FiAlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-amber-800 leading-relaxed">
            <p className="font-bold mb-1">Important Rule:</p>
            <p>
              {worker.workerName} will finish today’s work and must verify the Completion OTP. Once today’s work is completed, their wallet will be settled for actual worked days. Future days will be cancelled and unused payment reserve will be refunded to your wallet.
            </p>
          </div>
        </div>

        {/* Reason Input */}
        <div className="mb-5">
          <label className="text-xs font-bold text-slate-600 mb-1 block">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Farm work completed faster than expected, reducing team size..."
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDecrease}
            disabled={loading}
            className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FiCheck size={14} />
                <span>Confirm Decrease</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecreaseWorkerModal;
