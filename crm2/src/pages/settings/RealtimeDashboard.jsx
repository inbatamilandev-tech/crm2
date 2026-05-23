import React, { useState, useEffect } from 'react';
import { 
  Zap, Activity, Users, AlertTriangle, 
  RefreshCcw, Clock, HardDrive, BarChart3,
  Cpu, Database, ShieldAlert, CheckCircle2
} from 'lucide-react';
import api from '../../services/api';
import { useWebSocket } from '../../context/WebSocketContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function RealtimeDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { status, latency } = useWebSocket();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await api.get('/realtime/metrics/');
        setMetrics(response.data);
        setHistory(prev => [...prev.slice(-19), { 
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          connections: response.data.active_connections,
          throughput: Object.values(response.data.throughput)[0] || 0
        }]);
      } catch (error) {
        console.error("Failed to fetch realtime metrics", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="h-full flex flex-col items-center justify-center opacity-50">
        <RefreshCcw className="w-10 h-10 animate-spin text-[#095D95] mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-[#095D95]">Syncing Node Metrics...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <div className="w-12 h-12 bg-[#095D95] rounded-2xl flex items-center justify-center shadow-xl shadow-[#095D95]/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-[#095D95] dark:text-[#50B1B9]">Realtime Observability</h2>
              <p className="text-sm text-slate-500 font-medium">Monitoring the event-driven nervous system of the CRM platform.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
           <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl ${status === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
           </div>
           <div className="px-4 py-2 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center space-x-2">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{latency}ms Latency</span>
           </div>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          label="Active Connections" 
          value={metrics?.active_connections} 
          icon={<Users className="w-5 h-5" />} 
          color="blue"
          subValue={`Total: ${metrics?.total_connections}`}
        />
        <MetricCard 
          label="Event Throughput" 
          value={Object.values(metrics?.throughput || {})[0] || 0} 
          icon={<Zap className="w-5 h-5" />} 
          color="amber"
          subValue="Events / Minute"
        />
        <MetricCard 
          label="System Health" 
          value="100%" 
          icon={<ShieldAlert className="w-5 h-5" />} 
          color="emerald"
          subValue={`${Object.keys(metrics?.errors || {}).length} errors trapped`}
        />
        <MetricCard 
          label="Redis Buffer" 
          value="Optimal" 
          icon={<Database className="w-5 h-5" />} 
          color="indigo"
          subValue="Memory Usage: Normal"
        />
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Load Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden relative group">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center">
              <Activity className="w-4 h-4 mr-2 text-[#095D95]" /> Connection Load History
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Updates (5s)</span>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorConnections" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#095D95" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#095D95" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                <Tooltip />
                <Area type="monotone" dataKey="connections" stroke="#095D95" strokeWidth={3} fillOpacity={1} fill="url(#colorConnections)" animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Type Breakdown */}
        <div className="bg-white dark:bg-slate-800/50 p-8 rounded-[40px] border border-slate-100 dark:border-white/5 shadow-sm">
           <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-8">Event Distribution</h3>
           <div className="space-y-6">
              {Object.entries(metrics?.event_counts || {}).sort((a,b) => b[1] - a[1]).slice(0, 6).map(([event, count]) => (
                <div key={event} className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>{event.replace('ws_in:', '')}</span>
                    <span className="text-slate-900 dark:text-white">{count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-50 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#095D95] rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.min(100, (count / (metrics.total_connections || 1)) * 10)}%` }} 
                    />
                  </div>
                </div>
              ))}
              {Object.keys(metrics?.event_counts || {}).length === 0 && (
                <div className="text-center py-20 opacity-30">
                  <Activity className="w-10 h-10 mx-auto mb-3" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No active traffic</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Infrastructure Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-[#095D95] p-8 rounded-[40px] text-white shadow-xl shadow-[#095D95]/20">
            <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center">
              <Cpu className="w-4 h-4 mr-2" /> Realtime Node Context
            </h3>
            <div className="grid grid-cols-2 gap-8">
               <div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Worker Status</p>
                  <p className="text-lg font-black flex items-center">
                     <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Operational
                  </p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Queue Backlog</p>
                  <p className="text-lg font-black">0 events</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Rate Limiter</p>
                  <p className="text-lg font-black text-emerald-400">Active</p>
               </div>
               <div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Node Latency</p>
                  <p className="text-lg font-black">{latency}ms</p>
               </div>
            </div>
         </div>

         <div className="bg-rose-500 p-8 rounded-[40px] text-white shadow-xl shadow-rose-500/20">
            <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" /> Incident Traps
            </h3>
            {Object.keys(metrics?.errors || {}).length === 0 ? (
               <div className="h-24 flex items-center justify-center border border-white/20 rounded-2xl border-dashed">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">No security incidents detected</p>
               </div>
            ) : (
               <div className="space-y-4">
                  {Object.entries(metrics?.errors || {}).map(([err, count]) => (
                    <div key={err} className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-xs font-bold uppercase">{err}</span>
                      <span className="bg-white/20 px-2 py-1 rounded text-xs font-black">{count}</span>
                    </div>
                  ))}
               </div>
            )}
         </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, color, subValue }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400",
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tighter">{value}</h4>
        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{subValue}</p>
      </div>
    </div>
  );
}
