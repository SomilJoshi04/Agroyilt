import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FiBarChart2, FiTrendingUp, FiDollarSign, FiActivity,
    FiArrowLeft, FiPieChart, FiSettings
} from 'react-icons/fi';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { vendorDashboardService } from '../../services/dashboardService';
import LogoLoader from '../../../../components/common/LogoLoader';
import { toastManager } from '../../../../utils/toastManager';

const COLORS = ['#0F766E', '#0D9488', '#2DD4BF', '#99F6E4'];

const Analytics = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await vendorDashboardService.getEquipmentROIAnalytics();
                if (response.success) {
                    setData(response.data);
                }
            } catch (error) {
                toastManager.error('Failed to load analytics');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 pb-20">
                <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <FiArrowLeft className="w-6 h-6 text-gray-700" />
                            </button>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Equipment Analytics</h1>
                        </div>
                        <FiBarChart2 className="w-6 h-6 text-teal-600" />
                    </div>
                </div>
                <div className="p-6 space-y-8">
                    <div className="grid grid-cols-2 gap-4 animate-pulse">
                        <div className="h-28 bg-gray-200/60 rounded-3xl border border-gray-100"></div>
                        <div className="h-28 bg-gray-200/60 rounded-3xl border border-gray-100"></div>
                    </div>
                    <div className="h-[250px] bg-gray-200/60 rounded-[2.5rem] animate-pulse border border-gray-100"></div>
                    <div className="h-[250px] bg-gray-200/60 rounded-[2.5rem] animate-pulse border border-gray-100"></div>
                </div>
            </div>
        );
    }

    const equipmentChartData = data?.equipmentStats.map(item => ({
        name: item._id || 'Unknown',
        earnings: item.totalEarnings,
        jobs: item.count
    })) || [];

    const rentalTypeChartData = data?.rentalTypeStats.map(item => ({
        name: item._id === 'hourly' ? 'Hourly' : item._id === 'land_based' ? 'Land/Acre' : 'Monthly',
        value: item.totalEarnings
    })) || [];

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white px-6 pt-12 pb-6 shadow-sm sticky top-0 z-30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <FiArrowLeft className="w-6 h-6 text-gray-700" />
                        </button>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Equipment Analytics</h1>
                    </div>
                    <FiBarChart2 className="w-6 h-6 text-teal-600" />
                </div>
            </div>

            <div className="p-6 space-y-8">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 mb-3">
                            <FiTrendingUp className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Equipment</p>
                        <p className="text-lg font-black text-gray-900 truncate">{equipmentChartData[0]?.name || 'N/A'}</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-3">
                            <FiPieChart className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Best Model</p>
                        <p className="text-lg font-black text-gray-900">{rentalTypeChartData.sort((a, b) => b.value - a.value)[0]?.name || 'N/A'}</p>
                    </motion.div>
                </div>

                {/* Equipment Earnings Bar Chart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-extrabold text-gray-900">Earnings per Equipment</h3>
                            <p className="text-xs text-gray-500 font-medium">Monthly revenue comparison</p>
                        </div>
                        <FiActivity className="text-teal-500 w-5 h-5" />
                    </div>

                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={equipmentChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#6B7280' }} />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Earnings']}
                                />
                                <Bar
                                    dataKey="earnings"
                                    fill="#0F766E"
                                    radius={[10, 10, 0, 0]}
                                    barSize={32}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Rental Type Pie Chart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-extrabold text-gray-900">Revenue Contribution</h3>
                            <p className="text-xs text-gray-500 font-medium">Land-based vs Hourly vs Monthly</p>
                        </div>
                        <FiPieChart className="text-indigo-500 w-5 h-5" />
                    </div>

                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={rentalTypeChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {rentalTypeChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Total']}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Performance List */}
                <div className="space-y-4 pb-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest pl-2">Equipment Breakdown</h3>
                    {data?.equipmentStats.map((item, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-3xl flex items-center justify-between shadow-sm border border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center font-black text-teal-700">
                                    {idx + 1}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 leading-tight">{item._id || 'Standard'}</h4>
                                    <p className="text-xs text-gray-500">{item.count} Jobs completed</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black text-teal-600">₹{item.totalEarnings.toLocaleString()}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">TOTAL REVENUE</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Analytics;
