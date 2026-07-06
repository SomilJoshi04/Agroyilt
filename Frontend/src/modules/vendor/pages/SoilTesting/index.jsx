import React, { useState, useEffect } from 'react';
import {
    FiChevronLeft, FiMapPin, FiUser, FiActivity,
    FiUpload, FiCheckCircle, FiClock, FiAlertCircle, FiX, FiImage, FiFileText
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import vendorSoilTestService from '../../../../services/vendorSoilTestService';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Status Config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    assigned:         { label: 'Assigned — Ready to Start', color: 'blue',    icon: FiClock },
    sample_collected: { label: 'Sample Collected',            color: 'purple',  icon: FiActivity },
    at_lab:           { label: 'In Laboratory',             color: 'indigo',  icon: FiActivity },
    completed:        { label: 'Completed ✓',               color: 'emerald', icon: FiCheckCircle },
    cancelled:        { label: 'Cancelled',                 color: 'slate',   icon: FiAlertCircle },
};

const TRACKING_STEPS = [
    { key: 'assigned',         label: 'Assigned' },
    { key: 'sample_collected', label: 'Collected' },
    { key: 'at_lab',           label: 'Lab Process' },
    { key: 'completed',        label: 'Finalized' },
];

const stepIndex = (status) => TRACKING_STEPS.findIndex(s => s.key === status);

// ─── Component ────────────────────────────────────────────────────────────────
const VendorSoilTests = () => {
    const navigate = useNavigate();
    const [requests, setRequests]       = useState([]);
    const [loading, setLoading]         = useState(true);
    const [activeRequest, setActive]    = useState(null); // for action modal
    const [reportUrl, setReportUrl]     = useState('');
    const [saving, setSaving]           = useState(false);
    const [modalType, setModalType]     = useState(''); // 'status' | 'report' | 'reject'
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => { 
        fetchMyRequests(false); 
        
        // AUTO UPDATE: Poll for new requests every 30 seconds
        const pollInterval = setInterval(() => fetchMyRequests(true), 30000);
        return () => clearInterval(pollInterval);
    }, []);

    // BACKGROUND SCROLL LOCK: Prevent scrolling when any modal is open
    useEffect(() => {
        if (modalType) {
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none'; // Further safety for mobile
        } else {
            document.body.style.overflow = 'unset';
            document.body.style.touchAction = 'auto';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.touchAction = 'auto';
        };
    }, [modalType]);

    const fetchMyRequests = async (isPolling = false) => {
        try {
            if (!isPolling) setLoading(true);
            const res = await vendorSoilTestService.getMyRequests();
            if (res.success) setRequests(res.data);
        } catch {
            if (!isPolling) toast.error('Failed to load requests');
        } finally {
            if (!isPolling) setLoading(false);
        }
    };

    const openStatusModal = (req) => { setActive(req); setModalType('status'); };
    const openReportModal = (req) => { 
        setActive(req); 
        setReportUrl(''); 
        setSelectedFile(null);
        setFilePreview(null);
        setModalType('report'); 
    };
    const openRejectModal = (req) => {
        setActive(req);
        setRejectionReason('');
        setModalType('reject');
    };
    const closeModal = () => { setActive(null); setModalType(''); setSelectedFile(null); setFilePreview(null); setRejectionReason(''); };

    const handleUpdateStatus = async (newStatus) => {
        try {
            setSaving(true);
            const res = await vendorSoilTestService.updateStatus(activeRequest._id, newStatus);
            if (res.success) {
                toast.success('Status updated successfully!');
                closeModal();
                fetchMyRequests(false);
            }
        } catch { toast.error('Failed to update status'); }
        finally { setSaving(false); }
    };

    // ─── File Upload Helper ───────────────────────────────────────────────────
    const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        let baseUrl = import.meta.env.VITE_API_BASE_URL || '';
        baseUrl = baseUrl.replace(/\/api$/, '');
        if (!baseUrl && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            baseUrl = 'http://localhost:5000';
        }
        const response = await fetch(`${baseUrl}/api/image/upload`, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Upload failed');
        return data.imageUrl;
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) return toast.error('Maximum file size is 10MB');
            setSelectedFile(file);
            if (file.type.startsWith('image/')) {
                setFilePreview(URL.createObjectURL(file));
            } else {
                setFilePreview(null);
            }
        }
    };

    const handleUploadReport = async (e) => {
        if (!selectedFile && !reportUrl.trim()) return toast.error('Please select a file to upload');
        
        try {
            setSaving(true);
            let finalUrl = reportUrl.trim();

            if (selectedFile) {
                const uploadToastId = toast.loading('Uploading report...');
                try {
                    finalUrl = await uploadFile(selectedFile);
                    toast.success('File uploaded successfully!', { id: uploadToastId });
                } catch (err) {
                    toast.error('Upload failed: ' + err.message, { id: uploadToastId });
                    setSaving(false);
                    return;
                }
            }

            const res = await vendorSoilTestService.uploadReport(activeRequest._id, finalUrl);
            if (res.success) {
                toast.success('Report submitted for Admin review!');
                closeModal();
                fetchMyRequests(false);
            }
        } catch { 
            toast.error('Submission failed'); 
        } finally { 
            setSaving(false); 
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) return toast.error('Please provide a reason for rejection');
        
        try {
            setSaving(true);
            const res = await vendorSoilTestService.rejectRequest(activeRequest._id, rejectionReason);
            if (res.success) {
                toast.success('Request rejected. Admin has been notified.');
                closeModal();
                fetchMyRequests(false);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reject request');
        } finally {
            setSaving(false);
        }
    };

    // ─── UI Helpers ───────────────────────────────────────────────────────────
    const StatusBadge = ({ status }) => {
        const cfg = STATUS_CONFIG[status] || { label: status, color: 'slate', icon: FiActivity };
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border bg-${cfg.color}-50 text-${cfg.color}-600 border-${cfg.color}-100`}>
                <cfg.icon className="w-3 h-3" /> {cfg.label}
            </span>
        );
    };

    const TrackingBar = ({ status }) => {
        const current = stepIndex(status);
        return (
            <div className="flex items-center gap-1 mt-3">
                {TRACKING_STEPS.map((step, i) => (
                    <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black transition-all
                                ${i <= current ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {i < current ? '✓' : i + 1}
                            </div>
                            <p className={`text-[8px] mt-1 font-bold text-center leading-tight max-w-[40px]
                                ${i <= current ? 'text-teal-600' : 'text-slate-300'}`}>
                                {step.label}
                            </p>
                        </div>
                        {i < TRACKING_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mb-4 rounded-full transition-all ${i < current ? 'bg-teal-500' : 'bg-slate-100'}`} />
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    };

    // Next allowed status transitions for vendor
    const getNextStatuses = (status) => {
        if (status === 'assigned')         return [{ value: 'sample_collected', label: '🧪 Sample Collected' }];
        if (status === 'sample_collected') return [{ value: 'at_lab', label: '🔬 Received at Lab' }];
        return [];
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#F0F7FF] pb-28">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-black/[0.03] flex items-center px-4 py-4 gap-4">
                <button onClick={() => navigate(-1)} className="p-2 bg-slate-100 rounded-xl">
                    <FiChevronLeft className="w-6 h-6 text-slate-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-black text-slate-800 leading-tight">Soil Test Requests</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage your assigned requests</p>
                </div>
                <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black">
                    {requests.length} Total
                </div>
            </div>

            <div className="p-5 space-y-4">
                {loading ? (
                    <div className="py-24 flex justify-center">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[40px] p-16 text-center mt-8">
                        <FiActivity className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                        <p className="font-black text-slate-600 text-lg">No requests assigned yet</p>
                        <p className="text-sm text-slate-400 font-medium mt-1">Pending requests will appear here once assigned by admin</p>
                    </div>
                ) : requests.map(req => (
                    <motion.div key={req._id} layout
                        className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                        {/* Card Header */}
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                        ID: {req._id.slice(-8)}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                                            <FiUser className="text-blue-600 w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 text-sm">{req.userId?.name || 'Farmer'}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{req.userId?.phoneNumber || req.phoneNumber}</p>
                                        </div>
                                    </div>
                                </div>
                                <StatusBadge status={req.status} />
                            </div>

                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                <FiMapPin className="flex-shrink-0 text-xs" />
                                <p className="text-xs font-bold truncate">{req.location}</p>
                                {req.latitude && req.longitude && (
                                    <a href={`https://www.google.com/maps?q=${req.latitude},${req.longitude}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors shrink-0">
                                        View on Map 🗺️
                                    </a>
                                )}
                            </div>
                            <div className="ml-5 space-y-0.5">
                                <p className="text-xs text-slate-400 font-bold">
                                    {req.landSize} — {req.cropType || 'General Crop'}
                                </p>
                                <p className="text-[10px] font-black text-teal-600">
                                    {req.testType === 'Advanced' ? 'Advanced Test (12 Param)' : 'Basic Test (3 Param)'}
                                </p>
                            </div>

                            {/* Tracking Bar */}
                            {!['cancelled'].includes(req.status) && (
                                <TrackingBar status={req.status} />
                            )}
                        </div>

                        {/* Report Status Bar */}
                        {req.reportStatus && req.reportStatus !== 'pending' && (
                            <div className={`px-5 py-2 border-t border-slate-50 flex items-center justify-between
                                ${req.reportStatus === 'approved' ? 'bg-emerald-50' : 'bg-orange-50'}`}>
                                <p className={`text-xs font-black ${req.reportStatus === 'approved' ? 'text-emerald-700' : 'text-orange-600'}`}>
                                    {req.reportStatus === 'approved'
                                        ? '✅ Admin approved the report — Farmer can now download it'
                                        : '⏳ Report is under review by the Admin...'}
                                </p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!['completed', 'cancelled'].includes(req.status) && (
                            <div className="px-5 pb-5 flex gap-3 border-t border-slate-50 pt-4">
                                {/* Reject Button — only at assigned */}
                                {req.status === 'assigned' && (
                                    <button onClick={() => openRejectModal(req)}
                                        className="flex-1 py-4 bg-red-600 text-white rounded-[32px] font-black text-[10px] uppercase tracking-wider hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-red-500/30">
                                        <FiX className="w-4 h-4" /> Reject
                                    </button>
                                )}
                                {/* Status Update Button */}
                                {getNextStatuses(req.status).length > 0 && (
                                    <button onClick={() => openStatusModal(req)}
                                        className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-[32px] font-black text-[10px] uppercase tracking-wider shadow-xl shadow-blue-500/30 active:scale-95 transition-all">
                                        Update Status →
                                    </button>
                                )}
                                {/* Upload Report Button — show at at_lab or sample_collected */}
                                {['at_lab', 'sample_collected'].includes(req.status) && req.reportStatus === 'pending' && (
                                    <button onClick={() => openReportModal(req)}
                                        className="flex-1 py-3 bg-teal-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-teal-600/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                                        <FiUpload /> Report Upload
                                    </button>
                                )}
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* ── Status Update Modal ── */}
            <AnimatePresence>
                {modalType === 'status' && activeRequest && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={closeModal} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative bg-white w-full rounded-t-[48px] shadow-2xl p-8 pb-24">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black text-slate-800">Update Status</h2>
                                <button onClick={closeModal} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                                    <FiX />
                                </button>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                                <p className="text-xs font-bold text-slate-400">Current: <span className="text-slate-700 uppercase">{activeRequest.status}</span></p>
                                <p className="font-black text-slate-800 mt-1">{activeRequest.userId?.name} — {activeRequest.landSize}</p>
                            </div>
                            <div className="space-y-3">
                                {getNextStatuses(activeRequest.status).map(s => (
                                    <button key={s.value} onClick={() => handleUpdateStatus(s.value)}
                                        disabled={saving}
                                        className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-[24px] font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-sm">
                                        {saving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Updating...
                                            </>
                                        ) : s.label}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Upload Report Modal ── */}
            <AnimatePresence>
                {modalType === 'report' && activeRequest && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={closeModal} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative bg-white w-full max-h-[90vh] overflow-y-auto custom-scrollbar rounded-t-[48px] shadow-2xl p-8 pb-32">
                            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-2">
                                <h2 className="text-xl font-black text-slate-800">Lab Report Upload</h2>
                                <button onClick={closeModal} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                                    <FiX />
                                </button>
                            </div>
                            <div className="bg-teal-50 rounded-2xl p-4 border border-teal-100 mb-6">
                                <p className="text-xs font-bold text-teal-700 leading-relaxed">
                                    📎 Upload the report (PDF/Image) to a cloud service (like Cloudinary) and paste the link below. The report will be available to the farmer once verified by the Admin.
                                </p>
                            </div>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                handleUploadReport(e);
                            }} className="space-y-4">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                        Select Report File (PDF / Image)
                                    </label>
                                    
                                    <label className="relative block h-40 border-2 border-dashed border-slate-200 rounded-[32px] overflow-hidden bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group">
                                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileChange} />
                                        
                                        {filePreview ? (
                                            <div className="absolute inset-0">
                                                <img src={filePreview} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                                    <p className="bg-white/90 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-800 shadow-xl">Tap to Change</p>
                                                </div>
                                            </div>
                                        ) : selectedFile ? (
                                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                                <div className="w-12 h-12 bg-teal-100 rounded-2xl flex items-center justify-center">
                                                    <FiFileText className="text-teal-600 text-xl" />
                                                </div>
                                                <p className="text-xs font-black text-slate-600 truncate max-w-[200px]">{selectedFile.name}</p>
                                                <p className="text-[9px] font-bold text-slate-400">Tap to Change File</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <FiUpload className="text-slate-400 text-xl" />
                                                </div>
                                                <p className="text-xs font-black text-slate-600">Select File from Device</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Max Size: 10MB</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={closeModal}
                                        className="flex-1 py-3.5 rounded-2xl font-black text-slate-500 bg-slate-100 active:scale-95 transition-all text-sm">Cancel</button>
                                    <button type="submit" disabled={saving || !selectedFile}
                                        className="flex-1 py-3.5 rounded-[20px] font-black text-white bg-teal-600 shadow-xl shadow-teal-500/30 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-sm px-1">
                                        {saving ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                                <span className="truncate">Submitting</span>
                                            </>
                                        ) : (
                                            <>
                                                <FiCheckCircle className="text-lg shrink-0" />
                                                <span className="truncate">Submit</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Reject Reason Modal ── */}
            <AnimatePresence>
                {modalType === 'reject' && activeRequest && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={closeModal} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative bg-white w-full max-h-[90vh] overflow-y-auto custom-scrollbar rounded-t-[48px] shadow-2xl p-8 pb-32">
                            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-2">
                                <h2 className="text-xl font-black text-slate-800">Reject Request</h2>
                                <button onClick={closeModal} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                                    <FiX />
                                </button>
                            </div>
                            <div className="bg-red-50 rounded-2xl p-4 border border-red-100 mb-6">
                                <p className="text-xs font-bold text-red-700 leading-relaxed">
                                    ⚠️ If you cannot fulfill this request, please provide a reason. The request will be sent back to the Admin for re-assignment.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason for rejection</label>
                                    <textarea 
                                        className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-4 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none min-h-[120px]"
                                        placeholder="e.g. Too far from my location, Schedule already full, etc."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={closeModal}
                                        className="flex-1 py-3.5 rounded-2xl font-black text-slate-500 bg-slate-100 active:scale-95 transition-all text-sm">Cancel</button>
                                    <button onClick={handleReject} disabled={saving || !rejectionReason.trim()}
                                        className="flex-1 py-3.5 rounded-[20px] font-black text-white bg-red-600 shadow-xl shadow-red-500/30 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-sm px-1">
                                        {saving ? (
                                            <>
                                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                                <span className="truncate">Rejecting</span>
                                            </>
                                        ) : (
                                            <>
                                                <FiX className="text-lg shrink-0" />
                                                <span className="truncate">Reject</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VendorSoilTests;
