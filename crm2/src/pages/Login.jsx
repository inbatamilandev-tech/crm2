import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert, Lock, User, Eye, EyeOff, Zap } from 'lucide-react';

export default function Login() {
  const [credentials, setCredentials] = useState({ username: 'admin', password: 'admin' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(credentials);
      navigate('/');
    } catch (err) {
      setError('Registry mismatch: Invalid operator credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-[480px] relative z-10">
        {/* Branding */}
        <div className="text-center mb-10">
           <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[28px] shadow-2xl shadow-blue-600/40 mb-6 group hover:rotate-12 transition-transform duration-500">
              <Zap className="w-10 h-10 text-white fill-current" />
           </div>
           <h1 className="text-4xl font-black text-white tracking-tighter mb-2">CRM</h1>
           <p className="text-slate-400 font-medium">Unified CRM Suite</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-2xl shadow-black/40">
           {error && (
             <div className="mb-8 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl flex items-center text-[10px] font-black uppercase tracking-widest">
               <ShieldAlert className="w-5 h-5 mr-3 flex-shrink-0" />
               {error}
             </div>
           )}

           <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Operator ID</label>
                 <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      required
                      value={credentials.username}
                      onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
                      placeholder="Username"
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Security Protocol</label>
                    <button type="button" className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline">Reset</button>
                 </div>
                 <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all"
                      placeholder="Password"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    >
                       {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                 </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center mt-8"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Initialize Session
                    <Zap className="ml-2 w-4 h-4 fill-current" />
                  </>
                )}
              </button>
           </form>

           <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Protected by Advanced Security Logic
              </p>
              <div className="flex justify-center space-x-4 mt-4">
                 <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                 <span className="w-2 h-2 bg-blue-500 rounded-full" />
                 <span className="w-2 h-2 bg-indigo-500 rounded-full" />
              </div>
           </div>
        </div>

        {/* Guest Credentials Helper */}
        <div className="mt-8 text-center p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
           <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
              Demo Protocol: <span className="text-white">admin / admin</span>
           </p>
        </div>
      </div>
    </div>
  );
}
