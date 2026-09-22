import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiBriefcase, FiUsers, FiCheckCircle } from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';
import { vendorTheme as themeColors } from '../../../../../theme';

const StatsCards = memo(({ stats }) => {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Today's Earnings",
      value: `₹${stats.todayEarnings.toLocaleString()}`,
      icon: FaWallet,
      gradient: 'linear-gradient(135deg, #001947 0%, #003b77 100%)',
      onClick: () => navigate('/vendor/wallet')
    },
    {
      title: 'Pending Alerts',
      value: stats.pendingAlerts,
      icon: FiClock,
      gradient: 'linear-gradient(135deg, #406788 0%, #304a63 100%)',
      onClick: () => navigate('/vendor/booking-alerts')
    },
    {
      title: 'Active Rentals',
      value: stats.activeJobs,
      icon: FiBriefcase,
      gradient: 'linear-gradient(135deg, #406788 0%, #304a63 100%)',
      onClick: () => navigate('/vendor/jobs')
    },
    {
      title: 'Orders Done',
      value: stats.completedJobs,
      icon: FiCheckCircle,
      gradient: 'linear-gradient(135deg, #001947 0%, #003b77 100%)',
      onClick: () => navigate('/vendor/jobs')
    }
  ];

  return (
    <div className="px-4 pt-1">
      <div className="grid grid-cols-2 gap-2.5 mb-2">
        {cards.map((card, index) => {
          const IconComponent = card.icon;

          return (
            <div
              key={index}
              onClick={card.onClick}
              className="rounded-xl p-3 relative overflow-hidden cursor-pointer active:scale-95 transition-all shadow-sm hover:shadow-md"
              style={{
                background: card.gradient,
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
            >
              {/* Decorative Pattern */}
              <div
                className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-20 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, transparent 70%)',
                  transform: 'translate(15px, -15px)',
                }}
              />
              <div className="relative z-10 flex items-start justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider mb-0.5 truncate">
                    {card.title}
                  </p>
                  <p className="text-lg font-black text-white leading-tight mt-0.5 tracking-tight">
                    {card.value}
                  </p>
                </div>
                <div
                  className="p-1.5 rounded-lg flex-shrink-0"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                  }}
                >
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

StatsCards.displayName = 'VendorStatsCards';

export default StatsCards;
