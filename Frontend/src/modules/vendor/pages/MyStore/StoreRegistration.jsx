import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShoppingBag, FiMapPin, FiFileText, FiUpload, FiCheckCircle, FiAlertCircle, FiPackage, FiCamera, FiClock } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import Header from '../../components/layout/Header';
import { vendorTheme as themeColors } from '../../../../theme';
import api from '../../../../services/api';
import AddressSelectionModal from '../../../user/pages/Checkout/components/AddressSelectionModal';
import flutterBridge from '../../../../utils/flutterBridge';

const StoreRegistration = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [errors, setErrors] = useState({});
    
    const [formData, setFormData] = useState({
        shopName: '',
        shopAddress: '',
        shopLocation: { lat: null, lng: null },
        shopLicense: '',
        licenseDocument: ''
    });

    const [licenseFile, setLicenseFile] = useState(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await api.get('/vendors/shop/status');
                if (res.data.success) {
                    setStatus(res.data.data);
                    if (res.data.data) {
                        setFormData({
                            shopName: res.data.data.shopName || '',
                            shopAddress: res.data.data.shopAddress || '',
                            shopLocation: res.data.data.shopLocation || { lat: null, lng: null },
                            shopLicense: res.data.data.shopLicense || '',
                            licenseDocument: res.data.data.licenseDocument || ''
                        });
                    }
                }
            } catch (err) {
                console.error("Status fetch failed");
            }
        };
        fetchStatus();
    }, []);

    const validateForm = () => {
        let newErrors = {};
        
        // Shop Name: Letters and spaces only, 3-50 chars
        const shopNameRegex = /^[A-Za-z\s]{3,50}$/;
        if (!formData.shopName.trim()) {
            newErrors.shopName = "Shop name is required";
        } else if (!shopNameRegex.test(formData.shopName.trim())) {
            newErrors.shopName = "Invalid name (3-50 letters only, no numbers/symbols)";
        }

        if (!formData.shopAddress) {
            newErrors.shopAddress = "Please pick your shop location on map";
        }

        // License: Alphanumeric, 5-25 chars
        const licenseRegex = /^[A-Z0-9]{5,25}$/i;
        if (!formData.shopLicense.trim()) {
            newErrors.shopLicense = "License number is required";
        } else if (!licenseRegex.test(formData.shopLicense.trim())) {
            newErrors.shopLicense = "Invalid format (5-25 alphanumeric chars)";
        }

        if (!licenseFile && !formData.licenseDocument) {
            newErrors.licenseDocument = "License document photo is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFileUpload = async (file) => {
        const uploadData = new FormData();
        uploadData.append('file', file);
        try {
            const res = await api.post('/image/upload', uploadData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return res.data.imageUrl;
        } catch (err) {
            console.error("Upload error:", err.response?.data || err.message);
            toast.error("File upload failed: " + (err.response?.data?.message || "Server Error"));
            return null;
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.error("Form validation failed. Please check errors.");
            return;
        }

        setLoading(true);
        try {
            let licenseUrl = formData.licenseDocument;
            if (licenseFile) {
                licenseUrl = await handleFileUpload(licenseFile);
            }

            if (!licenseUrl && !formData.licenseDocument) {
                setLoading(false);
                return toast.error("License document is mandatory");
            }

            const payload = {
                ...formData,
                licenseDocument: licenseUrl
            };

            const res = await api.post('/vendors/shop/register', payload);
            if (res.data.success) {
                toast.success("Registration submitted successfully");
                navigate('/vendor/profile');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const handleAddressSave = (houseNumber, location) => {
        setFormData(prev => ({
            ...prev,
            shopAddress: location.address,
            shopLocation: { lat: location.lat, lng: location.lng }
        }));
        setErrors(prev => ({ ...prev, shopAddress: null }));
        setIsAddressModalOpen(false);
    };

    // Removed the automatic redirect/success screen for approved status 
    // so that vendors can always view and edit their registration details.

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header title="Register Your Shop" />
            
            <main className="p-4 pt-6">
                {status?.storeApprovalStatus === 'pending' && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
                        <FiClock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-amber-800">Review in Progress</p>
                            <p className="text-[11px] text-amber-700 mt-0.5">Your application is currently being verified. You will be notified once approved.</p>
                        </div>
                    </div>
                )}

                {status?.storeApprovalStatus === 'rejected' && (
                    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
                        <FiAlertCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-rose-800">Application Rejected</p>
                            <p className="text-[11px] text-rose-700 mt-0.5">{status.remarks || 'Please check your details and re-submit for approval.'}</p>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-50 pb-4">Shop Registration Form</p>
                    
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                        {/* Shop Name */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5 px-1">
                                <label className="text-xs font-bold text-gray-700">Shop Name *</label>
                                {errors.shopName && <span className="text-[9px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full">{errors.shopName}</span>}
                            </div>
                            <input
                                type="text"
                                disabled={status?.storeApprovalStatus === 'pending' || status?.storeApprovalStatus === 'approved'}
                                value={formData.shopName}
                                onChange={(e) => {
                                    setFormData({...formData, shopName: e.target.value});
                                    if (errors.shopName) setErrors({...errors, shopName: null});
                                }}
                                placeholder="Enter Full Shop Name"
                                className={`w-full px-4 py-4 bg-gray-50 border ${errors.shopName ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-gray-50'} rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 transition-all text-sm`}
                            />
                        </div>

                        {/* Location */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5 px-1">
                                <label className="text-xs font-bold text-gray-700">Business Location *</label>
                                {errors.shopAddress && <span className="text-[9px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full">{errors.shopAddress}</span>}
                            </div>
                            <div 
                                className={`w-full px-4 py-4 bg-gray-50 border ${errors.shopAddress ? 'border-rose-300' : 'border-gray-50'} rounded-2xl mb-2 flex items-center min-h-[64px]`}
                            >
                                <p className="text-xs text-gray-700 leading-normal font-medium">
                                    {formData.shopAddress || <span className="text-gray-400 italic">No location selected yet.</span>}
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={status?.storeApprovalStatus === 'pending' || status?.storeApprovalStatus === 'approved'}
                                onClick={() => setIsAddressModalOpen(true)}
                                className={`w-full py-4 bg-teal-50 text-teal-700 rounded-2xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 border border-teal-100 transition-all shadow-sm ${status?.storeApprovalStatus === 'pending' || status?.storeApprovalStatus === 'approved' ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                            >
                                <FiMapPin className="w-4 h-4" />
                                Pick verified location
                            </button>
                        </div>

                        {/* License Number */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5 px-1">
                                <label className="text-xs font-bold text-gray-700">License Number *</label>
                                {errors.shopLicense && <span className="text-[9px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full">{errors.shopLicense}</span>}
                            </div>
                            <input
                                type="text"
                                disabled={status?.storeApprovalStatus === 'pending' || status?.storeApprovalStatus === 'approved'}
                                value={formData.shopLicense}
                                onChange={(e) => {
                                    setFormData({...formData, shopLicense: e.target.value});
                                    if (errors.shopLicense) setErrors({...errors, shopLicense: null});
                                }}
                                placeholder="e.g. FERT12345ABC"
                                className={`w-full px-4 py-4 bg-gray-50 border ${errors.shopLicense ? 'border-rose-300 ring-2 ring-rose-500/10' : 'border-gray-50'} rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 transition-all text-sm font-semibold uppercase`}
                            />
                        </div>

                        {/* Document Upload */}
                        <div>
                            <div className="flex justify-between items-center mb-1.5 px-1">
                                <label className="text-xs font-bold text-gray-700">License Copy (Photos) *</label>
                                {errors.licenseDocument && <span className="text-[9px] text-rose-500 font-bold bg-rose-50 px-2 py-0.5 rounded-full">{errors.licenseDocument}</span>}
                            </div>
                            <div 
                                className={`border-2 border-dashed ${errors.licenseDocument ? 'border-rose-300 bg-rose-50/10' : 'border-gray-100'} rounded-[32px] p-8 flex flex-col items-center justify-center bg-gray-50 transition-all ${status?.storeApprovalStatus === 'pending' || status?.storeApprovalStatus === 'approved' ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer active:scale-98 hover:bg-gray-100/50'}`}
                                onClick={() => {
                                    if(status?.storeApprovalStatus !== 'pending' && status?.storeApprovalStatus !== 'approved') {
                                        document.getElementById('license-up').click();
                                    }
                                }}
                            >
                                <input 
                                    type="file" 
                                    id="license-up" 
                                    className="hidden" 
                                    disabled={status?.storeApprovalStatus === 'pending' || status?.storeApprovalStatus === 'approved'}
                                    accept="image/*,.pdf"
                                    onChange={(e) => {
                                        setLicenseFile(e.target.files[0]);
                                        if (errors.licenseDocument) setErrors({...errors, licenseDocument: null});
                                    }}
                                />
                                {licenseFile ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center shadow-inner">
                                            <FiCheckCircle className="text-teal-600 w-7 h-7" />
                                        </div>
                                        <span className="text-xs font-bold text-teal-800 truncate max-w-[200px] mt-2">{licenseFile.name}</span>
                                        <span className="text-[9px] text-gray-400 font-medium">Click to change file</span>
                                    </div>
                                ) : formData.licenseDocument ? (
                                    <div className="relative group">
                                        <img src={formData.licenseDocument} alt="License" className="h-32 w-auto rounded-2xl shadow-xl border-4 border-white" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity flex items-center justify-center">
                                            <FiUpload className="text-white w-6 h-6" />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-3 shadow-sm border border-gray-50 text-gray-300">
                                            <FiCamera className="w-7 h-7" />
                                        </div>
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Tap to Upload</span>
                                        <span className="text-[10px] text-gray-400 mt-1 font-medium">JPG, PNG or PDF</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {status?.storeApprovalStatus !== 'pending' && status?.storeApprovalStatus !== 'approved' && (
                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 bg-teal-600 font-black uppercase tracking-[2px] text-[11px] text-white rounded-[24px] shadow-2xl shadow-teal-900/40 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {loading ? "Verifying..." : "Register & Submit Approval"}
                                </button>
                                <p className="text-[10px] text-center text-gray-400 mt-5 px-6 leading-relaxed font-semibold italic">
                                    * All information provided will be manually verified by our team within 24-48 hours.
                                </p>
                            </div>
                        )}
                    </form>
                </div>
            </main>

            <AddressSelectionModal
                isOpen={isAddressModalOpen}
                onClose={() => setIsAddressModalOpen(false)}
                onSave={handleAddressSave}
                address={formData.shopAddress}
            />
        </div>
    );
};

export default StoreRegistration;
