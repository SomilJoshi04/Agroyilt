import React, { useState, useEffect } from 'react';
import { FiActivity, FiTrendingUp, FiCheckCircle, FiShield } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import adminReportService from '../../../../services/adminReportService';
import CardShell from '../UserCategories/components/CardShell';
import { toastManager } from '../../../../utils/toastManager';

const AgricultureInsights = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        const fetchLevelData = async () => {
            try {
                setLoading(true);
                const res = await adminReportService.getAgriInsights();
                setData(res.data);
            } catch (err) {
                toastManager.error('Failed to load agri insights');
            } finally {
                setLoading(false);
            }
        };
        fetchLevelData();
    }, []);

    if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;

    const COLORS = ['#2874F0', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    return (
        <div className="space-y-6">
            {/* Top Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CardShell className="p-4 bg-blue-50 border-blue-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500 rounded-xl text-white shadow-lg"><FiTrendingUp /></div>
                        <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Agri Revenue</p>
                            <h3 className="text-xl font-bold text-blue-900 mt-1">₹{data?.categoryRevenue.reduce((acc, c) => acc + c.revenue, 0).toLocaleString()}</h3>
                        </div>
                    </div>
                </CardShell>

                <CardShell className="p-4 bg-emerald-50 border-emerald-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500 rounded-xl text-white shadow-lg"><FiCheckCircle /></div>
                        <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Fulfilment Rate</p>
                            <h3 className="text-xl font-bold text-emerald-900 mt-1">
                                {data?.efficiency.total ? ((data.efficiency.completed / data.efficiency.total) * 100).toFixed(1) : 0}%
                            </h3>
                        </div>
                    </div>
                </CardShell>

                <CardShell className="p-4 bg-amber-50 border-amber-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500 rounded-xl text-white shadow-lg"><FiShield /></div>
                        <div>
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Total Bookings</p>
                            <h3 className="text-xl font-bold text-amber-900 mt-1">{data?.efficiency.total}</h3>
                        </div>
                    </div>
                </CardShell>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Category */}
                <CardShell className="p-6 bg-white">
                    <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <FiActivity className="text-primary-600" /> Revenue by Agriculture Category
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.categoryRevenue}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                                    {data?.categoryRevenue.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardShell>

                {/* Growth Stats */}
                <CardShell className="p-6 bg-white">
                    <h3 className="text-base font-bold text-slate-800 mb-6">Efficiency Breakdown</h3>
                    <div className="h-[300px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Completed', value: data?.efficiency.completed },
                                        { name: 'Cancelled', value: data?.efficiency.cancelled },
                                        { name: 'Other', value: data?.efficiency.total - (data?.efficiency.completed + data?.efficiency.cancelled) }
                                    ]}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell fill="#10B981" />
                                    <Cell fill="#EF4444" />
                                    <Cell fill="#CBD5E1" />
                                </Pie>
                                <Tooltip />
                                <legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Completed</p>
                            <p className="text-lg font-bold text-emerald-600">{data?.efficiency.completed}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Cancelled</p>
                            <p className="text-lg font-bold text-red-600">{data?.efficiency.cancelled}</p>
                        </div>
                    </div>
                </CardShell>
            </div>
        </div>
    );
};

export default AgricultureInsights;
