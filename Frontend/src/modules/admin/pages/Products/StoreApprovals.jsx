import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiMapPin, FiFileText, FiUser, FiShoppingBag, FiExternalLink, FiClock } from 'react-icons/fi';
import api from '../../../../services/api';
import { toastManager } from '../../../../utils/toastManager';

const StoreApprovals = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReq, setSelectedReq] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/vendors/shop-approvals');
            if (res.data.success) {
                setRequests(res.data.data);
            }
        } catch (err) {
            toastManager.error("Failed to load shop approvals");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, status, remarks = '') => {
        try {
            const res = await api.post(`/admin/vendors/shop-approvals/${id}`, { status, remarks });
            if (res.data.success) {
                toastManager.success(`Shop ${status} successfully`);
                fetchRequests();
                setSelectedReq(null);
            }
        } catch (err) {
            toastManager.error("Action failed");
        }
    };

    if (loading) return <div className="p-10 text-center">Loading requests...</div>;

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Shop Registration Requests</h1>
                <p className="text-gray-500">Approve or reject vendor agri-store registrations</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* List of Requests */}
                <div className="lg:col-span-1 space-y-4">
                    {requests.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center">
                            <FiClock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No pending requests</p>
                        </div>
                    ) : (
                        requests.map(req => (
                            <div 
                                key={req._id}
                                onClick={() => setSelectedReq(req)}
                                className={`p-5 rounded-2xl cursor-pointer transition-all border-2 ${
                                    selectedReq?._id === req._id ? 'bg-teal-50 border-teal-500 shadow-lg' : 'bg-white border-transparent hover:border-gray-200 shadow-sm'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                                        <FiShoppingBag className="text-teal-600 w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-800 truncate">{req.shopDetails?.shopName}</h3>
                                        <p className="text-xs text-gray-500 truncate">{req.name}</p>
                                    </div>
                                    <FiChevronRight className="text-gray-400" />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detail View */}
                <div className="lg:col-span-2">
                    {selectedReq ? (
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 sticky top-24">
                            <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center">
                                        <FiShoppingBag className="text-teal-600 w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800">{selectedReq.shopDetails?.shopName}</h2>
                                        <p className="text-gray-500">Agri-Store Registration Request</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleAction(selectedReq._id, 'approved')}
                                        className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-colors"
                                    >
                                        <FiCheck /> Approve
                                    </button>
                                    <button 
                                        onClick={() => handleAction(selectedReq._id, 'rejected')}
                                        className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-colors"
                                    >
                                        <FiX /> Reject
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <section className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Vendor Details</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 text-sm">
                                                <FiUser className="text-teal-600" />
                                                <span className="font-bold">{selectedReq.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                                <FiPhone className="text-teal-600" />
                                                <span>{selectedReq.phone}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Shop Address</h4>
                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex gap-3">
                                            <FiMapPin className="text-teal-600 shrink-0 mt-1" />
                                            <p className="text-sm font-medium leading-relaxed">{selectedReq.shopDetails?.shopAddress}</p>
                                        </div>
                                        {selectedReq.shopDetails?.shopLocation?.lat && (
                                            <a 
                                                href={`https://www.google.com/maps?q=${selectedReq.shopDetails.shopLocation.lat},${selectedReq.shopDetails.shopLocation.lng}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="mt-3 text-xs text-teal-600 font-bold flex items-center gap-1 hover:underline"
                                            >
                                                View on Google Maps <FiExternalLink />
                                            </a>
                                        )}
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">License Info</h4>
                                        <div className="flex items-center gap-3 text-sm mb-4">
                                            <FiFileText className="text-teal-600" />
                                            <span className="font-bold">License: {selectedReq.shopDetails?.shopLicense || 'N/A'}</span>
                                        </div>
                                        {selectedReq.shopDetails?.licenseDocument ? (
                                            <div className="group relative">
                                                <img 
                                                    src={selectedReq.shopDetails.licenseDocument} 
                                                    alt="License" 
                                                    className="w-full h-48 object-cover rounded-2xl border border-gray-200"
                                                />
                                                <a 
                                                    href={selectedReq.shopDetails.licenseDocument} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl text-white font-bold"
                                                >
                                                    View Full Size
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="w-full h-48 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 border border-dashed border-gray-200 font-medium">
                                                No document uploaded
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200 h-[500px] flex flex-col items-center justify-center text-gray-400">
                            <FiShoppingBag className="w-16 h-16 mb-4 opacity-20" />
                            <p className="font-medium">Select a request to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Internal imports for sub-components (if not already defined globably)
import { FiChevronRight, FiPhone } from 'react-icons/fi';

export default StoreApprovals;
