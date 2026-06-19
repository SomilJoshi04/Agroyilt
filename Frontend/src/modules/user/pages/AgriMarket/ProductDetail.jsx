import React, { useState, useEffect } from 'react';
import { 
    FiChevronLeft, 
    FiPackage, 
    FiCheckCircle, 
    FiInfo,
    FiPlus,
    FiMinus,
    FiShield,
    FiTruck
} from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';
import ecommerceService from '../../../../services/ecommerceService';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import LocationPicker from '../Checkout/components/LocationPicker';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [showCheckout, setShowCheckout] = useState(false);
    const [address, setAddress] = useState(null); // Will hold {addressLine1, lat, lng}

    useEffect(() => {
        fetchProduct();
    }, [id]);

    const fetchProduct = async () => {
        try {
            setLoading(true);
            const res = await ecommerceService.getProductDetails(id);
            if (res.success) setProduct(res.data);
        } catch (err) {
            toast.error("Failed to load product details");
        } finally {
            setLoading(false);
        }
    };

    const handlePlaceOrder = async () => {
        if (!address || !address.addressLine1) return toast.error("Please pin your location on the map");
        try {
            const res = await ecommerceService.placeOrder({
                productId: product._id,
                quantity,
                shippingAddress: address
            });
            if (res.success) {
                toast.success("Order Placed! Please pay the platform fee to confirm.");
                navigate(`/user/order-payment/${res.data._id}`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Order failed");
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-12 overflow-hidden"><div className="w-12 h-12 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" /></div>;
    if (!product) return <div className="p-20 text-center font-black text-slate-400">PRODUCT NOT FOUND</div>;

    const basePrice = product.price || 0;
    const commissionPercentage = product.commissionPercentage || 0;
    const gstPercentage = product.gstPercentage || 5;

    const commission = basePrice * (commissionPercentage / 100);
    const gst = basePrice * (gstPercentage / 100);
    const calculatedPlatformFee = (commission + gst).toFixed(2);
    const calculatedVendorPrice = (basePrice - commission).toFixed(2);

    const pricing = product.calculatorPrice || { 
        totalPrice: Number(calculatedPlatformFee) + Number(calculatedVendorPrice), 
        platformFee: Number(calculatedPlatformFee), 
        vendorPrice: Number(calculatedVendorPrice) 
    };

    const totalPayable = pricing.totalPrice * quantity;
    const adminFee = pricing.platformFee * quantity;
    const vendorBalance = pricing.vendorPrice * quantity;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Gallery Section */}
            <div className="relative aspect-square bg-white rounded-b-[64px] overflow-hidden shadow-sm">
                <div className="absolute top-12 left-6 z-10">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-900/10 active:scale-95 transition-all">
                        <FiChevronLeft className="w-6 h-6 text-slate-800" />
                    </button>
                </div>
                
                {product.images && product.images.length > 0 ? (
                    <div className="w-full h-full flex overflow-x-auto snap-x scrollbar-hide">
                        {product.images.map((img, idx) => (
                            <img key={idx} src={img} alt="" className="w-full h-full object-cover flex-shrink-0 snap-center" />
                        ))}
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-100"><FiPackage className="w-24 h-24" /></div>
                )}
            </div>

            <div className="p-8 space-y-8 pb-40">
                {/* Title & Price */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">{product.brandName || 'Local Brand'}</p>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Stock: {product.stock} {product.unit}s</p>
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 leading-tight">{product.title}</h1>
                    
                    <div className="flex items-baseline gap-2 pt-2">
                        <p className="text-3xl font-black text-slate-800">₹{pricing.totalPrice}</p>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">/ {product.unit}</p>
                        <p className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full ml-2">Verified Price</p>
                    </div>
                </div>

                {/* Split Payment Info */}
                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-widest">
                        <FiInfo className="text-teal-600" /> Payment Structure
                    </div>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-4 bg-teal-50 rounded-2xl border border-teal-100/50">
                            <div>
                                <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest leading-none">Platform Fee (Admin)</p>
                                <p className="text-[8px] font-bold text-teal-400 mt-1 uppercase tracking-tighter">Pay now to confirm order</p>
                            </div>
                            <p className="text-lg font-black text-teal-700 font-sans">₹{pricing.platformFee}</p>
                        </div>
                        
                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Vendor Balance</p>
                                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Pay to vendor directly on delivery</p>
                            </div>
                            <p className="text-lg font-black text-slate-800 font-sans">₹{pricing.vendorPrice}</p>
                        </div>
                    </div>
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Quantity</h3>
                    <div className="flex items-center gap-6 bg-white p-2 border border-slate-100 rounded-3xl shadow-sm">
                        <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center font-bold active:scale-90 transition-all">
                            <FiMinus />
                        </button>
                        <span className="text-xl font-black text-slate-800 font-sans min-w-[30px] text-center">{quantity}</span>
                        <button onClick={() => setQuantity(q => q + 1)} className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold active:scale-90 transition-all">
                            <FiPlus />
                        </button>
                    </div>
                </div>

                {/* Description & Specs */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">About Product</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{product.description || 'No description provided'}</p>
                    
                    {product.specifications && product.specifications.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            {product.specifications.map((spec, i) => (
                                <div key={i} className="p-3 bg-white rounded-2xl border border-slate-50 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <FiCheckCircle className="text-teal-600 text-xs" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none">{spec.name}</p>
                                        <p className="text-[10px] font-black text-slate-800 uppercase leading-none mt-1">{spec.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0">
                            <FiShield />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">Admin<br/>Verified</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 flex-shrink-0">
                            <FiTruck />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">Fast<br/>Delivery</p>
                    </div>
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-6 pt-2 bg-slate-50 border-t border-slate-100 z-50">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Value</p>
                        <p className="text-2xl font-black text-slate-800">₹{totalPayable}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-teal-500 uppercase tracking-widest">Pay Now</p>
                        <p className="text-2xl font-black text-teal-600">₹{adminFee}</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowCheckout(true)}
                    className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] py-5 rounded-[28px] font-black text-white shadow-2xl shadow-green-900/20 active:scale-95 transition-all text-lg uppercase tracking-wider"
                >
                    Order Now
                </button>
            </div>

            {/* Checkout Modal */}
            <AnimatePresence>
                {showCheckout && (
                    <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:p-6 sm:items-center">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCheckout(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative bg-white w-full max-w-md mx-auto rounded-t-[48px] sm:rounded-[48px] p-6 pb-8 shadow-2xl flex flex-col max-h-[90dvh]">
                            <div className="shrink-0 pb-4">
                                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
                                <h2 className="text-xl font-black text-slate-800 text-center">Confirm Order</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mt-1">Seeds & Fertilizers Delivery</p>
                            </div>
                            
                            <div className="space-y-6 overflow-y-auto overflow-x-hidden p-2 pb-4 scrollbar-hide flex-1 shrink">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pin Location on Map</label>
                                    <div className="w-full rounded-3xl overflow-hidden border border-slate-100 shadow-sm relative isolate" style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
                                        <LocationPicker onLocationSelect={(loc) => {
                                            // Parse city/state from Google address_components if available
                                            let city = '', state = '', pincode = '';
                                            if (loc.components && Array.isArray(loc.components)) {
                                                loc.components.forEach(comp => {
                                                    if (comp.types.includes('locality')) city = comp.long_name;
                                                    if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
                                                    if (comp.types.includes('postal_code')) pincode = comp.long_name;
                                                });
                                            }
                                            setAddress({
                                                addressLine1: loc.address || '',
                                                city,
                                                state,
                                                pincode,
                                                lat: loc.lat || null,
                                                lng: loc.lng || null
                                            });
                                        }} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Complete Address Details</label>
                                    <div className="relative">
                                        <textarea 
                                            rows="3"
                                            className="w-full bg-white border border-slate-200 rounded-3xl py-4 px-5 font-bold outline-none text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all resize-none shadow-sm" 
                                            placeholder="Add house no, street, landmark..." 
                                            value={address?.addressLine1 || ''} 
                                            onChange={e => setAddress(prev => ({ ...(prev || {}), addressLine1: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-orange-50 rounded-3xl border border-orange-100 flex items-start gap-3">
                                    <FiInfo className="text-orange-500 mt-1 flex-shrink-0" />
                                    <p className="text-[10px] font-bold text-orange-800 leading-relaxed">
                                        You are paying ₹{adminFee} to confirm the order. The remaining ₹{vendorBalance} must be paid to the vendor directly when goods are delivered to you.
                                    </p>
                                </div>

                                <button 
                                    onClick={handlePlaceOrder}
                                    className="w-full py-5 bg-[#2E7D32] text-white rounded-[28px] font-black text-lg uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-green-900/10"
                                >
                                    Confirm & Pay ₹{adminFee}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProductDetail;
