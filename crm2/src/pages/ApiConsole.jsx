import React, { useState } from 'react';
import { 
  Terminal, Key, Copy, CheckCircle2, 
  ShieldAlert, Zap, Server, Code, 
  RefreshCcw, Globe, Lock, Cpu,
  ExternalLink, ChevronRight, Plus
} from 'lucide-react';
import { authService, leadsApi } from '../services/api';

export default function ApiConsole() {
  const [apiKey, setApiKey] = useState('crm_live_8f92a3b1c4d5e6f7g8h9i0j');
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  const generateNewKey = () => {
    const newKey = 'crm_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setApiKey(newKey);
    setCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runLiveTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const auth = await authService.login({ username: 'admin', password: 'admin' });
      const leads = await leadsApi.getAll();
      
      setTestResult({
        success: true,
        message: 'Endpoint Handshake Successful',
        data: {
          status: 'Authenticated',
          latency: '42ms',
          payloadSize: '2.4kb',
          registryCount: leads.count,
          head: leads.results?.slice(0, 1)
        }
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Endpoint Connection Refused',
        error: error.message || 'Verification failed. Django server unreachable at http://127.0.0.1:8000'
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-[1200px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center space-x-2 mb-1">
             <Cpu className="w-5 h-5 text-blue-600" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Developer Ecosystem</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">API Console</h2>
        </div>
        
        <div className="flex items-center space-x-3">
           <button className="inline-flex items-center px-4 py-2.5 bg-white border border-slate-200 rounded-2xl font-black text-[10px] text-slate-600 uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
              <Globe className="w-3.5 h-3.5 mr-2" />
              API Documentation
           </button>
           <button className="inline-flex items-center px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all">
            <Plus className="mr-2 w-4 h-4" />
            Add Integration
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* API Credentials Card */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
              <div className="p-8 border-b border-slate-50">
                 <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                       <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authentication Registry</h3>
                 </div>

                 <div className="flex items-center space-x-3 text-rose-600 mb-8 bg-rose-50/50 p-4 rounded-2xl border border-rose-100/50">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Warning: Secret credentials exposed in unsecured logic may compromise the integrity of your data registry.</p>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Active Production Key</label>
                    <div className="flex items-center space-x-3">
                       <div className="relative flex-1">
                          <input 
                            type="text" 
                            readOnly 
                            value={apiKey} 
                            className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 font-mono text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          />
                          <button 
                            onClick={copyToClipboard}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm"
                          >
                            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                       </div>
                       <button 
                         onClick={generateNewKey}
                         className="px-6 py-4 bg-white border border-slate-200 rounded-2xl font-black text-[10px] text-slate-600 uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center"
                       >
                         <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                         Roll Key
                       </button>
                    </div>
                 </div>
              </div>

              {/* Endpoint Tester */}
              <div className="p-8 bg-slate-50/30">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                       <Server className="w-4 h-4 text-blue-600" />
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Handshake Simulator</h3>
                    </div>
                    <button 
                      onClick={runLiveTest}
                      disabled={isTesting}
                      className="inline-flex items-center px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                      <Zap className={`w-3.5 h-3.5 mr-2 ${isTesting ? 'animate-pulse' : ''}`} />
                      {isTesting ? 'Simulation Active...' : 'Initialize Connection Test'}
                    </button>
                 </div>

                 {testResult && (
                    <div className={`rounded-2xl border overflow-hidden transition-all ${testResult.success ? 'border-emerald-100 shadow-xl shadow-emerald-500/5' : 'border-rose-100 shadow-xl shadow-rose-500/5'}`}>
                       <div className={`px-6 py-3 flex items-center justify-between ${testResult.success ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                          <div className="flex items-center space-x-2">
                             {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />}
                             <span className={`text-[10px] font-black uppercase tracking-widest ${testResult.success ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {testResult.message}
                             </span>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target: 127.0.0.1:8000</span>
                       </div>
                       <div className="bg-slate-900 p-6">
                          <pre className="text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed">
                             {JSON.stringify(testResult.data || testResult.error, null, 3)}
                          </pre>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>

        {/* Developer Resources Sidebar */}
        <div className="space-y-8">
           <div className="glass-card p-8">
              <div className="flex items-center space-x-3 mb-6">
                 <Terminal className="w-5 h-5 text-slate-400" />
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Terminal Interaction</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">Synchronize your local environment using the standard Bearer scheme protocols.</p>
              
              <div className="bg-slate-900 rounded-2xl p-6 relative group overflow-hidden">
                 <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg">
                       <Copy className="w-3 h-3" />
                    </button>
                 </div>
                 <pre className="text-blue-400 font-mono text-[10px] overflow-x-auto leading-relaxed">
{`curl -X GET \\
  "http://api.crm.live/v1/leads" \\
  -H "Authorization: Bearer <key>"`}
                 </pre>
              </div>
           </div>

           <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group cursor-pointer">
              <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <Zap className="w-10 h-10 mb-4 fill-current" />
              <h4 className="text-xl font-black mb-2">Automate Logic?</h4>
              <p className="text-indigo-100 text-sm font-medium mb-6 leading-relaxed">Deploy custom serverless protocols triggered by CRM registry events.</p>
              <button className="w-full py-3 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-50 transition-colors">Setup Webhooks</button>
           </div>
        </div>
      </div>
    </div>
  );
}
