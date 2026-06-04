import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PhoneCall, Clock, X, Zap, Search, AlertCircle, Loader2,
  PhoneOutgoing, Play, CheckCircle, AlertTriangle, Timer,
  ChevronDown, Activity, TrendingUp, BarChart3, ArrowRight
} from 'lucide-react';
import { tasksApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

/* ─── Constants ──────────────────────────────────────────── */
const OUTCOME_OPTIONS = [
  { value: 'connected',      label: 'Connected (Success)',   color: 'emerald', icon: '📞', nextAction: 'Update to Contacted & Follow-up' },
  { value: 'no_response',     label: 'No Response',           color: 'amber',   icon: '🟡', nextAction: 'Reschedule Call Task' },
  { value: 'not_interested',  label: 'Not Interested',        color: 'rose',    icon: '🔴', nextAction: 'Mark Lead as Lost' },
];

const OUTCOME_COLORS = {
  connected: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  no_response: 'bg-amber-50 text-amber-600 border-amber-100',
  not_interested: 'bg-rose-50 text-rose-600 border-rose-100',
};


const PRIORITY_STYLES = {
  high:   'bg-rose-50 text-rose-600 border-rose-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low:    'bg-slate-50 text-slate-500 border-slate-200',
};

/* ─── Timer Hook ─────────────────────────────────────────── */
function useCallTimer() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const start = useCallback(() => {
    setElapsed(0);
    setRunning(true);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    return elapsed;
  }, [elapsed]);

  const reset = useCallback(() => {
    setElapsed(0);
    setRunning(false);
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const fmt = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  return { elapsed, formatted: fmt, running, start, stop, reset };
}

/* ─── Main Component ─────────────────────────────────────── */
export default function Calls() {
  const [dashboard, setDashboard] = useState(null);
  const [metrics, setMetrics]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');
  const [activeCallId, setActiveCallId] = useState(null);
  const [outcomeModal, setOutcomeModal] = useState(null);
  const [submittingOutcome, setSubmittingOutcome]     = useState(null);
  const [activityLog, setActivityLog]   = useState([]);
  const [logTaskId, setLogTaskId]       = useState(null);
  const [notes, setNotes]               = useState('');
  const timer = useCallTimer();
  const { addToast } = useToast();
  const justCompletedTaskIdRef = useRef(null);
  const navigate = useNavigate();

  /* ── Data Fetching ───────────────────────────────────────── */
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, met] = await Promise.all([
        tasksApi.callDashboard(),
        tasksApi.metrics(),
      ]);
      setDashboard(dash);
      setMetrics(met);

      // Verify activeCallId consistency (ignore if actively in a call to prevent UI flicker)
      if (activeCallId && !timer.running) {
        const strActiveId = String(activeCallId);
        const stillInProgress = (dash.in_progress || []).some(t => String(t.id) === strActiveId);
        if (!stillInProgress && strActiveId !== justCompletedTaskIdRef.current) {
          setActiveCallId(null);
          timer.stop();
          addToast("Active call task was updated or moved", "info");
        }
      }
    } catch {
      setError('Failed to load call dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  /* ── Actions ─────────────────────────────────────────────── */
  const handleStartCall = async (task) => {
    const strTaskId = String(task.id);
    try {
      await tasksApi.startCall(task.id);
      setActiveCallId(strTaskId);
      timer.start();
      addToast(`Call started: ${task.title}`);
      fetchData();
    } catch {
      addToast('Failed to start call', 'error');
    }
  };

  const handleEndCall = (task) => {
    timer.stop();
    setNotes('');
    setOutcomeModal(task);
  };

  const handleSubmitOutcome = async (task, outcome) => {
    if (submittingOutcome) return;
    
    setSubmittingOutcome(outcome);
    
    // Safety timeout to prevent UI freeze if API hangs (Requirement 3)
    const timeout = setTimeout(() => {
      if (submittingOutcome) {
        setSubmittingOutcome(null);
        addToast("Recording taking longer than expected. Please check your connection.", "warning");
      }
    }, 10000);

    try {
      const res = await tasksApi.completeTask(task.id, { outcome, notes });
      justCompletedTaskIdRef.current = String(task.id);
      addToast(`Task completed — ${outcome}`);
      
      // Handle newly created tasks from workflow (instant UI feedback)
      if (res.new_tasks && res.new_tasks.length > 0) {
        setDashboard(prev => ({
          ...prev,
          in_progress: [
            ...(prev.in_progress || []),
            ...res.new_tasks.filter(nt => nt.status === 'in_progress' || nt.task_type === 'follow_up')
          ]
        }));
      }

      if (res.workflow_actions?.length) {
        res.workflow_actions.forEach(a => addToast(`⚡ ${a}`, 'info'));
      }
      setOutcomeModal(null);
      setActiveCallId(null);
      timer.reset();
      fetchData();
    } catch {
      addToast('Failed to complete task', 'error');
    } finally {
      clearTimeout(timeout);
      setSubmittingOutcome(null);
    }
  };

  const handleViewLog = async (taskId) => {
    const strTaskId = String(taskId);
    if (logTaskId === strTaskId) { setLogTaskId(null); return; }
    try {
      const data = await tasksApi.activityLog(taskId);
      setActivityLog(data);
      setLogTaskId(strTaskId);
    } catch {
      addToast('Failed to load activity log', 'error');
    }
  };

  /* ── Filtering ───────────────────────────────────────────── */
  const filterTasks = (tasks) =>
    (tasks || []).filter(t =>
      (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.lead_name || '').toLowerCase().includes(search.toLowerCase())
    );

  const allTasks = dashboard
    ? [...(dashboard.in_progress || []), ...(dashboard.overdue || []),
       ...(dashboard.due_today || []), ...(dashboard.upcoming || [])]
    : [];
  const filtered = filterTasks(allTasks);

  /* ── Render Helpers ──────────────────────────────────────── */
  const formatDate = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getBucket = (task) => {
    if (task.status === 'in_progress') return { label: 'IN PROGRESS', cls: 'bg-blue-100 text-blue-700' };
    if (task.status === 'completed') return { label: 'COMPLETED', cls: 'bg-emerald-100 text-emerald-700' };
    if (task.is_overdue) return { label: 'OVERDUE', cls: 'bg-rose-100 text-rose-700' };
    const now = new Date();
    const due = task.due_date ? new Date(task.due_date) : null;
    if (due && due.toDateString() === now.toDateString()) return { label: 'DUE TODAY', cls: 'bg-amber-100 text-amber-700' };
    return { label: 'UPCOMING', cls: 'bg-slate-100 text-slate-600' };
  };

  /* ─── RENDER ───────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] animate-fade-in max-w-[1400px] mx-auto p-4 gap-3 overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2 mb-0.5">
            <PhoneCall className="w-4 h-4 text-blue-600" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Workflow Engine</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Call Execution Dashboard</h2>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text" placeholder="Search calls…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-64 transition-all shadow-sm"
            />
          </div>
          <button onClick={fetchData} className="inline-flex items-center px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all">
            <Zap className="mr-2 w-4 h-4 fill-current" /> Refresh
          </button>
        </div>
      </div>

      {/* Live Call Banner */}
      {activeCallId && (
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[24px] p-6 text-white shadow-xl shadow-blue-600/30 flex items-center justify-between animate-pulse-slow">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"><PhoneOutgoing className="w-6 h-6" /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Live Call Active</p>
              <p className="text-2xl font-black tabular-nums">{timer.formatted}</p>
            </div>
          </div>
          <button onClick={() => { 
            const t = allTasks.find(t => String(t.id) === String(activeCallId)); 
            if (t) handleEndCall(t); 
          }}
            className="px-6 py-3 bg-white text-blue-700 rounded-2xl font-black text-sm hover:bg-blue-50 transition-all flex items-center space-x-2">
            <CheckCircle className="w-4 h-4" /><span>End Call</span>
          </button>
        </div>
      )}

      {/* Stats Row */}
      {dashboard?.stats && metrics && (
        <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Calls', value: dashboard.stats.total_call_tasks, icon: PhoneCall, color: 'text-blue-600 bg-blue-50' },
            { label: 'Overdue', value: dashboard.stats.overdue_count, icon: AlertTriangle, color: 'text-rose-600 bg-rose-50' },
            { label: 'In Progress', value: dashboard.stats.in_progress_count, icon: Timer, color: 'text-amber-600 bg-amber-50' },
            { label: 'Conversion', value: `${metrics.call_to_conversion_rate}%`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Completed', value: metrics.total_completed, icon: BarChart3, color: 'text-indigo-600 bg-indigo-50' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-[20px] border border-slate-200 shadow-sm p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                <div className={`p-1.5 rounded-xl ${s.color}`}><s.icon className="w-3.5 h-3.5" /></div>
              </div>
              <h4 className={`text-xl font-black ${s.color.split(' ')[0]}`}>{s.value}</h4>
            </div>
          ))}
        </div>
      )}

      {/* Call Queue */}
      <div className="flex-1 bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col min-h-0">
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Call Execution Queue</h3>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filtered.length} active tasks</span>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
            <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Dashboard…</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-4" />
            <p className="text-slate-500 font-medium">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <PhoneCall className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900">No call tasks</h3>
            <p className="text-slate-400 text-sm mt-1">All calls have been completed. Great work!</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filtered.map(task => {
              const strTaskId = String(task.id);
              const bucket = getBucket(task);
              const isActive = String(activeCallId) === strTaskId;
              return (
                <li key={strTaskId} className={`px-6 py-3 transition-all group ${isActive ? 'bg-blue-50/50 border-l-4 border-blue-500' : 'hover:bg-slate-50/50'}`}>
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 p-3.5 rounded-2xl transition-transform group-hover:scale-110 ${isActive ? 'bg-blue-100' : 'bg-slate-50'}`}>
                      {isActive ? <Timer className="w-5 h-5 text-blue-600 animate-pulse" /> : <PhoneOutgoing className="w-5 h-5 text-slate-400" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                      <div className="md:col-span-2">
                        <h4 className="text-sm font-black text-slate-900 truncate">{task.title}</h4>
                        <button 
                          onClick={() => task.lead && navigate(`/leads?id=${task.lead}`)}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline uppercase tracking-widest mt-0.5"
                        >
                          {task.lead_name || 'No lead'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}>
                          {task.priority}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${bucket.cls}`}>
                          {bucket.label}
                        </span>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due</p>
                        <p className={`text-xs font-bold ${task.is_overdue ? 'text-rose-600' : 'text-slate-600'}`}>{formatDate(task.due_date)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 justify-end">
                        {!isActive && task.status !== 'in_progress' && (
                          <button onClick={() => handleStartCall(task)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 transition-all">
                            <Play className="w-3.5 h-3.5 mr-1.5" /> Start Call
                          </button>
                        )}
                        {isActive && (
                          <button onClick={() => handleEndCall(task)}
                            className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 transition-all">
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> End Call
                          </button>
                        )}
                        {task.status === 'in_progress' && !isActive && (
                          <button onClick={() => setOutcomeModal(task)}
                            className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all">
                            <ArrowRight className="w-3.5 h-3.5 mr-1.5" /> Set Outcome
                          </button>
                        )}
                          <button onClick={() => handleViewLog(task.id)}
                          className={`p-2 rounded-xl border transition-all ${String(logTaskId) === strTaskId ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-600'}`}>
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline Activity Timeline */}
                  {String(logTaskId) === strTaskId && activityLog.length > 0 && (
                    <div className="mt-4 ml-16 border-l-2 border-indigo-100 pl-4 space-y-2 animate-fade-in">
                      {activityLog.slice(0, 10).map((log, i) => (
                        <div key={log.id || `${task.id}-log-${i}`} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-slate-700">
                              {log.action_type.replace('_', ' ')}
                              <span className="text-slate-400 font-normal ml-2">{log.user_name}</span>
                            </p>
                            <p className="text-[10px] text-slate-400">{formatDate(log.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>


      {/* Outcome Modal */}
      {outcomeModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => !submittingOutcome && setOutcomeModal(null)} />
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative z-10">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div>
                <h3 className="text-xl font-black text-slate-900">Record Outcome</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{outcomeModal.title}</p>
              </div>
              <button onClick={() => !submittingOutcome && setOutcomeModal(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notes:</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Enter call notes here..."
                className="w-full p-3 border border-slate-200 rounded-xl mb-4 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none resize-none"
                rows={3}
              />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Select call outcome:</p>
              <div className="grid grid-cols-1 gap-3">
                {OUTCOME_OPTIONS.map(opt => (
                  <button key={opt.value} 
                    disabled={submittingOutcome === opt.value}
                    onClick={() => handleSubmitOutcome(outcomeModal, opt.value)}
                    className={`w-full px-5 py-4 rounded-2xl border-2 text-left font-bold text-sm transition-all flex items-center justify-between group
                      ${submittingOutcome === opt.value ? 'opacity-50 cursor-not-allowed border-slate-300' : 'hover:-translate-y-0.5 hover:shadow-lg'}
                      ${opt.color === 'emerald' ? 'border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 text-emerald-700' :
                        opt.color === 'amber'   ? 'border-amber-200 hover:bg-amber-50 hover:border-amber-400 text-amber-700' :
                        opt.color === 'rose'    ? 'border-rose-200 hover:bg-rose-50 hover:border-rose-400 text-rose-700' :
                        opt.color === 'blue'    ? 'border-blue-200 hover:bg-blue-50 hover:border-blue-400 text-blue-700' :
                                                   'border-slate-200 hover:bg-slate-50 hover:border-slate-400 text-slate-700'}`}
                  >
                    <div className="flex flex-col">
                      <span className="flex items-center gap-3">
                        <span className="text-lg">{opt.icon}</span>
                        {opt.label}
                      </span>
                      <span className="text-[10px] opacity-60 ml-8 font-medium italic">
                        {opt.nextAction ? `→ Workflow: ${opt.nextAction}` : '—'}
                      </span>
                    </div>
                    {submittingOutcome === opt.value ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

