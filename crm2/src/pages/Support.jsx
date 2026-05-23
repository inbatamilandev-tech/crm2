import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Ticket, Clock, CheckCircle2, AlertTriangle, Shield, TrendingUp, Users, Zap, Star } from 'lucide-react';
import { supportStatsApi, casesApi } from '../services/api';
import { useToast } from '../context/ToastContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Support() {
  const { addToast } = useToast();
  const [stats, setStats] = useState({
    total_cases: 0,
    open_cases: 0,
    resolved_today: 0,
    sla_breaches: 0,
    avg_resolution_time_hours: 0,
    customer_satisfaction: 0
  });
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    supportStatsApi.get()
      .then(data => {
        if (data) setStats(data);
      })
      .catch(err => {
        console.error("[Support] Error fetching stats:", err);
        addToast('Failed to load support stats', 'error');
      });
  };

  const fetchCasesForChart = () => {
    casesApi.getAll()
      .then(data => {
        const casesData = data.results || data;
        if (casesData && casesData.length > 0) {
          const statusCounts = [
            { name: 'New', value: casesData.filter(c => c.status === 'New').length },
            { name: 'In Progress', value: casesData.filter(c => c.status === 'In Progress').length },
            { name: 'Resolved', value: casesData.filter(c => c.status === 'Resolved').length },
            { name: 'Escalated', value: casesData.filter(c => c.status === 'Escalated').length },
          ];
          setStatusData(statusCounts.filter(d => d.value > 0));
        }
      })
      .catch(err => {
        console.error("[Support] Error fetching cases for chart:", err);
        addToast('Failed to load chart data', 'error');
      });
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchCasesForChart()])
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Support Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Real-time metrics and operations overview.</p>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Ticket className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{loading ? '...' : stats.open_cases}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Open Tickets</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{loading ? '...' : stats.resolved_today}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Resolved Today</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-rose-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{loading ? '...' : stats.sla_breaches}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">SLA Breaches</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{loading ? '...' : `${stats.avg_resolution_time_hours}h`}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Avg Resolution Time</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{loading ? '...' : `${stats.customer_satisfaction}/5`}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Customer Satisfaction</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-slate-50 rounded-lg">
              <Ticket className="w-5 h-5 text-slate-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{loading ? '...' : stats.total_cases}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total Cases</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Tickets by Status</h3>
          <div className="h-64">
            {statusData.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm font-bold">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Empty State Placeholder</h3>
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm font-bold">
            Realtime charts will appear here as data grows.
          </div>
        </div>
      </div>
    </div>
  );
}
