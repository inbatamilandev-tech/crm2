import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-white/[0.03] backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-3xl p-12 max-w-lg w-full text-center shadow-2xl">
        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-rose-600" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Access Denied</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">
          You do not have permission to access this page. Please contact your System Administrator if you believe this is an error.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center px-6 py-3 bg-[#0F172A] dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
