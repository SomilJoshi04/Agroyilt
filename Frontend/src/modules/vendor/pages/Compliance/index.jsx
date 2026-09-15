import React, { useState, useEffect } from 'react';
import { FiUpload, FiCheckCircle, FiAlertTriangle, FiXCircle, FiCalendar, FiArrowLeft, FiEdit } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import { vendorTheme as themeColors } from '../../../../theme';
import complianceService from '../../services/complianceService';
import { toastManager } from '../../../../utils/toastManager';

const ComplianceIndex = () => {
    const navigate = useNavigate();
    const [compliance, setCompliance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDoc, setSelectedDoc] = useState(null);

    // Form for update
    const [formData, setFormData] = useState({
        number: '',
        document: '',
        expiryDate: ''
    });

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const res = await complianceService.getStatus();
            setCompliance(res.data);
        } catch (err) {
            toastManager.error('Failed to load compliance status');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setFormData({ ...formData, document: reader.result });
            };
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await complianceService.updateDocument({
                type: selectedDoc,
                ...formData
            });
            toastManager.success('Document updated successfully');
            setSelectedDoc(null);
            fetchStatus();
        } catch (err) {
            toastManager.error('Failed to update document');
        }
    };

    const docLabels = {
        drivingLicense: 'Operator Driving License',
        rcBook: 'Equipment RC (Registration)',
        insurance: 'Machine Insurance',
        fitnessCertificate: 'Fitness Certificate'
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'VALID': return <FiCheckCircle className="text-emerald-500" />;
            case 'EXPIRING_SOON': return <FiAlertTriangle className="text-amber-500" />;
            case 'EXPIRED': return <FiXCircle className="text-red-500" />;
            default: return <FiUpload className="text-gray-400" />;
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'VALID': return 'bg-emerald-50 border-emerald-100';
            case 'EXPIRING_SOON': return 'bg-amber-50 border-amber-100';
            case 'EXPIRED': return 'bg-red-50 border-red-100';
            default: return 'bg-gray-50 border-gray-100';
        }
    };

    return (
        <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
            <Header title="Equipment Compliance" />

            <main className="px-4 py-6">
                <div className="bg-white rounded-3xl p-5 mb-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                            <FiCheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">Compliance Health</h2>
                            <p className="text-xs text-gray-500 font-medium">Keep your agricultural equipment documents valid </p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div></div>
                ) : (
                    <div className="space-y-4">
                        {Object.keys(docLabels).map(key => {
                            const status = compliance.status[key];
                            const doc = compliance.documents[key];

                            return (
                                <div key={key} className={`rounded-2xl border-2 p-5 transition-all ${getStatusStyle(status.status)}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="text-xl">{getStatusIcon(status.status)}</div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 text-sm">{docLabels[key]}</h3>
                                                <p className={`text-[10px] font-bold uppercase tracking-wider ${status.status === 'EXPIRED' ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {status.message}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedDoc(key);
                                                setFormData({
                                                    number: doc?.number || '',
                                                    document: '',
                                                    expiryDate: doc?.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : ''
                                                });
                                            }}
                                            className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-200 text-teal-600 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            <FiEdit className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {doc?.expiryDate && (
                                        <div className="flex items-center gap-6 mt-2 ml-8">
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Document Number</p>
                                                <p className="text-xs font-bold text-gray-700">{doc.number || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase">Expiry Date</p>
                                                <p className="text-xs font-bold text-gray-700">{new Date(doc.expiryDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal */}
            {selectedDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-teal-600">
                            <h3 className="text-lg font-bold text-white">Update {docLabels[selectedDoc]}</h3>
                            <button onClick={() => setSelectedDoc(null)} className="text-white hover:rotate-90 transition-all font-bold text-2xl">×</button>
                        </div>
                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{docLabels[selectedDoc]} Number</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter document number"
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-sm font-medium"
                                    value={formData.number}
                                    onChange={e => setFormData({ ...formData, number: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry Date</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                                    value={formData.expiryDate}
                                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Upload Photo</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="doc-upload"
                                    />
                                    <label
                                        htmlFor="doc-upload"
                                        className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 cursor-pointer hover:bg-gray-100 transition-all"
                                    >
                                        {formData.document ? (
                                            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                                                <FiCheckCircle /> Photo Selected
                                            </div>
                                        ) : (
                                            <>
                                                <FiUpload className="w-8 h-8 text-gray-400 mb-2" />
                                                <span className="text-xs text-gray-500 font-medium tracking-tight">Tap to upload proof</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all mt-4 hover:brightness-110"
                            >
                                Save Document
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
};

export default ComplianceIndex;
