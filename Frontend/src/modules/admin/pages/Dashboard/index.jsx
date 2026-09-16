import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiBriefcase, FiUsers, FiShoppingBag, FiDollarSign, FiActivity, FiAward, FiUserCheck } from 'react-icons/fi';
import RevenueLineChart from '../../components/dashboard/RevenueLineChart';
import BookingsBarChart from '../../components/dashboard/BookingsBarChart';
import BookingStatusPieChart from '../../components/dashboard/BookingStatusPieChart';
import RevenueVsBookingsChart from '../../components/dashboard/RevenueVsBookingsChart';
import TimePeriodFilter from '../../components/dashboard/TimePeriodFilter';
import { formatCurrency } from '../../utils/adminHelpers';
import CustomerGrowthAreaChart from '../../components/dashboard/CustomerGrowthAreaChart';
import TopEquipment from '../../components/dashboard/TopEquipment';
import RecentBookings from '../../components/dashboard/RecentBookings';
import { getDashboardStats, getRevenueAnalytics } from '../../../../services/adminDashboardService';
import { toastManager } from '../../../../utils/toastManager';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('month');
  const [revenueData, setRevenueData] = useState([]);
  const [recentBookingsList, setRecentBookingsList] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVendors: 0,
    totalWorkers: 0,
    totalTeamLeaders: 0,
    totalIndependentWorkers: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    bookingRevenue: 0,
    soilTestRevenue: 0,
    ecommerceRevenue: 0,
    todayRevenue: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Calculate Date range based on Period
        let apiPeriod = 'monthly';
        let startDate = new Date();
        const endDate = new Date().toISOString();

        if (period === 'year') {
          apiPeriod = 'monthly';
          startDate.setFullYear(startDate.getFullYear() - 1);
        } else if (period === 'week') {
          apiPeriod = 'daily';
          startDate.setDate(startDate.getDate() - 7);
        } else if (period === 'month') {
          apiPeriod = 'daily';
          startDate.setDate(startDate.getDate() - 30);
        } else if (period === 'today') {
          apiPeriod = 'daily';
          startDate.setHours(0, 0, 0, 0); 
        } else {
          apiPeriod = 'daily';
          startDate.setDate(startDate.getDate() - 1);
        }

        const startISO = startDate.toISOString();

        // 2. Fetch Stats & Recent Bookings (Filtered by Date)
        const statsRes = await getDashboardStats({ startDate: startISO, endDate });
        if (statsRes.success) {
          const s = statsRes.data.stats;
          setStats({
            totalUsers: s.totalUsers || 0,
            totalVendors: s.totalVendors || 0,
            totalWorkers: s.totalWorkers || 0,
            totalTeamLeaders: s.totalTeamLeaders || 0,
            totalIndependentWorkers: s.totalIndependentWorkers || 0,
            activeBookings: s.pendingBookings || 0,
            completedBookings: s.completedBookings || 0,
            totalRevenue: s.totalRevenue || 0,
            bookingRevenue: s.bookingRevenue || 0,
            soilTestRevenue: s.soilTestRevenue || 0,
            ecommerceRevenue: s.ecommerceRevenue || 0,
            todayRevenue: 0,
          });
          setRecentBookingsList(statsRes.data.recentBookings || []);
        }

        // 3. Fetch Revenue Analytics based on Period
        const revRes = await getRevenueAnalytics({
          period: apiPeriod,
          startDate: startISO,
          endDate
        });

        if (revRes.success) {
          const mapped = revRes.data.revenueData.map(item => ({
            date: item.date,
            revenue: item.totalRevenue,
            bookingRevenue: item.bookingRevenue,
            soilTestRevenue: item.soilTestRevenue,
            ecommerceRevenue: item.ecommerceRevenue || 0,
            orders: item.bookings || 0
          }));
          mapped.sort((a, b) => new Date(a.date) - new Date(b.date));
          setRevenueData(mapped);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, [period]);

  const handleExportCsv = () => {
    try {
      const rows = revenueData.map((r) => ({
        date: r.date,
        bookings: r.orders,
        revenue: r.revenue,
      }));

      const headers = ['date', 'bookings', 'revenue'];
      const csv = [
        headers.join(','),
        ...rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin_dashboard_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export failed', e);
      toastManager.error('Export failed.');
    }
  };

  const onViewBooking = (booking) => {
    if (booking?._id || booking?.id) navigate(`/admin/bookings/${booking._id || booking.id}`);
  };

  const statsCards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue || 0),
      change: 0,
      icon: FiDollarSign,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-green-500 to-emerald-600',
      cardBg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      iconBg: 'bg-white/20',
      link: '/admin/reports/revenue'
    },
    {
      title: 'Booking Revenue',
      value: formatCurrency(stats.bookingRevenue || 0),
      change: 0,
      icon: FiDollarSign,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-indigo-500 to-blue-600',
      cardBg: 'bg-gradient-to-br from-indigo-50 to-blue-50',
      iconBg: 'bg-white/20',
      link: '/admin/reports/revenue'
    },
    {
      title: 'Soil Test Revenue',
      value: formatCurrency(stats.soilTestRevenue || 0),
      change: 0,
      icon: FiDollarSign,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      cardBg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      iconBg: 'bg-white/20',
      link: '/admin/reports/revenue'
    },
    {
      title: 'E-commerce Revenue',
      value: formatCurrency(stats.ecommerceRevenue || 0),
      change: 0,
      icon: FiDollarSign,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-rose-500 to-pink-600',
      cardBg: 'bg-gradient-to-br from-rose-50 to-pink-50',
      iconBg: 'bg-white/20',
      link: '/admin/products/orders'
    },
    {
      title: 'Active Operations',
      value: (stats.activeBookings || 0).toLocaleString(),
      change: 0,
      icon: FiShoppingBag,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      cardBg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      iconBg: 'bg-white/20',
      link: '/admin/reports/bookings'
    },
    {
      title: 'Completed Bookings',
      value: (stats.completedBookings || 0).toLocaleString(),
      change: 0,
      icon: FiActivity,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-purple-500 to-violet-600',
      cardBg: 'bg-gradient-to-br from-purple-50 to-violet-50',
      iconBg: 'bg-white/20',
      link: '/admin/reports/bookings'
    },
    {
      title: 'Total Farmers',
      value: (stats.totalUsers || 0).toLocaleString(),
      change: 0,
      icon: FiUser,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-orange-500 to-amber-600',
      cardBg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      iconBg: 'bg-white/20',
      link: '/admin/users/analytics'
    },
    {
      title: 'Equipment Owners',
      value: (stats.totalVendors || 0).toLocaleString(),
      change: 0,
      icon: FiBriefcase,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-teal-500 to-cyan-600',
      cardBg: 'bg-gradient-to-br from-teal-50 to-cyan-50',
      iconBg: 'bg-white/20',
      link: '/admin/vendors/analytics'
    },
    {
      title: 'Total Workers',
      value: (stats.totalWorkers || 0).toLocaleString(),
      change: 0,
      icon: FiUsers,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-blue-600 to-indigo-700',
      cardBg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      iconBg: 'bg-white/20',
      link: '/admin/workers/all'
    },
    {
      title: 'Team Leaders',
      value: (stats.totalTeamLeaders || 0).toLocaleString(),
      change: 0,
      icon: FiAward,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-amber-500 to-orange-600',
      cardBg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      iconBg: 'bg-white/20',
      link: '/admin/workers/all'
    },
    {
      title: 'Independent Workers',
      value: (stats.totalIndependentWorkers || 0).toLocaleString(),
      change: 0,
      icon: FiUserCheck,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-cyan-600 to-blue-600',
      cardBg: 'bg-gradient-to-br from-cyan-50 to-blue-50',
      iconBg: 'bg-white/20',
      link: '/admin/workers/all'
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3">
        <div className="w-full">
          <TimePeriodFilter
            selectedPeriod={period}
            onPeriodChange={setPeriod}
            onExport={handleExportCsv}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          const isPositive = (card.change || 0) >= 0;

          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => card.link && navigate(card.link)}
              className={`${card.cardBg} rounded-xl p-3 sm:p-4 shadow-sm border border-transparent hover:shadow-md transition-all duration-300 relative overflow-hidden cursor-pointer group`}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 ${card.bgColor} opacity-10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform`} />

              <div className="flex items-center justify-between mb-2 sm:mb-3 relative z-10">
                <div className={`${card.bgColor} ${card.iconBg} p-1.5 sm:p-2 rounded-lg shadow-sm`}>
                  <Icon className={`${card.color} text-base sm:text-lg`} />
                </div>
                {card.change !== 0 && (
                  <div
                    className={`text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                  >
                    {isPositive ? '+' : ''}
                    {Math.abs(card.change || 0)}%
                  </div>
                )}
              </div>

              <div className="relative z-10">
                <h3 className="text-gray-600 text-[10px] sm:text-xs font-medium mb-0.5">{card.title}</h3>
                <p className="text-gray-800 text-lg sm:text-xl font-bold">{card.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueLineChart data={revenueData} period={period} />
        <BookingsBarChart data={revenueData} period={period} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <BookingStatusPieChart bookings={recentBookingsList} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <RevenueVsBookingsChart data={revenueData} period={period} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <CustomerGrowthAreaChart timelineData={revenueData} bookings={recentBookingsList} period={period} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopEquipment
          bookings={recentBookingsList}
          periodLabel="Top Booked Equipment (Recent)"
        />
        <RecentBookings bookings={recentBookingsList} onViewBooking={onViewBooking} />
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
