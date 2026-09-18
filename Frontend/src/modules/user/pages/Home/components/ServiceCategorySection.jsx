import React from 'react';
import SimpleServiceCard from '../../../components/common/SimpleServiceCard';
import { themeColors } from '../../../../../theme';

const ServiceCategorySection = ({ title, services, onSeeAllClick, onServiceClick }) => {
  return (
    <div className="mb-6">
      {/* Title and See All */}
      <div className="px-4 mb-5 flex items-center justify-between">
        <h2 
          className="text-xl font-bold text-black"
        >
          {title}
        </h2>
        <button
          onClick={onSeeAllClick}
          className="font-semibold text-sm px-4 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
          style={{ 
            color: themeColors.button,
            backgroundColor: 'rgba(0, 166, 166, 0.08)',
            border: '1.5px solid rgba(0, 166, 166, 0.25)'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'rgba(0, 166, 166, 0.12)';
            e.target.style.borderColor = themeColors.button;
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'rgba(0, 166, 166, 0.08)';
            e.target.style.borderColor = 'rgba(0, 166, 166, 0.25)';
          }}
        >
          See all →
        </button>
      </div>

      {/* Horizontal Scrollable Service Cards */}
      <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {services.map((service) => (
          <SimpleServiceCard
            key={service.id}
            title={service.title}
            image={service.image}
            onClick={() => onServiceClick?.(service)}
          />
        ))}
      </div>
    </div>
  );
};

export default ServiceCategorySection;

