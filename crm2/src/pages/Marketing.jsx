import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Megaphone, Send, Target, BarChart3, MailOpen, Plus, Zap,
  Loader2, X, Trash2, TrendingUp, MousePointerClick, DollarSign,
  Search, Edit2, CheckCircle, PauseCircle, Clock, Filter,
  Mail, MessageSquare, Share2, CalendarDays, ChevronDown,
  LayoutDashboard, FormInput, PieChart, ArrowUpRight, ArrowDownRight,
  UserPlus, Link as LinkIcon, Copy, Check, Globe, Smartphone,
  Users, Layers, ExternalLink, RefreshCcw, Smartphone as WhatsAppIcon
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, Cell, PieChart as RePieChart, Pie, Legend
} from 'recharts';
import { campaignsApi, marketingApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../context/WebSocketContext';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'lead_capture', label: 'Lead Capture', icon: FormInput },
  { id: 'analytics', label: 'Analytics', icon: PieChart },
];

const CHANNEL_ICONS = {
  email: Mail,
  social: Share2,
  sms: MessageSquare,
  event: CalendarDays,
  whatsapp: MessageSquare,
  referral: Users,
  seo: Globe,
};

const CHANNEL_COLORS = {
  email: 'from-blue-500 to-indigo-600',
  social: 'from-pink-500 to-rose-600',
  sms: 'from-emerald-500 to-teal-600',
  event: 'from-amber-500 to-orange-600',
  whatsapp: 'from-green-500 to-emerald-600',
  referral: 'from-purple-500 to-indigo-600',
  seo: 'from-cyan-500 to-blue-600',
};

const STATUS_CONFIG = {
  active:    { label: 'Active',    icon: Zap,          bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  draft:     { label: 'Draft',     icon: Clock,         bg: 'bg-slate-50 text-slate-500 border-slate-100' },
  paused:    { label: 'Paused',    icon: PauseCircle,   bg: 'bg-amber-50 text-amber-600 border-amber-100' },
  completed: { label: 'Completed', icon: CheckCircle,   bg: 'bg-blue-50 text-blue-600 border-blue-100' },
  archived:  { label: 'Archived',  icon: Trash2,        bg: 'bg-slate-100 text-slate-400 border-slate-200' },
};

const EMPTY_FORM = {
  name: '', type: 'email', source_platform: 'website', target_audience: '',
  status: 'draft', assigned_team: '', budget: '', expected_revenue: '',
  description: '', start_date: '', end_date: '',
};

// --- Sub-Components ---

function StatCard({ icon: Icon, label, value, sub, trend, gradient }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
        <div className="text-2xl font-black text-slate-900 mt-1">{value}</div>
        {sub && <div className="text-xs text-slate-400 font-medium mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function MiniBar({ value, max, color = 'bg-blue-500' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
      <div className={`h-full ${color} rounded-full transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// --- Main Component ---

export default function Marketing() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();
  const { lastMessage } = useWebSocket();

  // Simulator state
  const [simData, setSimData] = useState({ name: '', email: '', message: '', campaign_id: '' });
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchData = async () => {
    // Only set loading if we don't have data yet
    if (!analytics) setIsLoading(true);
    try {
      const [cRes, aRes] = await Promise.all([
        campaignsApi.getAll(),
        marketingApi.getAnalytics()
      ]);
      setCampaigns(cRes.results || cRes.data || cRes || []);
      setAnalytics(aRes);
    } catch (err) {
      addToast('Failed to sync marketing data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, [lastMessage]);

  useEffect(() => {
    // Handle deep-linking from Sidebar hash fragments
    const hash = location.hash.replace('#', '');
    if (hash === 'campaigns') setActiveTab('campaigns');
    else if (hash === 'capture') setActiveTab('lead_capture');
    else if (hash === 'analytics') setActiveTab('analytics');
    else setActiveTab('overview');
  }, [location.hash]);

  const openCreate = () => { setEditingId(null); setFormData(EMPTY_FORM); setIsModalOpen(true); };
  const openEdit = (c) => {
    setEditingId(c.id);
    setFormData({
      name: c.name, type: c.type, source_platform: c.source_platform || 'website',
      target_audience: c.target_audience || '', status: c.status,
      assigned_team: c.assigned_team || '', budget: c.budget || '',
      expected_revenue: c.expected_revenue || '', description: c.description || '',
      start_date: c.start_date || '', end_date: c.end_date || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        budget: Number(formData.budget) || 0,
        expected_revenue: Number(formData.expected_revenue) || 0,
      };
      if (editingId) {
        await campaignsApi.update(editingId, payload);
        addToast('Campaign optimized!', 'success');
      } else {
        await campaignsApi.create(payload);
        addToast('New campaign launched!', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      addToast('System error: Failed to sync campaign', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Archive this campaign?')) return;
    try {
      await campaignsApi.delete(id);
      addToast('Campaign archived', 'success');
      fetchData();
    } catch {
      addToast('Action failed', 'error');
    }
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.target_audience || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [campaigns, search]);

  const copySnippet = (id) => {
    const snippet = `<!-- CRM Lead Capture for ${id} -->
<form action="${window.location.origin}/api/marketing/capture-lead/" method="POST">
  <input type="hidden" name="campaign_id" value="${id}">
  <input type="text" name="name" placeholder="Your Name" required>
  <input type="email" name="email" placeholder="Email" required>
  <textarea name="message"></textarea>
  <button type="submit">Contact Us</button>
</form>`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Embed snippet copied!', 'success');
  };

  // --- Render Functions ---

  const renderOverview = () => {
    if (!analytics) return <div className="p-20 text-center animate-pulse text-slate-300">Synchronizing analytics engine...</div>;

    const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'];
    const pieData = analytics.leads_by_source?.map(s => ({ name: s.source, value: s.count })) || [];
    const funnelData = Object.entries(analytics.funnel || {}).map(([name, value]) => ({ name, value }));

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={Users} label="Total Leads" value={analytics.total_leads} sub={`${analytics.campaign_leads} from campaigns`} trend={12} gradient="from-purple-600 to-indigo-600" />
          <StatCard icon={TrendingUp} label="Conversion Rate" value={`${analytics.conversion_rate}%`} sub="Lead to Deal conversion" trend={5} gradient="from-emerald-500 to-teal-600" />
          <StatCard icon={DollarSign} label="Won Revenue" value={`₹${analytics.total_won_revenue.toLocaleString()}`} sub="From campaign-linked deals" trend={18} gradient="from-blue-500 to-cyan-600" />
          <StatCard icon={Zap} label="Overall ROI" value={`${analytics.overall_roi}%`} sub={`Budget: ₹${analytics.total_budget.toLocaleString()}`} trend={-2} gradient="from-amber-500 to-orange-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Trend Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Leads Acquisition Trend</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Growth over the last 6 months</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-lg shadow-indigo-200" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Leads</span>
                </div>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthly_trend}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: 900, marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px', color: '#64748b' }}
                  />
                  <Area type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorLeads)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Source Donut Chart */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8">Leads by Source</h3>
            <div className="h-[250px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analytics.leads_by_source?.map((s, index) => (
                      <Cell key={`cell-${index}`} fill={s.color || '#2563eb'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingBottom: '0' }} />
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-2xl font-black text-slate-900">{analytics.total_leads}</div>
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</div>
              </div>
            </div>
            <div className="mt-auto pt-6 space-y-3">
              {pieData.slice(0, 4).map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{d.name}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Campaigns Mini-Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Top Performing Campaigns</h3>
              <button onClick={() => setActiveTab('campaigns')} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                View All <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-4">
              {analytics.top_campaigns?.map((c, i) => (
                <div key={c.id} className="group p-4 bg-slate-50/50 hover:bg-indigo-50/50 border border-slate-100 rounded-2xl transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-black">{i + 1}</div>
                      <div>
                        <div className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.status}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900">₹{Number(c.actual_revenue).toLocaleString()}</div>
                      <div className={`text-[10px] font-black uppercase tracking-widest ${Number(c.roi_percentage) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {c.roi_percentage}% ROI
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3">
                    <span>Leads: {c.leads_generated}</span>
                    <span>Cost/Lead: ₹{c.cost_per_lead}</span>
                  </div>
                  <MiniBar value={c.leads_generated} max={Math.max(...analytics.top_campaigns.map(x => x.leads_generated))} color="bg-indigo-600" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8">Lead Funnel Efficiency</h3>
            <div className="space-y-6">
              {funnelData.map((f, i) => (
                <div key={f.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{f.name.replace('_', ' ')}</span>
                    <span className="text-xs font-black text-slate-900">{f.value}</span>
                  </div>
                  <div className="relative h-10 w-full bg-slate-100 rounded-2xl overflow-hidden group">
                    <div
                      className={`h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out`}
                      style={{ width: `${(f.value / analytics.total_leads) * 100}%`, opacity: 1 - (i * 0.1) }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">
                        {Math.round((f.value / analytics.total_leads) * 100)}% Conversion
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 p-6 bg-indigo-900 rounded-3xl text-white text-center shadow-xl shadow-indigo-200">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-70">Top Performance Channel</div>
                <div className="text-2xl font-black">{analytics.leads_by_source?.[0]?.source || 'None'}</div>
                <div className="text-xs font-bold opacity-70 mt-1">Driving {( (analytics.leads_by_source?.[0]?.count / analytics.total_leads) * 100).toFixed(1)}% of all growth</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCampaigns = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Filter by name or audience..."
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 text-sm outline-none w-full sm:w-80 shadow-sm" />
        </div>
        <button onClick={openCreate}
          className="flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95 shadow-md">
          <Plus className="w-4 h-4 mr-2" /> Launch New Campaign
        </button>
      </div>

      {/* Campaign List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              {['Campaign Details', 'Channel', 'Revenue', 'ROI', 'Leads', 'Status', 'Dates', ''].map(h => (
                <th key={h} className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredCampaigns.length === 0 ? (
              <tr><td colSpan={8} className="py-20 text-center">
                <Megaphone className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400">No active campaigns matching search</p>
              </td></tr>
            ) : (
              filteredCampaigns.map(c => {
                const Icon = CHANNEL_ICONS[c.type] || Mail;
                const grad = CHANNEL_COLORS[c.type] || 'from-slate-400 to-slate-500';
                const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
                const StatusIcon = sc.icon;
                const roi = Number(c.roi_percentage || 0);

                return (
                  <tr key={c.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer">
                    <td className="px-6 py-5">
                      <div className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{c.target_audience || 'All Audience'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-md`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-black text-slate-900">₹{Number(c.actual_revenue).toLocaleString()}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Budget: ₹{Number(c.budget).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${roi >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {roi >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(roi)}%
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm font-black text-slate-900">{c.leads_generated}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Won: {c.converted_deals}</div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black rounded-full border uppercase tracking-wider shadow-sm ${sc.bg}`}>
                        <StatusIcon className="w-3.5 h-3.5" />{sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      {c.start_date || 'N/A'}<br/>
                      <span className="opacity-50">To</span> {c.end_date || '—'}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-100 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLeadCapture = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Code Snippet Box */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <LinkIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">Lead Capture Widget</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Webhooks & Integration API</p>
            </div>
          </div>
          <button
            onClick={() => copySnippet(campaigns[0]?.id || 'CAMP_ID')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Snippet'}
          </button>
        </div>

        <div className="bg-slate-950/50 rounded-2xl p-6 font-mono text-xs text-indigo-300 border border-white/5 overflow-x-auto leading-relaxed">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <pre className="text-slate-400">
{`<form action="${window.location.origin}/api/marketing/capture-lead/" method="POST">`}
<br/>
<span className="text-indigo-400">  {/* Essential attribution */}</span>
<br/>
{`  <input type="hidden" name="campaign_id" value="${campaigns[0]?.id || 'CAMPAIGN_ID'}">`}
<br/>
{`  <input type="hidden" name="source" value="website">`}
<br/>
<br/>
<span className="text-indigo-400">  {/* Lead data fields */}</span>
<br/>
{`  <input type="text" name="name" placeholder="Name" required>`}
<br/>
{`  <input type="email" name="email" placeholder="Email" required>`}
<br/>
{`  <input type="tel" name="phone" placeholder="Phone">`}
<br/>
{`  <textarea name="message" placeholder="Project details"></textarea>`}
<br/>
<br/>
{`  <button type="submit">Submit Inquiry</button>`}
<br/>
{`</form>`}
          </pre>
        </div>

        <div className="mt-8 space-y-4">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Platform Integration Status</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-widest">Website Forms</span>
              </div>
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase tracking-widest">Live</span>
            </div>
            <div className="flex-1 p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black uppercase tracking-widest">WhatsApp Hub</span>
              </div>
              <span className="text-[8px] font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase tracking-widest">Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Test Form Preview */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col">
        <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center border border-purple-100">
                <FormInput className="w-5 h-5 text-purple-600" />
            </div>
            <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Simulator</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Integration Testing</p>
            </div>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Simulate Campaign</label>
                    <select 
                        value={simData.campaign_id} 
                        onChange={e => setSimData({ ...simData, campaign_id: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 transition-all font-bold"
                    >
                        <option value="">Direct / No Campaign</option>
                        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <input 
                    value={simData.name} 
                    onChange={e => setSimData({ ...simData, name: e.target.value })}
                    placeholder="Sample Name" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 transition-all font-bold" 
                />
                <input 
                    value={simData.email} 
                    onChange={e => setSimData({ ...simData, email: e.target.value })}
                    placeholder="Sample Email" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 transition-all font-bold" 
                />
                <textarea 
                    value={simData.message} 
                    onChange={e => setSimData({ ...simData, message: e.target.value })}
                    placeholder="Message Body" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-500 transition-all h-24 resize-none font-bold" 
                />
                <button 
                    disabled={isSimulating}
                    onClick={async () => {
                        if (!simData.name || !simData.email) return addToast('Name and Email required', 'warning');
                        setIsSimulating(true);
                        try {
                            const res = await marketingApi.captureLead({ ...simData, source: 'simulator' });
                            if (res.is_duplicate) {
                                addToast('Lead exists (Duplicate suppressed)', 'info');
                            } else {
                                addToast(`Lead Captured! Assigned to ${res.assigned_to}`, 'success');
                            }
                            setSimData({ name: '', email: '', message: '', campaign_id: '' });
                            fetchData();
                        } catch {
                            addToast('Simulation failed', 'error');
                        } finally {
                            setIsSimulating(false);
                        }
                    }}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-200 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50"
                >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Test Lead Injection'}
                </button>
            </div>
            <p className="text-[10px] text-slate-400 font-black text-center mt-6 uppercase tracking-widest leading-relaxed">
                Testing will generate a real Lead & Activity log<br/>
                <span className="text-indigo-500">Duplicate detection active (24h window)</span>
            </p>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cost Per Lead Matrix */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8">Acquisition Efficiency</h3>
            <div className="space-y-6">
                {analytics?.top_campaigns?.map(c => (
                    <div key={c.id} className="flex items-center gap-4">
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black text-slate-900">{c.name}</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">₹{c.cost_per_lead} / Lead</span>
                            </div>
                            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                                    style={{ width: `${(c.budget / analytics.total_budget) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div className="w-20 text-right">
                            <div className="text-xs font-black text-emerald-600">+{c.roi_percentage}%</div>
                            <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ROI SCORE</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Conversion Velocity */}
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8">Channel Conversion Score</h3>
            <div className="flex-1 flex items-end gap-2 h-[200px]">
                {analytics?.leads_by_source?.map((s, i) => (
                    <div key={s.source} className="flex-1 flex flex-col items-center gap-3">
                        <div className="w-full bg-indigo-600 rounded-t-xl transition-all duration-1000 ease-out flex items-center justify-center group relative" style={{ height: `${(s.count / analytics.total_leads) * 100}%` }}>
                            <span className="text-[10px] font-black text-white rotate-90 opacity-0 group-hover:opacity-100 transition-opacity">{s.count}</span>
                            <div className="absolute -top-8 text-[10px] font-black text-indigo-600">{Math.round((s.count/analytics.total_leads)*100)}%</div>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate w-full text-center">{s.source}</span>
                    </div>
                ))}
            </div>
            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div>
                    <div className="text-xs font-black text-slate-900 uppercase tracking-widest">Winning Source</div>
                    <div className="text-lg font-black text-indigo-600 uppercase tracking-tight">{analytics?.leads_by_source?.[0]?.source || 'None'}</div>
                </div>
                <div className="text-right">
                    <div className="text-xs font-black text-slate-900 uppercase tracking-widest">Avg Conversion</div>
                    <div className="text-lg font-black text-emerald-600 uppercase tracking-tight">{analytics?.conversion_rate}%</div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen">
      {/* Premium Header */}
      <div className="relative bg-white/80 backdrop-blur-xl border border-slate-100 rounded-[2.5rem] p-10 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-indigo-500/10 rounded-full blur-[100px] -z-10 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-purple-500/10 rounded-full blur-[100px] -z-10 -translate-x-1/2 translate-y-1/2" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-0.5 shadow-2xl shadow-indigo-200">
                <div className="w-full h-full rounded-[1.4rem] bg-white/10 flex items-center justify-center backdrop-blur-md">
                    <Megaphone className="w-10 h-10 text-white" />
                </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Campaign & Growth</span>
              </div>
              <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">Marketing Hub</h1>
              <p className="text-sm font-bold text-slate-400 mt-3 flex items-center gap-2">
                Automated Lead Generation & Conversion Intelligence
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-indigo-600">Enterprise Standard</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 rounded-2xl backdrop-blur-sm self-start lg:self-center border border-slate-200/50">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[60vh]">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'campaigns' && renderCampaigns()}
        {activeTab === 'lead_capture' && renderLeadCapture()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>

      {/* Campaign Modal (Enhanced) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col scale-in duration-300">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                    <Zap className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{editingId ? 'Optimization Settings' : 'Launch New Campaign'}</h2>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">Configure attribution and budget parameters</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-2xl transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="group">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 group-focus-within:text-indigo-600 transition-colors">Campaign Identifier *</label>
                        <input
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Q4 Growth Accelerator" required
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/5 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Campaign Category</label>
                            <div className="relative">
                                <select
                                    value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer focus:border-indigo-600 transition-all"
                                >
                                    <option value="email">📧 Email Campaign</option>
                                    <option value="social">📱 Social Media</option>
                                    <option value="sms">💬 SMS Marketing</option>
                                    <option value="event">📅 Live Event</option>
                                    <option value="whatsapp">💬 WhatsApp Ads</option>
                                    <option value="referral">👥 Referral Program</option>
                                    <option value="seo">🌐 Organic SEO</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Attribution Source</label>
                            <div className="relative">
                                <select
                                    value={formData.source_platform} onChange={e => setFormData({ ...formData, source_platform: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer focus:border-indigo-600 transition-all"
                                >
                                    <option value="website">Website Form</option>
                                    <option value="facebook">Facebook Ads</option>
                                    <option value="instagram">Instagram Ads</option>
                                    <option value="google">Google Search</option>
                                    <option value="whatsapp">WhatsApp Inquiry</option>
                                    <option value="referral">Direct Referral</option>
                                    <option value="email">Email Link</option>
                                    <option value="direct">Offline / Direct</option>
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Active Status</label>
                            <div className="relative">
                                <select
                                    value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none appearance-none cursor-pointer focus:border-indigo-600 transition-all"
                                >
                                    {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Assigned Team</label>
                            <input
                                value={formData.assigned_team} onChange={e => setFormData({ ...formData, assigned_team: e.target.value })}
                                placeholder="Sales / Growth / SEO"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Campaign Description</label>
                        <textarea
                            value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Define campaign goals and strategy..."
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 h-[10.5rem] resize-none transition-all"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Total Budget (₹)</label>
                            <input
                                type="number" value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })}
                                placeholder="0.00"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Revenue Target (₹)</label>
                            <input
                                type="number" value={formData.expected_revenue} onChange={e => setFormData({ ...formData, expected_revenue: e.target.value })}
                                placeholder="0.00"
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all"
                            />
                        </div>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="group">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Target Audience</label>
                    <input
                        value={formData.target_audience} onChange={e => setFormData({ ...formData, target_audience: e.target.value })}
                        placeholder="e.g. Inactive Users"
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Start Execution</label>
                    <input
                        type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">End Execution</label>
                    <input
                        type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-600 transition-all"
                    />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-8 py-4 bg-white text-slate-500 text-xs font-black uppercase tracking-widest rounded-2xl border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="flex items-center px-10 py-4 bg-indigo-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingId ? <RefreshCcw className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {editingId ? 'Apply Optimization' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
