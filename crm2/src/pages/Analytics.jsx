import React, { useState } from 'react';
import { 
  TrendingUp, DollarSign, Clock, Award, 
  TrendingDown, Minus, ArrowUpRight, ArrowDownRight, Map,
  BarChart3, PieChart as PieChartIcon, Activity, Globe, Zap, Filter, ChevronDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';

import { analyticsApi } from '../services/api';

export default function Analytics() {
  const [timeframe, setTimeframe] = useState('Monthly');
  const [forecastData, setForecastData] = useState([]);
  const [teamData, setTeamData] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [dashStats, teamStats] = await Promise.all([
          analyticsApi.getDashboardStats({ range: timeframe.toLowerCase() }),
          analyticsApi.getTeamPerformance({ range: timeframe.toLowerCase() })
        ]);
        setForecastData(dashStats.chartData || []);
        setKpis(dashStats.kpis || []);
        setTeamData(teamStats || []);
        setLeadSources(dashStats.leadSources || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [timeframe]);

  const TrendIcon = ({ type, className }) => {
    if (type === 'up') return <TrendingUp className={className} />;
    if (type === 'down') return <TrendingDown className={className} />;
    return <Minus className={className} />;
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-[1600px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center space-x-2 mb-1">
             <Activity className="w-5 h-5 text-blue-600" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analytics</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Analytics</h2>
        </div>
        
        <div className="flex items-center space-x-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          {['Monthly', 'Quarterly', 'Annual'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-6 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${
                timeframe === t 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                  : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* High-Level KPIs */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregating Data...</p>
        </div>
      ) : (
        <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => {
          const IconComponent = [Zap, DollarSign, Clock, Award][i % 4];
          return (
          <div key={i} className="glass-card p-8 group hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start">
              <div className={`p-4 bg-${kpi.color}-50 rounded-2xl text-${kpi.color}-600 border border-${kpi.color}-100 group-hover:scale-110 transition-transform`}>
                <IconComponent className="w-6 h-6" />
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                kpi.trend.includes('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}>
                {kpi.trend}
              </span>
            </div>
            <div className="mt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">
                {typeof kpi.value === 'number' 
                  ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(kpi.value)
                  : kpi.value}
              </h3>
            </div>
          </div>
          );
        })}
      </div>

      {/* Main Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Revenue Forecast Chart */}
        <div className="bg-white p-10 rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/40 lg:col-span-2">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900">Revenue Projections</h3>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Predicted vs. Actual Pipeline</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mr-2 shadow-lg shadow-blue-600/20"></span>
                Actual
              </div>
              <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-100 border border-blue-200 mr-2"></span>
                Forecast
              </div>
            </div>
          </div>
          
          <div className="h-80 w-full relative">
            {forecastData.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10 rounded-2xl">
                <BarChart3 className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-900">No Revenue Data Available</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Create Closed Won deals to view projections</p>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={-24}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} dy={15} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }} 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} 
                />
                <Bar dataKey="forecast" fill="#eff6ff" radius={[12, 12, 0, 0]} barSize={40} />
                <Bar dataKey="actual" fill="#2563eb" radius={[12, 12, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Distribution - Dynamic Pie Chart */}
        <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden flex flex-col group">
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-1">
               <h3 className="text-xl font-black text-white">Lead Sources</h3>
               <Globe className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interactive Channel Breakdown</p>
            
            <div className="mt-6 flex-1 relative h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadSources}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {leadSources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', color: '#fff' }}
                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-6 space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {leadSources.map((loc, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: loc.color }} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{loc.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-black text-white">{loc.value}%</span>
                    <span className="text-[9px] font-bold text-slate-600 block leading-none">{loc.raw_count} leads</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
             <Map className="w-64 h-64 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Team Performance Leaderboard */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-900">Personnel Velocity</h3>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Strategic Representative Benchmarks</p>
          </div>
          <button className="flex items-center px-6 py-3 bg-slate-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all border border-slate-100">
            Export Ledger <ChevronDown className="ml-2 w-4 h-4" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Representative</th>
                <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest">Registry Closures</th>
                <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Revenue Yield</th>
                <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Conversion Ratio</th>
                <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {teamData.map((person) => (
                <tr key={person.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-10 py-6">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-400 border border-slate-200 group-hover:scale-110 transition-transform">
                         {person.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="ml-5">
                        <div className="text-base font-bold text-slate-900">{person.name}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{person.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="text-sm font-bold text-slate-900">{person.deals} Objectives</div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <div className="text-sm font-black text-slate-900">
                      {typeof person.revenue === 'number'
                        ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(person.revenue)
                        : person.revenue}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-center">
                    <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-wider border border-slate-100">
                      {person.winRate}%
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <TrendIcon type={person.trend} className={`w-6 h-6 ml-auto ${person.trendColor}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
