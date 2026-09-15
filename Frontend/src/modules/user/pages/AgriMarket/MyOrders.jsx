import React, { useState, useEffect } from 'react';
import { 
    FiChevronLeft, 
    FiPackage, 
    FiCheckCircle, 
    FiClock,
    FiTruck,
    FiExternalLink,
    FiAlertCircle,
    FiSearch
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import ecommerceService from '../../../../services/ecommerceService';
import { toastManager } from '../../../../utils/toastManager';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const MyAgriOrders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchOrders();

        // Auto-refresh har 20 seconds mein - delivery OTP aur status update ke liye
        const intervalId = setInterval(() => {
            fetchOrders(true); // silent = true → no loading spinner
        }, 20000); // 20 seconds

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, []);

    const fetchOrders = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            else setIsRefreshing(true);
            const res = await ecommerceService.getMyOrders();
            if (res.success) setOrders(res.data || []);
        } catch (err) {
            if (!silent) toastManager.error("Failed to load orders");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm("Are you sure you want to cancel this order? If paid, your platform fee will be refunded to your wallet.")) return;
        
        try {
            const res = await ecommerceService.cancelOrder(orderId);
            if (res.success) {
                toastManager.success("Order cancelled successfully");
                fetchOrders(); // Refresh
            } else {
                toastManager.error(res.message || "Failed to cancel order");
            }
        } catch (err) {
            toastManager.error("Internal error. Please try again.");
        }
    };

    const filteredOrders = orders.filter(order => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        
        const matchesId = order._id?.toLowerCase().includes(query);
        const matchesName = order.items?.some(item => item.name?.toLowerCase().includes(query));
        
        return matchesId || matchesName;
    });

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white px-6 pt-12 pb-6 border-b border-slate-100 flex items-center gap-4 sticky top-0 z-40">
                <button onClick={() => navigate('/user/agri-marketplace')} className="p-3 bg-slate-50 rounded-2xl cursor-pointer pointer-events-auto active:scale-95 transition-all">
                    <FiChevronLeft className="w-6 h-6 text-slate-800" />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl font-black text-slate-800 leading-tight">My Agri Orders</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Physical Goods tracking</p>
                        {/* Live auto-refresh indicator */}
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Live</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-4">
                {/* Search Bar */}
                {(!loading || orders.length > 0) && (
                    <div className="max-w-md">
                        <div className="relative">
                            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search orders (ID, item name)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all text-xs font-bold text-slate-800 placeholder-slate-400"
                            />
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" /></div>
                ) : filteredOrders.length === 0 ? (
                    <div className="bg-white p-12 rounded-[40px] text-center border border-slate-100 shadow-sm">
                        <FiPackage className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="font-black text-slate-400 uppercase text-[10px] tracking-widest">
                            {searchQuery.trim() ? `No orders matching "${searchQuery}"` : "No orders yet"}
                        </p>
                    </div>
                ) : (
                    filteredOrders.map(order => (
                        <div key={order._id} className="bg-white rounded-[32px] p-5 shadow-sm border border-slate-100 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Order ID: #{order._id.slice(-6)}</p>
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                                            order.deliveryStatus === 'cancelled' ? 'bg-red-50 text-red-600' :
                                            order.paymentStatus === 'paid' || order.paymentType === 'cod' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                                        }`}>
                                            {order.deliveryStatus === 'cancelled' ? 'Cancelled' : 
                                             order.paymentStatus === 'paid' || order.paymentType === 'cod' ? 'Confirmed' : 'Payment Pending'}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-slate-800 mt-1">{order.items[0].name}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">{format(new Date(order.createdAt), 'dd MMM, hh:mm a')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Grand Total</p>
                                    <p className="font-black text-slate-800">₹{order.pricing.orderTotal || order.pricing.itemsTotal}</p>
                                    <p className="text-[8px] font-bold text-teal-600 uppercase tracking-tighter mt-1">
                                        Paid: ₹{order.paymentType === 'online_full' ? order.pricing.orderTotal : order.paymentType === 'cod' ? 0 : order.pricing.platformFee}
                                    </p>
                                    <p className="text-[8px] font-bold text-orange-600 uppercase tracking-tighter">
                                        COD: ₹{order.paymentType === 'online_full' ? 0 : order.paymentType === 'cod' ? order.pricing.orderTotal : order.pricing.vendorBalance}
                                    </p>
                                </div>
                            </div>

                            {/* Tracking View */}
                            <div className="relative pt-4 pb-2 px-2">
                                <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100" />
                                <div className="space-y-6">
                                    <div className="flex gap-4 relative">
                                        <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0 z-10 ${
                                            order.deliveryStatus === 'ordered' ? 'bg-teal-600 scale-125' : 'bg-green-500'
                                        }`} />
                                        <div className="flex-1">
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${order.deliveryStatus === 'ordered' ? 'text-teal-600' : 'text-slate-400'}`}>Order Placed</p>
                                            <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">Awaiting vendor packing</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 relative">
                                        <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0 z-10 ${
                                            order.deliveryStatus === 'packed' ? 'bg-teal-600 scale-125' : 
                                            ['shipped', 'delivered'].includes(order.deliveryStatus) ? 'bg-green-500' : 'bg-slate-200'
                                        }`} />
                                        <div className="flex-1">
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${order.deliveryStatus === 'packed' ? 'text-teal-600' : 'text-slate-400'}`}>Packed</p>
                                            <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">Vendor is ready to ship</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 relative">
                                        <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0 z-10 ${
                                            order.deliveryStatus === 'shipped' ? 'bg-teal-600 scale-125' : 
                                            order.deliveryStatus === 'delivered' ? 'bg-green-500' : 'bg-slate-200'
                                        }`} />
                                        <div className="flex-1">
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${order.deliveryStatus === 'shipped' ? 'text-teal-600' : 'text-slate-400'}`}>On the way</p>
                                            {order.trackingDetails?.courierName && (
                                                <p className="text-[8px] font-black text-slate-800 mt-1 p-2 bg-slate-50 rounded-xl inline-block border border-slate-100">
                                                    {order.trackingDetails.courierName}: {order.trackingDetails.trackingNumber}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Alert/Action */}
                            {order.paymentStatus !== 'paid' && order.paymentType !== 'cod' ? (
                                <div className="pt-2">
                                    <button 
                                        onClick={() => navigate(`/user/order-payment/${order._id}`)}
                                        className="w-full py-4 bg-teal-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-teal-500/20 active:scale-95 transition-all"
                                    >
                                        {order.paymentType === 'online_full' ? `Pay Total Amount (₹${order.pricing.orderTotal})` : `Pay Confirm Fee (₹${order.pricing.platformFee})`}
                                    </button>
                                </div>
                            ) : order.deliveryStatus !== 'delivered' && order.deliveryStatus !== 'cancelled' && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                                    <FiAlertCircle className="text-slate-400 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-1">
                                                    {order.paymentType === 'online_full' ? 'Order Paid' : 'Direct Settlement'}
                                                </p>
                                                <p className="text-[8px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest mb-2">
                                                    {order.paymentType === 'online_full' 
                                                        ? 'This order is fully paid. Nothing to pay on delivery.' 
                                                        : order.paymentType === 'cod'
                                                            ? `Keep ₹${order.pricing.orderTotal} ready to pay the vendor when items arrive.`
                                                            : `Keep ₹${order.pricing.vendorBalance} ready to pay the vendor when items arrive.`
                                                    }
                                                </p>
                                            </div>
                                            {/* Cancel Button */}
                                            {['pending', 'ordered', 'packed'].includes(order.deliveryStatus) && (
                                                <button 
                                                    onClick={() => handleCancelOrder(order._id)}
                                                    className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-[8px] font-black uppercase tracking-widest border border-red-100 active:scale-95 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                        {order.deliveryStatus !== 'ordered' && order.deliveryStatus !== 'packed' && order.deliveryOtp && (
                                            <div className="inline-block px-3 py-1.5 bg-teal-50 border border-teal-100 rounded-lg">
                                                <p className="text-[8px] font-black tracking-widest text-teal-600 uppercase">Delivery OTP</p>
                                                <p className="text-sm font-black text-teal-800 font-mono tracking-widest">{order.deliveryOtp}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {order.deliveryStatus === 'delivered' && (
                                <div className="flex items-center justify-center gap-2 text-green-600 py-3 bg-green-50 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-green-100">
                                    <FiCheckCircle /> Delivered Successfully
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MyAgriOrders;
