import React, { useState, useEffect } from 'react';
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiStar,
    FiSearch,
    FiPackage,
    FiFilter,
    FiMoreVertical,
    FiUploadCloud,
    FiUser,
    FiCheck,
    FiX,
    FiClock,
    FiTruck
} from 'react-icons/fi';
import adminProductService from '../../../../services/adminProductService';
import adminEquipmentService from '../../../../services/adminEquipmentService';
import { publicCatalogService } from '../../../../services/catalogService';
import { getSettings } from '../../services/settingsService';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const ManageProducts = () => {
    const [products, setProducts] = useState([]);
    const [pendingProducts, setPendingProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [activeTab, setActiveTab] = useState('marketplace');
    const [rentalGst, setRentalGst] = useState(5); // Default 5% for Agriculture
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        categoryId: '',
        brandName: '',
        description: '',
        price: '',
        discountPrice: '',
        unit: 'hour',
        stock: 1,
        imageUrl: '',
        images: [],
        type: 'machinery',
        hasDriver: false,
        driverDetails: {
            name: '',
            phone: '',
            photo: '',
            licenseNumber: ''
        },
        specifications: []
    });

    useEffect(() => {
        fetchData();
        // Load rental GST from admin settings
        getSettings().then(res => {
            if (res?.settings?.rentalGstPercentage !== undefined) {
                setRentalGst(res.settings.rentalGstPercentage);
            }
        }).catch(() => {});
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [prodRes, pendingRes, catRes, vendorEqPendingRes, vendorEqApprovedRes] = await Promise.all([
                adminProductService.getAll(),
                adminProductService.getVendorSubmissions('pending', 'machinery'),
                publicCatalogService.getCategories(),
                adminEquipmentService.getAll({ status: 'pending' }),
                adminEquipmentService.getAll({ status: 'approved' })
            ]);

            // LIVE FLEET: admin products + approved VendorEquipment
            const adminProducts = prodRes.success ? (prodRes.data || []).filter(p => p.type === 'machinery') : [];
            const approvedVendorEq = vendorEqApprovedRes.success
                ? vendorEqApprovedRes.data.map(e => ({ ...e, _source: 'vendorEquipment' }))
                : [];
            setProducts([...approvedVendorEq, ...adminProducts]);

            // NEW APPROVALS: pending Product-model + pending VendorEquipment
            const productPending = pendingRes.success ? pendingRes.data : [];
            const vendorEqPending = vendorEqPendingRes.success 
                ? vendorEqPendingRes.data.map(e => ({ ...e, _source: 'vendorEquipment' })) 
                : [];
            setPendingProducts([...vendorEqPending, ...productPending]);

            if (catRes.success) setCategories(catRes.categories || catRes.data || []);
        } catch (err) {
            toast.error("Machinery data load karne mein dikkat hui");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploading(true);
            const token = sessionStorage.getItem('adminAccessToken') || localStorage.getItem('adminAccessToken');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            
            const res = await fetch(`${baseUrl}/admin/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: uploadFormData
            });
            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({ 
                    ...prev, 
                    imageUrl: data.imageUrl,
                    images: [...(prev.images || []), data.imageUrl]
                }));
                toast.success("Image upload ho gayi!");
            }
        } catch (err) {
            toast.error("Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleDriverPhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            setUploading(true);
            const token = sessionStorage.getItem('adminAccessToken') || localStorage.getItem('adminAccessToken');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            const res = await fetch(`${baseUrl}/admin/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: uploadFormData
            });
            const data = await res.json();
            if (data.success) {
                setFormData(prev => ({ 
                    ...prev, 
                    driverDetails: { ...prev.driverDetails, photo: data.imageUrl }
                }));
                toast.success("Driver photo uploaded!");
            }
        } catch (err) {
            toast.error("Driver photo upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleApprove = async (item) => {
        if (!window.confirm("Approve this machinery/equipment? It will go LIVE for farmers.")) return;
        try {
            let res;
            if (item._source === 'vendorEquipment') {
                // VendorEquipment flow — use adminEquipmentService
                res = await adminEquipmentService.updateStatus(item._id, { status: 'approved' });
            } else {
                // Product model flow
                res = await adminProductService.approveProduct(item._id, { commissionPercentage: 10, gstPercentage: rentalGst });
            }
            if (res.success) {
                toast.success(`✅ Machinery Approved!`);
                fetchData();
                setShowModal(false);
            }
        } catch (err) {
            toast.error("Approval failed");
        }
    };

    const openRejectModal = (product) => {
        setRejectTarget(product);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleRejectConfirm = async () => {
        if (!rejectReason.trim()) return toast.error('Please enter a rejection reason');
        try {
            let res;
            if (rejectTarget._source === 'vendorEquipment') {
                res = await adminEquipmentService.updateStatus(rejectTarget._id, { status: 'rejected', remarks: rejectReason });
            } else {
                res = await adminProductService.rejectProduct(rejectTarget._id, rejectReason);
            }
            if (res.success) {
                toast.success('Equipment rejected. Owner will be notified.');
                setShowRejectModal(false);
                fetchData();
            }
        } catch (err) {
            toast.error("Rejection failed");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (editMode) {
                res = await adminProductService.update(currentProduct._id, formData);
            } else {
                res = await adminProductService.create(formData);
            }
            if (res.success) {
                toast.success("Saved successfully");
                setShowModal(false);
                fetchData();
            }
        } catch (err) {
            toast.error("Save failed");
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            categoryId: '',
            brandName: '',
            description: '',
            price: '',
            discountPrice: '',
            unit: 'hour',
            stock: 1,
            imageUrl: '',
            images: [],
            type: 'machinery',
            hasDriver: false,
            driverDetails: { name: '', phone: '', photo: '', licenseNumber: '' },
            specifications: []
        });
        setEditMode(false);
    };

    const openEdit = (product) => {
        setCurrentProduct(product);
        setFormData({
            ...product,
            categoryId: product.categoryId?._id || product.categoryId,
            type: 'machinery',
            hasDriver: product.hasDriver || false,
            driverDetails: product.driverDetails || { name: '', phone: '', photo: '', licenseNumber: '' }
        });
        setEditMode(true);
        setShowModal(true);
    };

    const currentList = activeTab === 'marketplace' ? products : pendingProducts;
    const filteredProducts = currentList.filter(p => {
        const trimmedSearch = searchTerm.trim().toLowerCase();
        if (!trimmedSearch) return true;
        return (p.title?.toLowerCase().includes(trimmedSearch)) ||
               (p.name?.toLowerCase().includes(trimmedSearch)) ||
               (p.brandName?.toLowerCase().includes(trimmedSearch)) ||
               (p.vendorId?.name?.toLowerCase().includes(trimmedSearch));
    });

    return (
        <div className="py-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 px-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Machinery Management</h1>
                    <p className="text-sm text-slate-500 font-medium">Manage Equipment & Heavy Machinery Approvals</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all"
                >
                    + Add Machinery
                </button>
            </div>

            <div className="flex gap-4 mb-6 border-b border-slate-200 px-6">
                <button onClick={() => setActiveTab('marketplace')} className={`pb-4 px-2 font-black text-sm uppercase tracking-wider relative ${activeTab === 'marketplace' ? 'text-slate-800' : 'text-slate-400'}`}>
                    Live Fleet ({products.length})
                    {activeTab === 'marketplace' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 rounded-t-full" />}
                </button>
                <button onClick={() => setActiveTab('pending')} className={`pb-4 px-2 font-black text-sm uppercase tracking-wider relative ${activeTab === 'pending' ? 'text-orange-600' : 'text-slate-400'}`}>
                    New Approvals ({pendingProducts.length})
                    {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600 rounded-t-full" />}
                </button>
            </div>

            <div className="bg-white border-t border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Machine</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner / Shop</th>
                            {activeTab === 'pending' && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rental Type</th>}
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan="6" className="text-center py-20 text-slate-400 font-bold">Loading...</td></tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr><td colSpan="6" className="text-center py-20 text-slate-400 font-bold">
                                {activeTab === 'pending' ? '🎉 No pending approvals! All clear.' : 'No machinery found'}
                            </td></tr>
                        ) : filteredProducts.map(p => {
                            // Support both VendorEquipment shape and Product shape
                            const isVendorEq = p._source === 'vendorEquipment';
                            const displayName = isVendorEq ? p.name : p.title;
                            const displaySubtitle = isVendorEq ? (p.modelNumber || p.year || '') : p.brandName;
                            const displayImage = isVendorEq ? p.images?.[0] : p.imageUrl;
                            const displayCategory = p.categoryId?.title || (isVendorEq ? p.requestedCategoryName : 'Machine');
                            const vendorName = p.vendorId?.businessName || p.vendorId?.name || 'Vendor';
                            const vendorPhone = p.vendorId?.phone || '';
                            // Pricing display for VendorEquipment
                            const pricingText = isVendorEq
                                ? Object.entries(p.pricing || {}).filter(([, v]) => v?.isEnabled).map(([k, v]) => `₹${v.price}/${k === 'land_based' ? 'acre' : k === 'hourly' ? 'hr' : 'day'}`).join(' · ')
                                : `₹${p.price}/${p.unit}`;

                            return (
                            <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center">
                                            {displayImage 
                                                ? <img src={displayImage} alt="" className="w-full h-full object-cover" />
                                                : <FiTruck className="text-slate-300 w-5 h-5" />
                                            }
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-black text-slate-800 text-sm">{displayName}</p>
                                                {isVendorEq && (
                                                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[8px] font-black uppercase">Vendor Listed</span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{displaySubtitle}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">
                                        {displayCategory}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {p.vendorId ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                <FiUser className="w-3 h-3 text-orange-600" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-700 text-xs leading-tight">{vendorName}</p>
                                                <p className="text-[9px] text-orange-600 font-bold">{vendorPhone}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase">Admin</span>
                                    )}
                                </td>
                                {activeTab === 'pending' && (
                                    <td className="px-6 py-4">
                                        {isVendorEq ? (
                                            <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-black uppercase">🚜 {p.listingType || 'service'}</span>
                                        ) : (
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                                                p.rental_type === 'land_based' ? 'bg-green-50 text-green-700' :
                                                p.rental_type === 'monthly' ? 'bg-purple-50 text-purple-700' :
                                                'bg-blue-50 text-blue-700'
                                            }`}>
                                                {p.rental_type === 'land_based' ? '🌾 Acre-based' :
                                                 p.rental_type === 'monthly' ? '📅 Monthly' : '⏱ Hourly'}
                                            </span>
                                        )}
                                    </td>
                                )}
                                <td className="px-6 py-4 font-black text-slate-800 text-sm">{pricingText}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex gap-2 justify-end">
                                        {activeTab === 'pending' ? (
                                            <>
                                                <button onClick={() => handleApprove(p)} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs flex items-center gap-1"><FiCheck className="w-3 h-3" /> Approve</button>
                                                <button onClick={() => openRejectModal(p)} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs flex items-center gap-1"><FiX className="w-3 h-3" /> Reject</button>
                                            </>
                                        ) : (
                                            <>
                                                {!p.vendorId && (
                                                    <button onClick={() => openEdit(p)} className="p-2 text-slate-400 hover:text-slate-800 transition-all"><FiEdit2 /></button>
                                                )}
                                                <button onClick={() => adminProductService.delete(p._id).then(fetchData)} className="p-2 text-slate-400 hover:text-rose-600 transition-all"><FiTrash2 /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
                </div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-8 border-b flex justify-between items-center">
                                <h2 className="text-xl font-black text-slate-800">{editMode ? 'Edit Machinery' : 'New Machinery'}</h2>
                                <button onClick={() => setShowModal(false)}>✕</button>
                            </div>
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Title</label>
                                        <input className="w-full bg-slate-50 rounded-2xl p-4 font-bold outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Category</label>
                                        <select className="w-full bg-slate-50 rounded-2xl p-4 font-bold outline-none" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} required>
                                            <option value="">Select Category</option>
                                            {categories.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Price</label>
                                        <input type="number" className="w-full bg-slate-50 rounded-2xl p-4 font-bold outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Unit (hour/day)</label>
                                        <input className="w-full bg-slate-50 rounded-2xl p-4 font-bold outline-none" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Brand</label>
                                        <input className="w-full bg-slate-50 rounded-2xl p-4 font-bold outline-none" value={formData.brandName} onChange={e => setFormData({...formData, brandName: e.target.value})} />
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className={`w-10 h-6 rounded-full p-1 transition-all ${formData.hasDriver ? 'bg-orange-500' : 'bg-slate-200'}`}>
                                            <div className={`w-4 h-4 rounded-full bg-white transform ${formData.hasDriver ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <input type="checkbox" className="hidden" checked={formData.hasDriver} onChange={e => setFormData({...formData, hasDriver: e.target.checked})} />
                                        <span className="text-xs font-black uppercase tracking-tight">Include Driver Details?</span>
                                    </label>
                                    
                                    {formData.hasDriver && (
                                        <div className="mt-4 p-5 bg-orange-50/30 rounded-3xl border border-orange-100 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <input placeholder="Driver Name" className="bg-white rounded-xl p-3 text-sm font-bold outline-none" value={formData.driverDetails.name} onChange={e => setFormData({...formData, driverDetails: {...formData.driverDetails, name: e.target.value}})} />
                                                <input placeholder="Phone" className="bg-white rounded-xl p-3 text-sm font-bold outline-none" value={formData.driverDetails.phone} onChange={e => setFormData({...formData, driverDetails: {...formData.driverDetails, phone: e.target.value}})} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </form>
                            <div className="p-8 bg-slate-50 border-t flex gap-4">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white border rounded-2xl font-black text-xs uppercase">Cancel</button>
                                <button onClick={handleSubmit} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Save Machinery</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Reject Modal */}
                {showRejectModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowRejectModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden flex flex-col">
                            <div className="p-6 border-b flex justify-between items-center bg-rose-50/50">
                                <h2 className="text-xl font-black text-rose-600 flex items-center gap-2"><FiX className="w-5 h-5" /> Reject Equipment</h2>
                                <button onClick={() => setShowRejectModal(false)} className="p-2 hover:bg-rose-100 rounded-full transition-colors"><FiX /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Reason for Rejection</label>
                                    <textarea 
                                        className="w-full bg-slate-50 rounded-2xl p-4 font-medium outline-none border border-slate-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all resize-none h-32" 
                                        placeholder="Explain why this equipment is being rejected. The owner will see this message."
                                        value={rejectReason} 
                                        onChange={e => setRejectReason(e.target.value)} 
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 border-t flex gap-4">
                                <button type="button" onClick={() => setShowRejectModal(false)} className="flex-1 py-3.5 bg-white border rounded-2xl font-black text-xs uppercase text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button onClick={handleRejectConfirm} className="flex-[2] py-3.5 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all">Confirm Rejection</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManageProducts;

