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
    const [viewEquipment, setViewEquipment] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);

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

    useEffect(() => {
        const handleOutsideClick = () => setActiveMenuId(null);
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
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
                <div className="overflow-x-auto pb-28">
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
                            const displaySubtitle = isVendorEq ? (p.modelNumber || p.year || 'Standard') : p.brandName;
                            const displayImage = isVendorEq ? p.images?.[0] : p.imageUrl;
                            const displayCategory = p.categoryId?.title || p.requestedCategoryName || 'Machine';
                            const vendorName = p.vendorId?.businessName || p.vendorId?.name || 'Vendor';
                            const vendorPhone = p.vendorId?.phone || '';

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
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        {isVendorEq ? (
                                            Object.entries(p.pricing || {}).filter(([, v]) => v?.isEnabled).map(([k, v]) => {
                                                const label = k === 'land_based' ? 'acre' : k === 'hourly' ? 'hr' : 'day';
                                                return (
                                                    <span key={k} className="inline-block text-[11px] font-extrabold text-slate-700 bg-slate-50 border border-slate-100 rounded px-2 py-0.5 whitespace-nowrap w-fit">
                                                        ₹{v.price}/{label}
                                                    </span>
                                                );
                                            })
                                        ) : (
                                            <span className="inline-block text-[11px] font-extrabold text-slate-700 bg-slate-50 border border-slate-100 rounded px-2 py-0.5 whitespace-nowrap w-fit">
                                                ₹{p.price}/{p.unit}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                            onClick={() => setActiveMenuId(activeMenuId === p._id ? null : p._id)}
                                            className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500 hover:text-slate-800"
                                        >
                                            <FiMoreVertical className="w-5 h-5" />
                                        </button>
                                        {activeMenuId === p._id && (
                                            <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-1.5 space-y-0.5 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                                                <button 
                                                    onClick={() => { setViewEquipment(p); setActiveMenuId(null); }}
                                                    className="w-full text-left px-3.5 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all flex items-center gap-2"
                                                >
                                                    <FiSearch className="w-3.5 h-3.5 text-slate-400" />
                                                    View Details
                                                </button>
                                                
                                                {activeTab === 'pending' ? (
                                                    <>
                                                        <button 
                                                            onClick={() => { handleApprove(p); setActiveMenuId(null); }}
                                                            className="w-full text-left px-3.5 py-2 text-xs font-black text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all flex items-center gap-2"
                                                        >
                                                            <FiCheck className="w-3.5 h-3.5" />
                                                            Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => { openRejectModal(p); setActiveMenuId(null); }}
                                                            className="w-full text-left px-3.5 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-all flex items-center gap-2"
                                                        >
                                                            <FiX className="w-3.5 h-3.5" />
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {!p.vendorId && (
                                                            <button 
                                                                onClick={() => { openEdit(p); setActiveMenuId(null); }}
                                                                className="w-full text-left px-3.5 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all flex items-center gap-2"
                                                            >
                                                                <FiEdit2 className="w-3.5 h-3.5 text-slate-400" />
                                                                Edit
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => { adminProductService.delete(p._id).then(fetchData); setActiveMenuId(null); }}
                                                            className="w-full text-left px-3.5 py-2 text-xs font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-all flex items-center gap-2"
                                                        >
                                                            <FiTrash2 className="w-3.5 h-3.5" />
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
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

                {/* View Equipment Details Modal */}
                {viewEquipment && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
                            {/* Modal Header */}
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg">
                                        Machinery / Equipment Details
                                    </h3>
                                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase">
                                        Status: <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                            viewEquipment.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            viewEquipment.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                        }`}>{viewEquipment.status}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setViewEquipment(null)}
                                    className="p-2 bg-white rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors shadow-sm font-black"
                                >
                                    <FiX className="w-5 h-5 text-slate-600" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-8 overflow-y-auto space-y-6">
                                {/* Images Gallery */}
                                {viewEquipment.images && viewEquipment.images.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Machine Photos</p>
                                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                                            {viewEquipment.images.map((img, idx) => (
                                                <div key={idx} className="w-40 h-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                                                    <img src={img} className="w-full h-full object-cover" alt="" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Core Details */}
                                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100/80">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Machine Name</p>
                                        <p className="text-sm font-black text-slate-800">{viewEquipment.name || viewEquipment.title}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Brand / Model</p>
                                        <p className="text-sm font-black text-slate-800">{viewEquipment.brandName || viewEquipment.modelNumber || 'N/A'}</p>
                                    </div>
                                    {viewEquipment.year && (
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Manufacturing Year</p>
                                            <p className="text-sm font-black text-slate-800">{viewEquipment.year}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Category</p>
                                        <p className="text-sm font-black text-slate-800">
                                            {viewEquipment.categoryId?.title || viewEquipment.requestedCategoryName || 'Machine'}
                                        </p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Description</p>
                                        <p className="text-xs font-semibold text-slate-600 leading-relaxed mt-1">
                                            {viewEquipment.description || 'No description provided.'}
                                        </p>
                                    </div>
                                </div>

                                {/* Pricing Details */}
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing Configuration</p>
                                    <div className="grid grid-cols-3 gap-4">
                                        {viewEquipment._source === 'vendorEquipment' ? (
                                            Object.entries(viewEquipment.pricing || {}).map(([key, val]) => {
                                                if (!val?.isEnabled) return null;
                                                const label = key === 'land_based' ? 'Acre-based' : key === 'hourly' ? 'Hourly' : 'Daily';
                                                return (
                                                    <div key={key} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-center">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
                                                        <p className="text-base font-black text-[#2E7D32] mt-1">₹{val.price}</p>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-center col-span-3">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Standard Price</p>
                                                <p className="text-base font-black text-[#2E7D32] mt-1">₹{viewEquipment.price} / {viewEquipment.unit}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Operator / Driver details */}
                                {viewEquipment.includesDriver && viewEquipment.driver && (
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Operator / Driver</p>
                                        <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-3xl border border-slate-100">
                                            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                                                {viewEquipment.driver.photo ? (
                                                    <img src={viewEquipment.driver.photo} className="w-full h-full object-cover rounded-xl" alt="" />
                                                ) : (
                                                    <FiUser className="w-6 h-6 text-slate-300" />
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 flex-1 text-xs font-bold text-slate-600">
                                                <div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Operator Name</span>
                                                    <span className="text-sm font-black text-slate-800">{viewEquipment.driver.name || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Phone Number</span>
                                                    <span className="text-sm font-black text-slate-800">{viewEquipment.driver.phone || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Aadhar Card</span>
                                                    <span className="text-xs font-black text-slate-800">{viewEquipment.driver.aadharNumber || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Driving License</span>
                                                    <span className="text-xs font-black text-slate-800">{viewEquipment.driver.licenseNumber || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Owner / Vendor info */}
                                {viewEquipment.vendorId && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor Information</p>
                                        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                                            <div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Business / Shop Name</span>
                                                <span className="text-sm font-black text-slate-800">{viewEquipment.vendorId.businessName || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Contact Person</span>
                                                <span className="text-sm font-black text-slate-800">{viewEquipment.vendorId.name}</span>
                                            </div>
                                            <div>
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Phone</span>
                                                <span className="text-sm font-black text-orange-600">{viewEquipment.vendorId.phone}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ManageProducts;

