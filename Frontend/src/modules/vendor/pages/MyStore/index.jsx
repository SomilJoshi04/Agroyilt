import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiSearch,
    FiChevronLeft,
    FiImage,
    FiTrendingUp,
    FiPackage,
    FiInfo,
    FiAlertCircle,
    FiShoppingBag,
    FiMapPin,
    FiFileText
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import vendorProductService from '../../services/vendorProductService';
import { publicCatalogService } from '../../../../services/catalogService';
import { vendorTheme as themeColors } from '../../../../theme';
import { toastManager } from '../../../../utils/toastManager';
import { motion, AnimatePresence } from 'framer-motion';

const MyStore = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [shopStatus, setShopStatus] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showDocModal, setShowDocModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        categoryId: '',
        brandName: '',
        description: '',
        price: '',
        unit: 'bag',
        bagWeight: 50,
        stock: 1,
        imageUrl: '',
        images: [],
        specifications: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    // Lock background scroll when any modal is open
    useEffect(() => {
        if (showModal || showDocModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showModal, showDocModal]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [prodRes, catRes, shopRes] = await Promise.all([
                vendorProductService.getMyProducts(),
                publicCatalogService.getCategories({ type: 'product' }),
                vendorProductService.getShopStatus()
            ]);
            if (prodRes.success) setProducts(prodRes.data || []);
            if (catRes.success) setCategories(catRes.categories || catRes.data || []);
            if (shopRes.success) setShopStatus(shopRes.data);
        } catch (err) {
            toastManager.error("Data load karne mein dikkat hui");
        } finally {
            setLoading(false);
        }
    };

    const handleQuickStockUpdate = async (product) => {
        const newStock = prompt(`Enter new stock quantity for "${product.title}":`, product.stock);
        if (newStock === null) return;
        const stockVal = parseInt(newStock, 10);
        if (isNaN(stockVal) || stockVal < 0) {
            toastManager.error("Please enter a valid stock number");
            return;
        }
        try {
            const res = await vendorProductService.updateProduct(product._id, { ...product, stock: stockVal });
            if (res.success) {
                toastManager.success("Stock updated successfully");
                fetchData();
            } else {
                toastManager.error(res.message || "Failed to update stock");
            }
        } catch (err) {
            toastManager.error("Error updating stock");
        }
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            setUploading(true);
            const token = sessionStorage.getItem('vendorAccessToken') || localStorage.getItem('vendorAccessToken');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            const uploadedUrls = [];
            for (const file of files) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', file);

                const res = await fetch(`${baseUrl}/upload`, { 
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: uploadFormData
                });
                const data = await res.json();
                if (data.success) {
                    uploadedUrls.push(data.imageUrl);
                }
            }

            if (uploadedUrls.length > 0) {
                setFormData(prev => {
                    const newImages = [...(prev.images || []), ...uploadedUrls];
                    return {
                        ...prev,
                        imageUrl: newImages[0] || prev.imageUrl,
                        images: newImages
                    };
                });
                toastManager.success(`${uploadedUrls.length} image(s) uploaded!`);
            }
        } catch (err) {
            toastManager.error("Image upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.price) {
            return toastManager.error("Please fill Title and Price");
        }

        try {
            let res;
            if (editMode) {
                res = await vendorProductService.updateProduct(formData._id, formData);
            } else {
                res = await vendorProductService.addProduct(formData);
            }

            if (res.success) {
                toastManager.success(res.message || (editMode ? "Product updated successfully" : "Product submitted for review"));
                setShowModal(false);
                fetchData();
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || "Action failed";
            toastManager.error(errMsg);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Kaya aap is product ko delete karna chahte hain?")) return;
        try {
            const res = await vendorProductService.deleteProduct(id);
            if (res.success) {
                setProducts(products.filter(p => p._id !== id));
                toastManager.success("Product removed");
            }
        } catch (err) {
            toastManager.error("Delete failed");
        }
    };

    const openEdit = (product) => {
        setFormData({
            ...product,
            images: product.images && product.images.length > 0 ? product.images : (product.imageUrl ? [product.imageUrl] : []),
            specifications: product.specifications || [],
            categoryId: product.categoryId?._id || product.categoryId
        });
        setEditMode(true);
        setShowModal(true);
    };

    if (!loading && !shopStatus?.isStoreApproved) {
        return (
            <div className="min-h-screen bg-slate-50 pb-20">
                <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100 flex items-center px-4 py-4 gap-4">
                    <button onClick={() => navigate('/vendor/profile')} className="p-2 bg-slate-100 rounded-xl">
                        <FiChevronLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-black text-slate-800 leading-tight">My Agri-Store</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Management</p>
                    </div>
                </div>

                <div className="p-8 flex flex-col items-center justify-center pt-24 text-center">
                    <div className="w-24 h-24 bg-amber-50 rounded-[40px] flex items-center justify-center mb-6 shadow-inner border border-amber-100/50">
                        <FiAlertCircle className="w-10 h-10 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 leading-tight">Shop Verification Required</h2>
                    <p className="text-slate-500 mt-4 px-6 text-sm font-medium leading-relaxed max-w-sm">
                        {shopStatus?.storeApprovalStatus === 'pending' 
                            ? "Your shop registration is currently under review by admin. We will notify you once it is approved."
                            : "To start selling seeds and fertilizers, you must first register your shop details and get admin approval."}
                    </p>
                    
                    <div className="w-full space-y-3 mt-12">
                        {shopStatus?.storeApprovalStatus !== 'pending' && (
                            <button 
                                onClick={() => navigate('/vendor/store/registration')}
                                className="w-full py-5 bg-teal-600 text-white rounded-[32px] font-black uppercase tracking-wider text-[11px] shadow-2xl shadow-teal-900/20 active:scale-95 transition-all"
                            >
                                Register My Shop Now
                            </button>
                        )}
                        <button 
                            onClick={() => navigate('/vendor/profile')}
                            className="w-full py-5 bg-white border-2 border-slate-100 text-slate-600 rounded-[32px] font-black uppercase tracking-wider text-[11px] active:scale-95 transition-all"
                        >
                            Back to Profile
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Custom Navbar */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100 flex items-center px-4 py-4 gap-4">
                <button onClick={() => navigate('/vendor/profile')} className="p-2 bg-slate-100 rounded-xl">
                    <FiChevronLeft className="w-6 h-6 text-slate-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-black text-slate-800 leading-tight">My Agri-Store</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seeds & Fertilizers Inventory</p>
                </div>
            </div>

            <div className="p-6 space-y-6 pb-32">
                {/* Shop Information Section */}
                {shopStatus && (
                    <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div>
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Shop Information</h2>
                                <p className="text-[9px] font-black text-teal-600 uppercase">Verified Business Details</p>
                            </div>
                            <button 
                                onClick={() => navigate('/vendor/store/registration')}
                                className="px-4 py-2 bg-slate-50 text-[10px] font-black text-slate-600 rounded-xl uppercase tracking-wider border border-slate-100 active:scale-95 transition-all"
                            >
                                Edit Info
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center flex-shrink-0 border border-slate-100">
                                    <FiShoppingBag className="text-slate-400 text-lg" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Shop Name</p>
                                    <p className="text-sm font-bold text-slate-800">{shopStatus.shopName}</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center flex-shrink-0 border border-slate-100">
                                    <FiMapPin className="text-slate-400 text-lg" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Address</p>
                                    <p className="text-[11px] font-medium text-slate-600 leading-tight">{shopStatus.shopAddress}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-2">
                                <div className="flex items-center gap-2">
                                    <FiFileText className="text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">License: {shopStatus.shopLicense}</span>
                                </div>
                                {shopStatus.licenseDocument && (
                                    <button 
                                        onClick={() => setShowDocModal(true)}
                                        className="text-[9px] font-black text-teal-600 uppercase underline tracking-widest"
                                    >
                                        View Document
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100">
                        <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center mb-3">
                            <FiPackage className="text-teal-600 text-xl" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Products</p>
                        <p className="text-2xl font-black text-slate-800">{products.length}</p>
                    </div>
                    <div className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
                            <FiTrendingUp className="text-amber-600 text-xl" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Status</p>
                        <p className="text-2xl font-black text-slate-800">{products.filter(p => p.approvalStatus === 'approved').length}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => {
                            setEditMode(false);
                            setFormData({ 
                                title: '', categoryId: '', brandName: '', description: '', price: '', unit: 'bag', bagWeight: 50, stock: 1, 
                                imageUrl: '', images: [], specifications: []
                            });
                            setShowModal(true);
                        }}
                        className="flex items-center justify-center gap-2 py-5 rounded-[32px] font-black text-white shadow-xl shadow-green-900/10 active:scale-95 transition-all text-[11px] uppercase tracking-wider"
                        style={{ backgroundColor: themeColors.button || '#2E7D32' }}
                    >
                        <FiPlus className="w-4 h-4" /> Add Product
                    </button>
                    <button
                        onClick={() => navigate('/vendor/store/orders')}
                        className="flex items-center justify-center gap-2 py-5 rounded-[32px] font-black text-[#2E7D32] bg-white border-2 border-[#2E7D32]/20 shadow-xl shadow-green-900/5 active:scale-95 transition-all text-[11px] uppercase tracking-wider"
                    >
                        <FiPackage className="w-4 h-4" /> Shop Orders
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Inventory List</h2>
                        <FiSearch className="text-slate-400" />
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin"></div>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="bg-white p-12 rounded-[40px] border-2 border-dashed border-slate-200 text-center">
                            <FiPackage className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="font-black text-slate-800">No products added</p>
                            <p className="text-xs text-slate-400">Add fertilizers or seeds to start selling</p>
                        </div>
                    ) : (
                        products.map(product => (
                            <div key={product._id} className="bg-white p-4 rounded-[32px] shadow-sm border border-slate-100 flex gap-4">
                                <div className="w-20 h-20 rounded-2xl bg-slate-50 flex-shrink-0 overflow-hidden border border-slate-100 shadow-inner">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <FiImage className="text-2xl" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-black text-slate-800 text-base leading-tight truncate">{product.title}</h3>
                                            <p className="text-[10px] font-black text-teal-600 uppercase mt-0.5">{product.brandName || 'Local Brand'}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <p className="font-black text-slate-800 text-base">₹{product.price}</p>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border ${
                                                product.approvalStatus === 'approved' ? (product.stock <= 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-green-50 text-green-600 border-green-100') :
                                                product.approvalStatus === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                                {product.approvalStatus === 'approved' ? (product.stock <= 0 ? 'Out of Stock' : 'Live') : product.approvalStatus === 'rejected' ? 'Rejected' : 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mt-3">
                                        <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase text-slate-400 tracking-tighter">
                                            <span 
                                                onClick={() => handleQuickStockUpdate(product)}
                                                className="bg-slate-50 hover:bg-slate-100 hover:text-teal-700 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors border border-slate-100"
                                                title="Click to quickly update stock"
                                            >
                                                Stock: {product.stock} {product.unit}s
                                                <FiEdit2 className="w-2.5 h-2.5" />
                                            </span>
                                            <span className="bg-slate-50 px-2 py-1 rounded-lg">Weight: {product.bagWeight} KG</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => openEdit(product)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-800 transition-colors">
                                                <FiEdit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(product._id)} className="p-2 bg-rose-50 text-rose-400 rounded-xl hover:text-rose-600 transition-colors">
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    {product.approvalStatus === 'rejected' && (
                                        <p className="mt-2 text-[10px] text-rose-500 font-bold bg-rose-50/50 p-2 rounded-xl">Reason: {product.rejectionReason}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showModal && (
                        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="relative bg-white w-full h-full sm:h-auto sm:max-w-xl sm:max-h-[90vh] rounded-none sm:rounded-[48px] shadow-2xl overflow-hidden flex flex-col"
                            >
                                <div className="p-6 sm:p-8 pb-4 sm:pb-4 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-slate-50">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800">{editMode ? 'Edit Product' : 'Add New Product'}</h2>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seeds & Fertilizers details</p>
                                    </div>
                                    <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-bold">✕</button>
                                </div>

                                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                    <div className="p-6 sm:p-8 space-y-6 overflow-y-auto scrollbar-hide flex-1">
                                        {/* Image Upload */}
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-slate-400">Product Photos</label>
                                            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                                                {(formData.images || []).map((img, idx) => (
                                                    <div key={idx} className="relative w-24 h-24 flex-shrink-0 rounded-[28px] bg-slate-50 border border-slate-100 overflow-hidden group">
                                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                                        <button type="button" onClick={() => setFormData({...formData, images: formData.images.filter((_, i) => i !== idx)})}
                                                            className="absolute inset-0 bg-rose-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <FiTrash2 className="text-white w-5 h-5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <div className="w-24 h-24 flex-shrink-0 rounded-[28px] bg-slate-50 border-2 border-dashed border-slate-200 relative flex flex-col items-center justify-center">
                                                    <FiImage className="w-6 h-6 text-slate-300" />
                                                    {uploading ? (
                                                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div></div>
                                                    ) : (
                                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} accept="image/*" multiple />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Title</label>
                                                <input required type="text" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold outline-none" placeholder="e.g. Zinc Phosphide, Wheat Seeds" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1 md:col-span-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand Name</label>
                                                    <input type="text" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold outline-none" placeholder="e.g. IFFCO, Bayer" value={formData.brandName} onChange={e => setFormData({ ...formData, brandName: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Price (₹)</label>
                                                    <input required type="number" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold outline-none font-sans" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Type</label>
                                                    <select required className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold outline-none" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}>
                                                        <option value="bag">Bag</option>
                                                        <option value="packet">Packet</option>
                                                        <option value="kg">KG</option>
                                                        <option value="litre">Litre</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bag Weight (KG)</label>
                                                    <input required type="number" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold outline-none" value={formData.bagWeight} onChange={e => setFormData({ ...formData, bagWeight: e.target.value })} />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Available Stock (Bags)</label>
                                                    <input required type="number" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold outline-none" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                                <textarea rows="3" className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-medium outline-none" placeholder="Product details..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                            </div>
                                            
                                            <div className="p-4 bg-teal-50/50 rounded-2xl flex gap-3 border border-teal-100/50">
                                                <FiInfo className="text-teal-600 mt-1 flex-shrink-0" />
                                                <p className="text-[10px] font-bold text-teal-800 leading-relaxed">Admin will add GST and Commission to your base price before making the product live for farmers.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100 flex gap-4 flex-shrink-0">
                                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all">Cancel</button>
                                        <button type="submit" className="flex-[2] py-4 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl shadow-green-900/10">
                                            {editMode ? 'Update Product' : 'Add Product for Review'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
            {/* Document Viewer Modal */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showDocModal && shopStatus?.licenseDocument && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                onClick={() => setShowDocModal(false)} 
                                className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" 
                            />
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }} 
                                animate={{ scale: 1, opacity: 1 }} 
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="relative w-full max-w-lg bg-white rounded-[40px] overflow-hidden shadow-2xl"
                            >
                                <div className="p-6 flex items-center justify-between border-b border-slate-50">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">Shop License</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified Document</p>
                                    </div>
                                    <button 
                                        onClick={() => setShowDocModal(false)}
                                        className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center font-bold text-slate-400 hover:text-slate-800 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="p-4 bg-slate-50">
                                    <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-inner bg-white min-h-[300px] flex items-center justify-center">
                                        <img 
                                            src={shopStatus.licenseDocument} 
                                            alt="License" 
                                            className="max-w-full max-h-[60vh] object-contain"
                                        />
                                    </div>
                                </div>
                                <div className="p-6">
                                    <button 
                                        onClick={() => setShowDocModal(false)}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px]"
                                    >
                                        Close Viewer
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default MyStore;
