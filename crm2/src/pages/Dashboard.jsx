import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, DollarSign, Target, TrendingUp, Calendar, Download, 
  Handshake, ClipboardList, Mail, MoreHorizontal, Loader2, AlertCircle,
  ArrowUpRight, ArrowDownRight, Activity, Zap, CheckCircle2, Clock, Megaphone,
  ShieldCheck, Send, MessageSquare, Bot
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { leadsApi, dealsApi, tasksApi, analyticsApi, accountsApi, contactsApi, activitiesApi } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ leads: 0, deals: 0, revenue: 0, tasks: 0, marketing_roi: '0%' });
  const [interval, setInterval] = useState('monthly'); // 'monthly', 'quarterly', 'annual'
  const [showDealVelocityMenu, setShowDealVelocityMenu] = useState(false);
  const [dealClosures, setDealClosures] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { lastMessage } = useWebSocket();

  // Removed Activity Search state and logic for Work Queue Summary

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!stats.leads) setIsLoading(true);
      try {
        const [dashboardRes, dealsRes] = await Promise.all([
          analyticsApi.getDashboardStats({ range: interval }),
          dealsApi.getAll()
        ]);
        
        setStats(dashboardRes.stats);
        setChartData(dashboardRes.chartData);
        setActivities(dashboardRes.activities);
        setLeadSources(dashboardRes.leadSources || []);

        const deals = dealsRes.results || dealsRes;
        const topDeals = [...deals]
          .sort((a, b) => parseFloat(b.value || 0) - parseFloat(a.value || 0))
          .slice(0, 5);
          
        setDealClosures(topDeals.map(deal => ({
          id: deal.id,
          company: deal.title,
          contact: deal.contact ? 'Assigned' : 'Unassigned',
          value: `₹${parseFloat(deal.value || 0).toLocaleString()}`,
          probability: deal.stage === 'successfully closed' ? 100 : deal.stage === 'Closed Lost' ? 0 : deal.stage === 'Proposal/Price Quote' ? 75 : 50,
          status: deal.stage,
          statusColor: deal.stage === 'successfully closed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-[#0F172A]',
        })));
      } catch (err) {
        setError("Failed to sync dashboard metrics");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [lastMessage, interval]);

  return (
    <div className="space-y-8 animate-fade-in max-w-[1600px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Executive Intelligence</h2>
          <p className="mt-1 text-[#0F172A]/70 font-medium">Real-time performance metrics across all operational nodes.</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* <button 
            onClick={() => {
              const nextInterval = interval === 'monthly' ? 'quarterly' : interval === 'quarterly' ? 'annual' : 'monthly';
              setInterval(nextInterval);
            }}
            className="inline-flex items-center px-4 py-2 bg-[#F8FAFC]/70 backdrop-blur-md border border-[#0F172A]/20 rounded-xl text-sm font-bold text-slate-700 hover:bg-[#F8FAFC] transition-all shadow-sm"
          >
            <Calendar className="mr-2 h-4 w-4 text-[#0F172A]/50" />
            Interval: {interval === 'monthly' ? '30D' : interval === 'quarterly' ? '90D' : '1Y'}
          </button> */}
          <button 
            onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8,leads,deals,revenue\n" + stats.leads + "," + stats.deals + "," + stats.revenue;
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", "dashboard_snapshot.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="inline-flex items-center px-5 py-2 bg-[#F59E0B] text-[#F8FAFC] rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 transition-all"
          >
            <Download className="mr-2 h-4 w-4" />
            Full Snapshot
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
           {[1,2,3,4,5].map(i => (
             <div key={i} className="h-32 bg-[#F8FAFC] rounded-[32px] border border-[#0F172A]/10 skeleton" />
           ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[32px] flex items-center text-rose-600 font-bold">
          <AlertCircle className="w-6 h-6 mr-4" /> {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
          <StatCard 
            title="Total Prospects" 
            value={stats.leads} 
            trend="+12.5%" 
            trendUp={true} 
            icon={<Users className="w-5 h-5" />} 
            color="text-[#0F172A]" 
            bg="bg-blue-50" 
          />
          <StatCard 
            title="Active Deals" 
            value={stats.deals} 
            trend="+4.2%" 
            trendUp={true} 
            icon={<Handshake className="w-5 h-5" />} 
            color="text-emerald-600" 
            bg="bg-emerald-50" 
          />
          <StatCard 
            title="Pipeline Value" 
            value={`₹${stats.revenue.toLocaleString()}`} 
            trend="-2.1%" 
            trendUp={false} 
            icon={<DollarSign className="w-5 h-5" />} 
            color="text-amber-600" 
            bg="bg-amber-50" 
          />
          <StatCard 
            title="Marketing ROI" 
            value={stats.marketing_roi} 
            trend="+17.4%" 
            trendUp={true} 
            icon={<Megaphone className="w-5 h-5" />} 
            color="text-indigo-600" 
            bg="bg-indigo-50" 
          />
          <StatCard 
            title="Protocol Ops" 
            value={stats.tasks} 
            trend="+8" 
            trendUp={true} 
            icon={<ClipboardList className="w-5 h-5" />} 
            color="text-rose-600" 
            bg="bg-rose-50" 
          />
        </div>
      )}

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#F8FAFC]/80 backdrop-blur-md p-8 rounded-[32px] border border-[#0F172A]/20 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-[#0F172A] tracking-tight">Revenue Projection</h3>
              <p className="text-sm font-medium text-[#0F172A]/70 mt-1">Monthly sales performance vs forecast matrix</p>
            </div>
            <div className="flex items-center p-1 bg-[#0F172A]/20/50 rounded-xl">
               <button className="px-4 py-1.5 bg-[#F8FAFC] shadow-sm rounded-lg text-xs font-bold text-[#0F172A]">Current</button>
               {/* <button className="px-4 py-1.5 rounded-lg text-xs font-bold text-[#0F172A]/50 hover:text-[#0F172A]/70 transition-colors">Historical</button> */}
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                    padding: '16px',
                    background: 'rgba(255, 255, 255, 0.9)'
                  }} 
                />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorActual)" animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <Activity className="absolute -right-6 -bottom-6 w-48 h-48 text-[#0F172A] opacity-[0.03] group-hover:rotate-12 transition-transform duration-1000" />
        </div>

        <WorkQueueSummaryWidget />
      </div>

      {/* Deal Pipeline Row */}
      <div className="bg-[#F8FAFC] rounded-[32px] border border-[#0F172A]/20 shadow-xl shadow-[#0F172A]/10 overflow-hidden">
        <div className="px-8 py-6 border-b border-[#0F172A]/10 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-[#0F172A] tracking-tight">Deal Velocity</h3>
            <p className="text-sm font-medium text-[#0F172A]/70 mt-1">Top performing deals in current cycle</p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowDealVelocityMenu(!showDealVelocityMenu)}
              className="p-2.5 bg-[#0F172A]/10 rounded-xl text-[#0F172A]/50 hover:text-[#0F172A]/70 transition-all"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showDealVelocityMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-white/10 z-50">
                <div className="py-1">
                  <button 
                    onClick={() => {
                      navigate('/deals');
                      setShowDealVelocityMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8,Company,Pipeline Value,Probability,Phase\n" + 
                        dealClosures.map(d => `${d.company},${d.value.replace('$', '').replace(',', '')},${d.probability},${d.status}`).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "deal_velocity.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      setShowDealVelocityMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-bold"
                  >
                    Export Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0F172A]/10/50">
                <th className="px-8 py-4 text-[11px] font-black text-[#0F172A]/50 uppercase tracking-widest">Company</th>
                <th className="px-8 py-4 text-[11px] font-black text-[#0F172A]/50 uppercase tracking-widest">Pipeline Value</th>
                <th className="px-8 py-4 text-[11px] font-black text-[#0F172A]/50 uppercase tracking-widest text-center">Probability</th>
                <th className="px-8 py-4 text-[11px] font-black text-[#0F172A]/50 uppercase tracking-widest text-right">Phase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dealClosures.map((deal) => (
                <tr key={deal.id} className="hover:bg-[#0F172A]/10/50 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="font-bold text-[#0F172A] group-hover:text-[#0F172A] transition-colors">{deal.company}</p>
                    <p className="text-[11px] font-medium text-[#0F172A]/50 mt-0.5">Assigned to Major Accounts</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-black text-[#0F172A]">{deal.value}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col items-center max-w-[120px] mx-auto">
                       <div className="w-full bg-[#0F172A]/20 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-[#F59E0B] h-full rounded-full transition-all duration-1000" style={{ width: `${deal.probability}%` }} />
                       </div>
                       <span className="text-[10px] font-black text-[#0F172A]/70 mt-1.5">{deal.probability}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${deal.statusColor}`}>
                      {deal.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, trendUp, icon, color, bg }) {
  return (
    <div className="bg-[#F8FAFC] p-6 rounded-[32px] border border-[#0F172A]/20 shadow-xl shadow-slate-200/40 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 ${bg} ${color} rounded-2xl group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span>{trend}</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-[#0F172A]/50 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-[#0F172A] mt-1">{value}</h3>
      </div>
      <div className={`absolute -right-2 -bottom-2 w-16 h-16 ${bg} opacity-5 rounded-full blur-2xl group-hover:scale-150 transition-transform`} />
    </div>
  );
}

function WorkQueueSummaryWidget() {
  const [metrics, setMetrics] = useState({
    pending: 0,
    completed: 0,
    overdue: 0,
    highPriority: 0,
    dueToday: 0,
    dueThisWeek: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tasksRes, activitiesRes] = await Promise.all([
          tasksApi.getAll(),
          activitiesApi.getAll()
        ]);
        const tasks = tasksRes.results || tasksRes || [];
        const activities = activitiesRes.results || activitiesRes || [];

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        let pending = 0;
        let completed = 0;
        let overdue = 0;
        let highPriority = 0;
        let dueToday = 0;
        let dueThisWeek = 0;

        tasks.forEach(t => {
          if (t.status === 'Completed' || t.status === 'Done') completed++;
          else pending++;

          if (t.priority === 'High' && t.status !== 'Completed' && t.status !== 'Done') highPriority++;

          if (t.due_date) {
            const dueDate = new Date(t.due_date);
            const dueStr = t.due_date.split('T')[0];
            if (t.status !== 'Completed' && t.status !== 'Done') {
              if (dueDate < now && dueStr !== todayStr) overdue++;
              if (dueStr === todayStr) dueToday++;
              
              const diffTime = dueDate.getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays >= 0 && diffDays <= 7) dueThisWeek++;
            }
          }
        });

        setMetrics({ pending, completed, overdue, highPriority, dueToday, dueThisWeek });
        setRecentActivities(activities.slice(0, 4));
      } catch (err) {
        console.error("Failed to load work queue data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-[#F8FAFC]/80 backdrop-blur-md p-8 rounded-[32px] border border-[#0F172A]/20 shadow-xl shadow-slate-200/20 flex items-center justify-center h-[450px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F172A]/50" />
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC]/80 backdrop-blur-md p-8 rounded-[32px] border border-[#0F172A]/20 shadow-xl shadow-slate-200/20 flex flex-col relative overflow-hidden group h-[450px]">
      <div className="mb-6">
        <h3 className="text-xl font-black text-[#0F172A] tracking-tight uppercase">Work Queue Summary</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-2xl flex flex-col">
          <span className="text-[11px] font-black text-[#0F172A]/50 uppercase tracking-widest">Pending Work</span>
          <span className="text-2xl font-black text-[#0F172A] mt-1">{metrics.pending}</span>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl flex flex-col">
          <span className="text-[11px] font-black text-[#0F172A]/50 uppercase tracking-widest">Completed Work</span>
          <span className="text-2xl font-black text-emerald-600 mt-1">{metrics.completed}</span>
        </div>
        <div className="bg-rose-50 p-4 rounded-2xl flex flex-col">
          <span className="text-[11px] font-black text-[#0F172A]/50 uppercase tracking-widest">Overdue Work</span>
          <span className="text-2xl font-black text-rose-600 mt-1">{metrics.overdue}</span>
        </div>
        <div className="bg-amber-50 p-4 rounded-2xl flex flex-col">
          <span className="text-[11px] font-black text-[#0F172A]/50 uppercase tracking-widest">High Priority</span>
          <span className="text-2xl font-black text-amber-600 mt-1">{metrics.highPriority}</span>
        </div>
        <div className="bg-[#0F172A]/5 p-4 rounded-2xl flex flex-col">
          <span className="text-[11px] font-black text-[#0F172A]/50 uppercase tracking-widest">Due Today</span>
          <span className="text-2xl font-black text-[#0F172A] mt-1">{metrics.dueToday}</span>
        </div>
        <div className="bg-[#0F172A]/5 p-4 rounded-2xl flex flex-col">
          <span className="text-[11px] font-black text-[#0F172A]/50 uppercase tracking-widest">Due This Week</span>
          <span className="text-2xl font-black text-[#0F172A] mt-1">{metrics.dueThisWeek}</span>
        </div>
      </div>

      <div className="flex-1 border-t border-[#0F172A]/10 pt-4 overflow-y-auto custom-scrollbar">
        <span className="text-[11px] font-black text-[#0F172A]/50 uppercase tracking-widest block mb-3">Recent Activity</span>
        <ul className="space-y-3">
          {recentActivities.map((act, i) => (
            <li key={i} className="flex items-start text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 mr-2 shrink-0"></span>
              <span className="text-[#0F172A]/80 font-medium">{act.notes || act.type || 'Activity logged'}</span>
            </li>
          ))}
          {recentActivities.length === 0 && (
            <li className="text-sm text-[#0F172A]/50 italic">No recent activities found.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
