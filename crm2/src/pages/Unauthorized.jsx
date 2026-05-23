import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800/50 backdrop-blur-3xl border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="w-24 h-24 bg-[#095D95]/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <div className="w-16 h-16 bg-[#095D95] rounded-full flex items-center justify-center shadow-lg shadow-[#095D95]/30">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-black uppercase tracking-tighter text-[#095D95] dark:text-[#50B1B9] mb-2">Access Denied</h1>
        <p className="text-sm font-medium text-slate-500 mb-8 max-w-[280px]">
          You do not have the required permissions to view this module. Please contact your system administrator if you believe this is a mistake.
        </p>
        
        <button 
          onClick={() => navigate('/')}
          className="flex items-center px-6 py-3 bg-[#DF7F09] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#c46f08] transition-all shadow-lg shadow-[#DF7F09]/20 hover:shadow-[#DF7F09]/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
