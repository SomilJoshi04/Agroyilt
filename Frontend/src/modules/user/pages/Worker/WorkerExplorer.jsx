import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiUsers, FiUser } from 'react-icons/fi';
import { themeColors } from '../../../../theme';

const WorkerExplorer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const category = location.state?.category;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Helmet>
        <title>Hire Workers | Agroyilt</title>
      </Helmet>
      
      {/* Header */}
      <div className="bg-white sticky top-0 z-40 border-b border-slate-100 px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all"
          >
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800">Hire Workers</h1>
            <p className="text-xs text-slate-500 font-medium">Select worker type</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-5 space-y-6 mt-4">
        {/* Single Worker Option */}
        <div 
          onClick={() => { alert('Single worker discovery coming soon!') }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 cursor-pointer active:scale-95 transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <FiUser size={28} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">Single Worker</h3>
            <p className="text-sm text-slate-500 mt-1">Hire an independent worker for your farm tasks.</p>
          </div>
        </div>

        {/* Group Worker Option */}
        <div 
          onClick={() => { alert('Group worker discovery coming soon!') }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5 cursor-pointer active:scale-95 transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <FiUsers size={28} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">Group Workers</h3>
            <p className="text-sm text-slate-500 mt-1">Hire multiple workers for large scale requirements.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerExplorer;
