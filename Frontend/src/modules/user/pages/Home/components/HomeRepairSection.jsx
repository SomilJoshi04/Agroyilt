import React from 'react';
import ServiceCardWithAdd from '../../../components/common/ServiceCardWithAdd';
import { themeColors } from '../../../../../theme';
import drillHangImage from '../../../../../assets/images/pages/Home/HomeRepairSection/drill&hang.jpg';
import tapRepairImage from '../../../../../assets/images/pages/Home/HomeRepairSection/tap-repair.jpg';
import fanRepairImage from '../../../../../assets/images/pages/Home/HomeRepairSection/fan-repair.jpg';
import switchSocketImage from '../../../../../assets/images/pages/Home/HomeRepairSection/switch socket installation.jpg';

const HomeRepairSection = ({ services, onSeeAllClick, onServiceClick, onAddClick }) => {
  // Default home repair services if none provided
  if (!services || services.length === 0) {
    return null;
  }

  const serviceList = services;

  return (
    <div className="mb-6">
      {/* Title and See All */}
      <div className="px-4 mb-5 flex items-center justify-between">
        <h2
          className="text-xl font-bold text-gray-900 tracking-tight"
        >
          Home repair & installation
        </h2>
        <button
          onClick={onSeeAllClick}
          className="font-bold text-xs px-4 py-2 rounded-full transition-all hover:bg-gray-100 active:scale-95 bg-gray-50 text-gray-700 border border-gray-100"
        >
          See all
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto px-6 pb-2 scrollbar-hide">
        {serviceList.map((service) => (
          <ServiceCardWithAdd
            key={service.id}
            title={service.title}
            rating={service.rating}
            reviews={service.reviews}
            price={service.price}
            image={service.image}
            onClick={() => onServiceClick?.(service)}
            onAddClick={() => onAddClick?.(service)}
          />
        ))}
      </div>
    </div>
  );
};

export default HomeRepairSection;

