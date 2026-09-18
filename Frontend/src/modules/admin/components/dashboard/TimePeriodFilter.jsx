import React from 'react';
import { FiCalendar, FiDownload } from 'react-icons/fi';

const TimePeriodFilter = ({ selectedPeriod, onPeriodChange, onExport }) => {
  const periods = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        {/* Left group: calendar + segmented control */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            type="button"
            className="h-10 w-10 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700"
            aria-label="Calendar"
          >
            <FiCalendar className="w-5 h-5" />
          </button>

          <div className="flex items-center bg-gray-100 rounded-2xl p-1.5 overflow-x-auto scrollbar-hide">
            {periods.map((p) => {
              const active = selectedPeriod === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => onPeriodChange(p.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-700 hover:bg-white/60'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Export */}
        <button
          type="button"
          onClick={onExport}
          className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold flex items-center gap-2 shadow-sm active:scale-[0.98] whitespace-nowrap"
        >
          <FiDownload className="w-4 h-4" />
          Export CSV
        </button>
      </div>
    </div>
  );
};

export default TimePeriodFilter;


