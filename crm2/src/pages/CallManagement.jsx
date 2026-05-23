import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneCall, PhoneOutgoing, PhoneOff, CheckCircle, 
  XCircle, Clock, BarChart3, Users, Zap, Search,
  AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import { callsApi, leadsApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function CallManagement() {
  const [leads, setLeads] = useState([]);
  const [calls, setCalls] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCall, setActiveCall] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [outcomeNeeded, setOutcomeNeeded] = useState(null);
  
  const timerRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeCall) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [activeCall]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [leadsRes, callsRes, metricsRes] = await Promise.all([
        leadsApi.getAll(),
        callsApi.getAll(),
        callsApi.metrics()
      ]);
      setLeads(leadsRes.results || leadsRes);
      setCalls(callsRes.results || callsRes);
      setMetrics(metricsRes);
    } catch (err) {
      addToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startCall = async (lead) => {
    try {
      const phoneNumber = lead.contact?.phone || lead.phone || '9100000000';
      const res = await callsApi.startCall({
        lead_id: lead.id,
        phone_number: phoneNumber
      });
      setActiveCall(res);
      setTimer(0);
      addToast(`Call started with ${res.lead_name}`);
      // window.open(`tel:${phoneNumber}`); // Optional as per requirements
    } catch (err) {
      addToast('Failed to start call', 'error');
    }
  };

  const endCall = async () => {
    if (!activeCall) return;
    setIsEnding(true);
    try {
      const res = await callsApi.endCall(activeCall.id);
      setOutcomeNeeded(res);
      setActiveCall(null);
      addToast('Call ended, please select outcome');
    } catch (err) {
      addToast('Failed to end call', 'error');
    } finally {
      setIsEnding(false);
    }
  };

  const submitOutcome = async (outcome) => {
    if (!outcomeNeeded) return;
    try {
      await callsApi.setOutcome(outcomeNeeded.id, outcome);
      setOutcomeNeeded(null);
      addToast(`Outcome saved: ${outcome.replace('_', ' ')}`);
      fetchInitialData();
    } catch (err) {
      addToast('Failed to save outcome', 'error');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredLeads = leads.filter(l => {
    const name = l.contact ? `${l.contact.first_name} ${l.contact.last_name}` : (l.name || '');
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold animate-pulse">Initializing Call Module...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in p-4 md:p-8">
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <PhoneCall className="w-10 h-10 text-blue-600" />
            Call Management
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Simple, efficient manual call tracking.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
          {[
            { label: 'Total', value: metrics?.total_calls || 0, icon: PhoneCall, color: 'text-blue-600' },
            { label: 'Connected', value: metrics?.connected_calls || 0, icon: CheckCircle, color: 'text-emerald-600' },
            { label: 'No Resp', value: metrics?.no_response_calls || 0, icon: XCircle, color: 'text-amber-600' },
            { label: 'Avg Dur', value: `${metrics?.avg_duration || 0}s`, icon: Clock, color: 'text-indigo-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-1`} />
              <span className="text-2xl font-black text-slate-900">{stat.value}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Lead Selection / Active Call */}
        <div className="lg:col-span-2 space-y-6">
          {activeCall ? (
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] p-8 text-white shadow-2xl shadow-blue-500/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <PhoneOutgoing className="w-40 h-40" />
              </div>
              <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                <div className="p-4 bg-white/20 rounded-full backdrop-blur-md animate-pulse">
                  <PhoneOutgoing className="w-12 h-12" />
                </div>
                <div>
                  <h2 className="text-3xl font-black">{activeCall.lead_name}</h2>
                  <p className="text-blue-100 font-bold tracking-widest uppercase text-xs mt-2">{activeCall.phone_number}</p>
                </div>
                <div className="text-6xl font-black tabular-nums tracking-tighter">
                  {formatTime(timer)}
                </div>
                <button 
                  onClick={endCall}
                  disabled={isEnding}
                  className="w-full max-w-xs py-5 bg-white text-blue-700 rounded-3xl font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                >
                  <PhoneOff className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                  End Call
                </button>
              </div>
            </div>
          ) : outcomeNeeded ? (
            <div className="bg-white rounded-[40px] p-8 border-4 border-emerald-100 shadow-2xl space-y-6">
              <div className="text-center">
                <div className="inline-flex p-4 bg-emerald-50 rounded-full text-emerald-600 mb-4">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-black text-slate-900">Call Finished?</h2>
                <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest text-xs">Select the outcome to complete record</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'connected', label: 'Connected', color: 'bg-emerald-600 shadow-emerald-200' },
                  { id: 'no_response', label: 'No Response', color: 'bg-amber-500 shadow-amber-200' },
                  { id: 'not_interested', label: 'Not Interested', color: 'bg-rose-500 shadow-rose-200' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => submitOutcome(opt.id)}
                    className={`py-6 rounded-3xl text-white font-black text-lg shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all ${opt.color}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setOutcomeNeeded(null)}
                className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
              >
                Cancel / Reset
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between gap-4">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs">Available Leads</h3>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search leads..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[600px] divide-y divide-slate-50">
                {filteredLeads.length === 0 ? (
                  <div className="p-20 text-center space-y-4">
                    <Users className="w-12 h-12 text-slate-200 mx-auto" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No leads found</p>
                  </div>
                ) : (
                  filteredLeads.map(lead => (
                    <div key={lead.id} className="p-6 hover:bg-blue-50/30 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 text-xl group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                          {(lead.contact?.first_name?.[0] || lead.name?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-900">
                            {lead.contact ? `${lead.contact.first_name} ${lead.contact.last_name}` : lead.name}
                          </h4>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {lead.contact?.phone || lead.phone || 'No phone'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => startCall(lead)}
                        className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-blue-600 hover:-translate-y-1 transition-all flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                        Start Call
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Calls */}
        <div className="space-y-6">
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50">
              <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Recent History
              </h3>
            </div>
            <div className="divide-y divide-slate-50 max-h-[700px] overflow-y-auto">
              {calls.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic text-sm">No call history yet</div>
              ) : (
                calls.map(call => (
                  <div key={call.id} className="p-5 space-y-2 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <h5 className="font-black text-slate-900 text-sm truncate max-w-[140px]">{call.lead_name}</h5>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest 
                        ${call.outcome === 'connected' ? 'bg-emerald-100 text-emerald-700' : 
                          call.outcome === 'no_response' ? 'bg-amber-100 text-amber-700' : 
                          'bg-rose-100 text-rose-700'}`}
                      >
                        {call.outcome?.replace('_', ' ') || 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>{new Date(call.created_at).toLocaleDateString()} {new Date(call.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {call.duration}s</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
