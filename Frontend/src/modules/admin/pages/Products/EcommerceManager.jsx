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
    FiImage,
    FiEye
} from 'react-icons/fi';
import adminProductService from '../../../../services/adminProductService';
import { publicCatalogService } from '../../../../services/catalogService';
import { configService } from '../../../../services/configService';
import { toastManager } from '../../../../utils/toastManager';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const EcommerceManager = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [pendingProducts, setPendingProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [activeTab, setActiveTab] = useState('marketplace'); // 'marketplace' or 'pending'
    const [platformGst, setPlatformGst] = useState(18); // Settings se aayegi GST
    
    const [formData, setFormData] = useState({
        title: '',
        categoryId: '',
        brandName: '',
        description: '',
        price: '',
        discountPrice: '',
        unit: 'bag',
        stock: 0,
        imageUrl: '',
        images: [],
        isFeatured: false,
        specifications: [],
        gstPercentage: platformGst, // Settings se aata hai
        commissionPercentage: 10
    });

    useEffect(() => {
        fetchData();
        // Settings se platform GST fetch karo
        configService.getSettings().then(res => {
            if (res.success && res.settings?.serviceGstPercentage != null) {
                const gst = res.settings.serviceGstPercentage;
                setPlatformGst(gst);
                // formData mein bhi update karo taaki naye product form mein sahi GST aaye
                setFormData(prev => ({ ...prev, gstPercentage: gst }));
            }
        });
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [prodRes, pendingRes, catRes] = await Promise.all([
                adminProductService.getAll(),
                adminProductService.getVendorSubmissions('pending', 'physical_good'),
                publicCatalogService.getCategories()
            ]);
            // getAllProducts now returns both admin + approved vendor products
            if (prodRes.success) setProducts((prodRes.data || []).filter(p => p.type === 'physical_good'));
            // Pending tab: Only pending vendor submissions (not yet approved)
            if (pendingRes.success) setPendingProducts(pendingRes.data);
            if (catRes.success) {
                setCategories(catRes.categories || catRes.data || []);
            }
        } catch (err) {
            toastManager.error("Marketplace data load karne mein dikkat hui");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            setUploading(true);
            const token = sessionStorage.getItem('adminAccessToken') || localStorage.getItem('adminAccessToken');
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

            const uploadedUrls = [];
            for (const file of files) {
                const uploadFormData = new FormData();
                uploadFormData.append('file', file);
                
                const res = await fetch(`${baseUrl}/admin/upload`, {
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
                setFormData(prev => ({ 
                    ...prev, 
                    imageUrl: prev.imageUrl || uploadedUrls[0],
                    images: [...(prev.images || []), ...uploadedUrls]
                }));
                toastManager.success(`${uploadedUrls.length} images upload ho gayi!`);
            }
        } catch (err) {
            toastManager.error("Image upload fail ho gayi");
        } finally {
            setUploading(false);
        }
    };

    const handleToggleFeatured = async (id) => {
        try {
            const res = await adminProductService.update(id, { isFeatured: !products.find(p => p._id === id).isFeatured });
            if (res.success) {
                setProducts(products.map(p =>
                    p._id === id ? { ...p, isFeatured: res.data.isFeatured } : p
                ));
                toastManager.success("Featured status updated");
            }
        } catch (err) {
            toastManager.error("Status update nahi ho paya");
        }
    };

    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [approvalData, setApprovalData] = useState({ id: null, commissionPercentage: 10, gstPercentage: 18 });

    const handleApproveClick = (product) => {
        // Settings se fetched platformGst use karo (default 18 nahi)
        setApprovalData({ id: product._id, commissionPercentage: 10, gstPercentage: platformGst });
        setShowApprovalModal(true);
    };

    const handleConfirmApprove = async () => {
        try {
            const res = await adminProductService.approveProduct(approvalData.id, {
                commissionPercentage: approvalData.commissionPercentage,
                gstPercentage: approvalData.gstPercentage
            });
            if (res.success) {
                toastManager.success("Platform entry approved and live!");
                setShowApprovalModal(false);
                fetchData();
            }
        } catch (err) {
            toastManager.error("Approval failed");
        }
    };

    const handleReject = async (id) => {
        const reason = window.prompt("Enter reason for rejection:");
        if (reason === null) return;
        try {
            const res = await adminProductService.rejectProduct(id, reason);
            if (res.success) {
                toastManager.success("Product rejected");
                fetchData();
            }
        } catch (err) {
            toastManager.error("Rejection failed");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Kya aap waqai is product ko delete karna chahte hain?")) return;
        try {
            const res = await adminProductService.delete(id);
            if (res.success) {
                setProducts(products.filter(p => p._id !== id));
                toastManager.success("Product uda diya gaya");
            }
        } catch (err) {
            toastManager.error("Delete nahi ho paya");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.price || !formData.unit) {
            return toastManager.error("Kripya Title, Price aur Unit bharein");
        }

        try {
            let res;
            if (editMode) {
                res = await adminProductService.update(currentProduct._id, formData);
            } else {
                res = await adminProductService.create(formData);
            }

            if (res.success) {
                toastManager.success(editMode ? "Product update ho gaya" : "Naya product add ho gaya");
                setShowModal(false);
                fetchData();
                resetForm();
            }
        } catch (err) {
            toastManager.error(err.response?.data?.message || "Submit fail ho gaya");
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
            unit: 'bag',
            stock: 0,
            imageUrl: '',
            images: [],
            isFeatured: false,
            specifications: [],
            gstPercentage: 18,
            commissionPercentage: 10
        });
        setEditMode(false);
        setCurrentProduct(null);
    };

    const openEdit = (product) => {
        setCurrentProduct(product);
        setFormData({
            title: product.title,
            categoryId: product.categoryId?._id || product.categoryId,
            brandName: product.brandName || '',
            description: product.description || '',
            price: product.price,
            discountPrice: product.discountPrice || '',
            unit: product.unit,
            stock: product.stock,
            imageUrl: product.imageUrl || '',
            images: product.images || (product.imageUrl ? [product.imageUrl] : []),
            isFeatured: product.isFeatured || false,
            specifications: product.specifications || [],
            gstPercentage: product.gstPercentage ?? 18,
            commissionPercentage: product.commissionPercentage ?? 10
        });
        setEditMode(true);
        setShowModal(true);
    };

    const currentList = activeTab === 'marketplace' ? products : pendingProducts;
    const trimmedSearch = searchTerm.trim().toLowerCase();
    
    const filteredProducts = currentList.filter(p =>
        p.title?.toLowerCase().includes(trimmedSearch) ||
        p.brandName?.toLowerCase().includes(trimmedSearch)
    );

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">Marketplace Management</h1>
                    <p className="text-sm text-slate-500 font-medium">Manage Seeds, Fertilizers & Crop Inputs</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/admin/products/orders')}
                        className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-800 px-6 py-3 rounded-2xl font-bold shadow-sm hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <FiPackage className="w-5 h-5" /> Global Orders
                    </button>
                </div>
            </div>

            {/* Stats & Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Products</p>
                    <p className="text-2xl font-black text-slate-800">{products.length}</p>
                </div>
                <div className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vendor Entries</p>
                    <p className="text-2xl font-black text-orange-600">{pendingProducts.length}</p>
                </div>
                <div className="md:col-span-2 bg-white px-5 py-2 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-3">
                    <FiSearch className="text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search Seeds/Fertilizers..."
                        className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 placeholder:text-slate-300"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('marketplace')}
                    className={`pb-4 px-2 font-black text-sm uppercase tracking-wider transition-all relative ${
                        activeTab === 'marketplace' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    Store Catalog ({products.length})
                    {activeTab === 'marketplace' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 rounded-t-full" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`pb-4 px-2 font-black text-sm uppercase tracking-wider transition-all relative flex items-center gap-2 ${
                        activeTab === 'pending' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    Marketplace Approvals 
                    {pendingProducts.length > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === 'pending' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                            {pendingProducts.length}
                        </span>
                    )}
                    {activeTab === 'pending' && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full" />
                    )}
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vendor / Shop</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-6 py-8 bg-slate-50/50"></td>
                                    </tr>
                                ))
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-20 text-center font-bold text-slate-400">No marketplace items found</td>
                                </tr>
                            ) : filteredProducts.map((product) => (
                                <tr key={product._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FiPackage className="text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-sm leading-tight">{product.title}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{product.brandName || 'Local'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">
                                            {product.categoryId?.title || 'Agri Item'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {product.vendorId ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                                                    <FiUser className="w-3 h-3 text-teal-600" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-700 text-xs leading-tight">{product.vendorId?.businessName || product.vendorId?.name || 'Vendor'}</p>
                                                    <p className="text-[9px] text-teal-600 font-bold uppercase">Shop</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase">Admin Store</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                         <p className="font-black text-emerald-600 text-sm">₹{product.discountPrice > 0 ? product.discountPrice : product.price}</p>
                                         {product.discountPrice > 0 && (
                                            <p className="text-[10px] text-slate-300 line-through font-bold">₹{product.price}</p>
                                         )}
                                         <div className="flex gap-1.5 mt-1 text-[9px] font-black uppercase text-slate-400">
                                             <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">GST: {product.gstPercentage ?? 18}%</span>
                                             <span className="bg-slate-100 px-1.5 py-0.5 rounded text-teal-600">COM: {product.commissionPercentage ?? 10}%</span>
                                         </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className={`font-black text-sm ${product.stock > 10 ? 'text-slate-700' : product.stock > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {product.stock} {product.unit}
                                        </p>
                                        {product.stock === 0 && (
                                            <p className="text-[9px] text-rose-500 font-black uppercase">Out of Stock</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {activeTab === 'pending' ? (
                                                <>
                                                    <button type="button" onClick={() => openEdit(product)} className="px-3 py-2 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"><FiEye className="w-3.5 h-3.5" /> View</button>
                                                    <button type="button" onClick={() => handleApproveClick(product)} className="px-4 py-2 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-xl transition-all">Approve</button>
                                                    <button type="button" onClick={() => handleReject(product._id)} className="px-4 py-2 bg-rose-50 text-rose-600 font-bold text-xs rounded-xl transition-all">Reject</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button type="button" onClick={() => openEdit(product)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all" title="View Details"><FiEye className="w-4 h-4" /></button>
                                                    {!product.vendorId && (
                                                        <button type="button" onClick={() => openEdit(product)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all" title="Edit"><FiEdit2 className="w-4 h-4" /></button>
                                                    )}
                                                    <button type="button" onClick={() => handleDelete(product._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Delete"><FiTrash2 className="w-4 h-4" /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Product Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 40px)' }}>
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black text-slate-800">{activeTab === 'pending' ? 'Review Submission' : (editMode ? 'Edit Product' : 'New Marketplace Item')}</h2>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Catalog Entry</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors">✕</button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-6">
                                    {/* Vendor Info Banner */}
                                    {currentProduct?.vendorId && (
                                        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-center justify-between">
                                            <div>
                                                <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest leading-none">Submitted By Vendor</p>
                                                <p className="text-sm font-black text-slate-800 mt-2">{currentProduct.vendorId.businessName || currentProduct.vendorId.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1">{currentProduct.vendorId.phoneNumber || currentProduct.vendorId.email}</p>
                                            </div>
                                            <span className="px-3 py-1 bg-teal-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider">Vendor Product</span>
                                        </div>
                                    )}

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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</label>
                                            <input required className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 font-bold text-slate-700 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand</label>
                                            <input className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 font-bold text-slate-700 outline-none" value={formData.brandName} onChange={e => setFormData({...formData, brandName: e.target.value})} />
                                        </div>
                                        <div className="space-y-1 text-sm font-bold">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Base Price</label>
                                            <input type="number" min="0" required className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 font-bold text-slate-700 outline-none" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                                        </div>
                                        <div className="space-y-1 text-sm font-bold">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discount Price</label>
                                            <input type="number" min="0" className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 font-bold text-emerald-600 outline-none" value={formData.discountPrice} onChange={e => setFormData({...formData, discountPrice: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock</label>
                                            <input type="number" min="0" className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 font-bold text-slate-700 outline-none" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit (e.g. bag, kg)</label>
                                            <input className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 font-bold text-slate-700 outline-none" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GST Percentage (%)</label>
                                            <input type="number" min="0" className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 font-bold text-slate-700 outline-none" value={formData.gstPercentage} onChange={e => setFormData({...formData, gstPercentage: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Commission (%)</label>
                                            <input type="number" min="0" className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 font-bold text-slate-700 outline-none" value={formData.commissionPercentage} onChange={e => setFormData({...formData, commissionPercentage: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                                        <textarea rows="3" className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 font-medium text-slate-700 outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                                    </div>
                                </div>
                                <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                                    <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all">Cancel</button>
                                    <button type="submit" className="flex-[2] px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">{editMode ? 'Update Product' : 'Add to Marketplace'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Approval Modal */}
            <AnimatePresence>
                {showApprovalModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl flex flex-col gap-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Finalize Approval</h3>
                                <p className="text-sm text-slate-500 font-bold mt-1">Set platform fees and taxes for this product</p>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Commission (%)</label>
                                    <input type="number" className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 font-black text-slate-700 outline-none" value={approvalData.commissionPercentage} onChange={e => setApprovalData({...approvalData, commissionPercentage: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GST Percentage (%)</label>
                                    <input type="number" className="w-full bg-slate-50 border-none rounded-2xl py-3 px-4 font-black text-slate-700 outline-none" value={approvalData.gstPercentage} onChange={e => setApprovalData({...approvalData, gstPercentage: e.target.value})} />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowApprovalModal(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                                <button onClick={handleConfirmApprove} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-100">Confirm & Live</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EcommerceManager;
