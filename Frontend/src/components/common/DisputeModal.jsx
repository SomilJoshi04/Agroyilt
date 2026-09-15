import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiX, FiCamera, FiUpload, FiLoader, FiCheckCircle } from 'react-icons/fi';
import { toastManager } from '../../utils/toastManager';
import { uploadToCloudinary } from '../../services/cloudinaryService';

const DisputeModal = ({ isOpen, onClose, onSubmit, bookingId }) => {
    const [step, setStep] = useState(1); // 1 = Form, 2 = Success
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef(null);

    const reasons = [
        'Quality Issue',
        'Delay / Late Arrival',
        'Payment Dispute',
        'No Show',
        'Poor Driver Behavior',
        'Other'
    ];

    const handlePhotoCapture = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (attachments.length >= 3) {
            return toastManager.error('You can upload up to 3 photos');
        }

        try {
            setUploading(true);
            const url = await uploadToCloudinary(file);
            setAttachments([...attachments, url]);
            toastManager.success('Photo attached');
        } catch (err) {
            toastManager.error('Failed to upload photo');
        } finally {
            setUploading(false);
        }
    };

    const handleRemovePhoto = (index) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!reason) return toastManager.error('Please select a reason');
        if (!description.trim()) return toastManager.error('Please describe the issue');

        try {
            setSubmitting(true);
            await onSubmit({
                bookingId,
                reason,
                description,
                attachments
            });
            setStep(2);
        } catch (err) {
            toastManager.error(err?.message || 'Failed to raise dispute');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
                >
                    {step === 1 ? (
                        <>
                            {/* Header */}
                            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                        <FiAlertTriangle className="text-red-600" />
                                    </div>
                                    <h3 className="font-black text-gray-900">Raise a Dispute</h3>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <FiX className="text-gray-400" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                {/* Reason Select */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Reason</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {reasons.map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setReason(r)}
                                                className={`py-2.5 px-3 text-[11px] font-bold rounded-xl border-2 transition-all ${reason === r
                                                        ? 'border-red-500 bg-red-50 text-red-700'
                                                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                                                    }`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Explain what happened in detail..."
                                        className="w-full h-24 p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                    />
                                </div>

                                {/* Attachments */}
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Photos (Optional)</label>
                                    <div className="flex gap-2">
                                        {attachments.map((url, i) => (
                                            <div key={i} className="relative w-16 h-16 rounded-xl border border-gray-100 overflow-hidden group">
                                                <img src={url} alt="att" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => handleRemovePhoto(i)}
                                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                                >
                                                    <FiX />
                                                </button>
                                            </div>
                                        ))}
                                        {attachments.length < 3 && (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-red-500 hover:text-red-500 transition-all"
                                            >
                                                {uploading ? <FiLoader className="animate-spin" /> : <FiCamera />}
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handlePhotoCapture}
                                    />
                                </div>

                                {/* Submit */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !reason || !description.trim()}
                                    className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black text-sm shadow-xl hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Raising Dispute...' : 'Submit Complaint'}
                                </button>
                                <p className="text-[10px] text-center text-gray-400 px-4 leading-relaxed">
                                    Admin will investigate this matter and get back to you within 24-48 hours.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="p-10 text-center space-y-4">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiCheckCircle size={40} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900">Complaint Received!</h3>
                            <p className="text-sm text-gray-500 leading-relaxed px-4">
                                Your dispute has been recorded. Admin has been notified and will review your evidence.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-200"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DisputeModal;
