import React, { useState, useEffect } from 'react';
import { 
    FiChevronLeft, 
    FiPackage, 
    FiShield,
    FiCheckCircle,
    FiInfo
} from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';
import ecommerceService from '../../../../services/ecommerceService';
import { toastManager } from '../../../../utils/toastManager';
import { motion } from 'framer-motion';

const OrderPayment = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);
    const [razorpayLoaded, setRazorpayLoaded] = useState(false);

    useEffect(() => {
        fetchOrder();
        loadRazorpayScript();
    }, [id]);

    const loadRazorpayScript = () => {
        if (window.Razorpay) {
            setRazorpayLoaded(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => setRazorpayLoaded(true);
        script.onerror = () => toastManager.error('Failed to load Razorpay SDK');
        document.body.appendChild(script);
    };

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await ecommerceService.getOrderById(id);
            if (res.success) setOrder(res.data);
        } catch (err) {
            toastManager.error("Order load karne mein dikkat hui");
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        try {
            setPaying(true);
            
            // 1. First create a Razorpay order from our backend
            const orderRes = await ecommerceService.createPaymentOrder(id);
            if (!orderRes.success) throw new Error(orderRes.message);
            
            const { order_id, amount, currency, key } = orderRes.data;

            if (!razorpayLoaded) {
                toastManager.error("Payment system not ready. Please refresh.");
                return;
            }

            // 2. Open Razorpay Checkout
            const options = {
                key: key,
                amount: amount,
                currency: currency,
                name: "Agroyilt",
                description: "Platform Fee for Seeds & Fertilizers",
                order_id: order_id,
                theme: { color: "#0D9488" },
                handler: async function (response) {
                    try {
                        // 3. Verify Payment
                        const verifyRes = await ecommerceService.payPlatformFee(id, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        });
                        
                        if (verifyRes.success) {
                            toastManager.success("Payment Successful! Order Confirmed.");
                            navigate('/user/my-agri-orders');
                        }
                    } catch (verifyErr) {
                        toastManager.error(verifyErr.response?.data?.message || "Payment verification failed");
                        setPaying(false);
                    }
                },
                modal: {
                    ondismiss: function() {
                        setPaying(false);
                        toastManager.error("Payment cancelled");
                    }
                }
            };
            
            const razorpay = new window.Razorpay(options);
            razorpay.on('payment.failed', function (response) {
                toastManager.error(`Payment failed: ${response.error.description}`);
                setPaying(false);
            });
            razorpay.open();
            
        } catch (err) {
            setPaying(false);
            toastManager.error(err.response?.data?.message || err.message || "Payment init failed");
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" /></div>;
    if (!order) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest text-[10px]">Order not found</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white px-6 pt-12 pb-6 border-b border-slate-100 flex items-center gap-4 sticky top-0 z-40">
                <button onClick={() => navigate(-1)} className="p-3 bg-slate-50 rounded-2xl">
                    <FiChevronLeft className="w-6 h-6 text-slate-800" />
                </button>
                <div>
                    <h1 className="text-xl font-black text-slate-800 leading-tight">Order Payment</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Platform Fee & Confirmation</p>
                </div>
            </div>

            <div className="p-8 pb-72 space-y-6">
                {/* Order Summary */}
                <div className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-100 space-y-4 overflow-hidden relative">
                    <div className="w-32 h-32 bg-slate-50 absolute -right-8 -top-8 rounded-full opacity-50" />
                    
                    <div className="relative">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Items Summary</p>
                        <h2 className="text-xl font-black text-slate-800">{order.items[0].name}</h2>
                        <div className="flex items-center gap-2 mt-2">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qty: {order.items[0].quantity} {order.items[0].unit}</p>
                             <span className="w-1 h-1 bg-slate-200 rounded-full" />
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price: ₹{order.items[0].price}</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50 space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items Subtotal</p>
                            <p className="font-black text-slate-800 font-sans">₹{order.pricing.itemsTotal}</p>
                        </div>
                        {order.pricing.platformFee > 0 && (
                            <div className="flex justify-between items-center px-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Fee & Taxes</p>
                                <p className="font-black text-slate-800 font-sans">₹{order.pricing.platformFee}</p>
                            </div>
                        )}
                        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center px-1">
                            <p className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Grand Total</p>
                            <p className="text-lg font-black text-slate-800 font-sans">₹{order.pricing.orderTotal || (order.pricing.itemsTotal + order.pricing.platformFee)}</p>
                        </div>
                    </div>
                </div>

                {/* Upfront Platform Fee / Total Payment Banner (Rendered Out of the Box) */}
                {order.paymentType === 'online_full' ? (
                    <div className="p-6 bg-teal-50/50 rounded-[28px] border border-teal-100/50 flex items-center justify-between shadow-sm">
                         <div>
                             <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest leading-none">Total Payment</p>
                             <p className="text-[9px] font-bold text-teal-600 mt-1.5 leading-none">Pay full amount online securely</p>
                         </div>
                         <p className="text-3xl font-black text-teal-700 font-sans">₹{order.pricing.orderTotal || (order.pricing.itemsTotal + order.pricing.gstAmount)}</p>
                    </div>
                ) : (
                    <div className="p-6 bg-teal-50/50 rounded-[28px] border border-teal-100/50 flex items-center justify-between shadow-sm">
                         <div>
                             <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest leading-none">Upfront Platform Fee</p>
                             <p className="text-[9px] font-bold text-teal-600 mt-1.5 leading-none">Pay now to confirm your order</p>
                         </div>
                         <p className="text-3xl font-black text-teal-700 font-sans">₹{order.pricing.platformFee}</p>
                    </div>
                )}

                {/* Important Instructions */}
                <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-emerald-600">
                        <FiShield className="w-5 h-5" />
                        <h3 className="text-xs font-black uppercase tracking-widest">Secure Handover</h3>
                    </div>
                    
                    {order.paymentType === 'online_full' ? (
                        <div className="space-y-3">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 text-xs font-black flex-shrink-0">1</div>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">Pay the total amount of ₹{order.pricing.orderTotal} securely to confirm your order.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 text-xs font-black flex-shrink-0">2</div>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">The Vendor will pack and ship your seeds/fertilizers within 48 hours.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 text-xs font-black flex-shrink-0">3</div>
                                <p className="text-[10px] font-black text-teal-600 leading-relaxed uppercase tracking-widest">FULLY PAID: Nothing to pay to the vendor upon delivery.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 text-xs font-black flex-shrink-0">1</div>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">Pay Platform Fee of ₹{order.pricing.platformFee} securely to confirm your order.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 text-xs font-black flex-shrink-0">2</div>
                                <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">The Vendor will pack and ship your seeds/fertilizers within 48 hours.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 text-xs font-black flex-shrink-0">3</div>
                                <p className="text-[10px] font-black text-teal-600 leading-relaxed uppercase tracking-widest">PAID TO VENDOR: Pay the remaining ₹{order.pricing.vendorBalance} directly to vendor on delivery.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Pay Button */}
            <div className="fixed bottom-0 left-0 right-0 p-8 pt-4 bg-slate-50 border-t border-slate-100 z-50">
                <button 
                    disabled={paying}
                    onClick={handlePayment}
                    className="w-full py-5 bg-teal-600 text-white rounded-[32px] font-black text-lg uppercase tracking-widest shadow-2xl shadow-teal-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                    {paying ? (
                         <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>{order.paymentType === 'online_full' ? `Pay Total Amount (₹${order.pricing.orderTotal})` : `Pay Confirm Fee (₹${order.pricing.platformFee})`}</>
                    )}
                </button>
                <div className="flex items-center justify-center gap-2 mt-4 text-slate-300">
                    <FiShield className="w-3 h-3" />
                    <p className="text-[9px] font-black uppercase tracking-widest">100% Secure Transaction</p>
                </div>
            </div>
        </div>
    );
};

export default OrderPayment;
