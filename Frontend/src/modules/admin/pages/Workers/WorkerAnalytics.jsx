import React from 'react';
import { FiActivity } from 'react-icons/fi';

const WorkerAnalytics = () => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6">
      <h2 className="text-lg font-black text-slate-800 mb-4">Worker Analytics</h2>
      
      <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiActivity className="text-slate-400 text-2xl" />
        </div>
        <h3 className="text-lg font-black text-slate-800">Analytics Coming Soon</h3>
        <p className="text-slate-500 text-sm mt-1">Detailed stats on worker performance and earnings will appear here.</p>
      </div>
    </div>
  );
};

export default WorkerAnalytics;
