import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Table from '../components/Table';
import CollaborationHub from '../components/CollaborationHub';
import { leadsApi, contactsApi, dealsApi, activitiesApi, tasksApi, callsApi, meetingsApi } from '../services/api';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import { 
  Plus, Download, ChevronDown, Calendar, ArrowDown, X, 
  Loader2, AlertCircle, Trash2, Edit2, Filter, Search,
  MoreHorizontal, Mail, Phone, Building2, UserPlus, ChevronRight,
  Megaphone, Info, Send, Clock, FileText, Activity, Briefcase,
  CheckCircle2, XCircle, ChevronLeft, ExternalLink, Paperclip,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { useWebSocket } from '../context/WebSocketContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
dayjs.extend(relativeTime);
dayjs.extend(isToday);

// ─────────────────────────────────────────────────────────────────────────────
// LeadDetailView — fully functional lead detail page
// ─────────────────────────────────────────────────────────────────────────────
function LeadDetailView({ lead, onBack, onEdit, onDelete, onConvert, onStatusChange, getStatusStyles, addToast, onRefresh }) {
  const [activeTab, setActiveTab]         = useState('overview');
  const [activeSection, setActiveSection] = useState('overview');
  const [showMoreMenu, setShowMoreMenu]   = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm]         = useState({ subject: '', body: '' });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [relatedDeals, setRelatedDeals]   = useState([]);
  const [relatedActivities, setRelatedActivities] = useState([]);
  const [relatedTasks, setRelatedTasks]   = useState([]);
  const [timeline, setTimeline]           = useState([]);
  const [currentTask, setCurrentTask]     = useState(null);
  const [suggestedNextTask, setSuggestedNextTask] = useState(null);
  const [autoCreatePreference, setAutoCreatePreference] = useState(false);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [hideDetails, setHideDetails]     = useState(false);
  const moreMenuRef = useRef(null);

  // Modals for Task Completion
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [activeCallId, setActiveCallId] = useState(null);
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);

  // Timer logic for live calls
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const formattedTime = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  const handleStartCall = async (task) => {
    try {
      await tasksApi.startCall(task.id);
      setActiveCallId(task.id);
      setElapsed(0);
      setTimerRunning(true);
      addToast(`Call started: ${task.title}`, 'info');
      
      // Update local task state to in_progress
      setCurrentTask({ ...task, status: 'in_progress' });
    } catch {
      addToast('Failed to start call', 'error');
    }
  };

  const handleEndCall = () => {
    setTimerRunning(false);
    setShowOutcomeModal(true);
  };

  const handleSubmitOutcome = async (outcome) => {
    if (!currentTask) return;
    setIsSubmittingActivity(true);
    try {
      const res = await tasksApi.completeTask(currentTask.id, { outcome });
      addToast(`Task completed — ${outcome}`, 'success');
      
      if (res.workflow_actions?.length) {
        res.workflow_actions.forEach(a => addToast(`⚡ ${a}`, 'info'));
      }

      setShowOutcomeModal(false);
      setActiveCallId(null);
      setCurrentTask(null);
      setElapsed(0);

      // Refresh timeline
      const activitiesRes = await activitiesApi.getAll();
      const allActs = activitiesRes.results ?? activitiesRes;
      setTimeline(allActs.filter(a => a.object_id === lead.id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
      
      // Refresh lead to pick up backend-driven flags like deal_required
      if (onRefresh) await onRefresh();

      // Check for next task created by workflow
      setTimeout(async () => {
        const tasksRes = await tasksApi.getAll({ lead: lead.id, is_active: true });
        const activeTasks = tasksRes.results ?? tasksRes;
        if (activeTasks.length > 0) {
          setCurrentTask(activeTasks[0]);
        }
      }, 1000);

    } catch {
      addToast('Failed to complete task', 'error');
    } finally {
      setIsSubmittingActivity(false);
    }
  };

  const handleCompleteTaskGeneric = async () => {
    if (!currentTask) return;
    
    if (currentTask.task_type === 'call') {
      if (activeCallId) {
        handleEndCall();
      } else {
        handleStartCall(currentTask);
      }
      return;
    }
    
    // For other types, just show outcome modal directly
    setShowOutcomeModal(true);
  };

  // Close More menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch initial summary (Current Task and Timeline)
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const tasksRes = await tasksApi.getAll({ source_object_id: lead.id, is_active: true });
        const activeTasks = tasksRes.results ?? tasksRes;
        setCurrentTask(activeTasks.length > 0 ? activeTasks[0] : null);

        const activitiesRes = await activitiesApi.getAll();
        // Since generic relations aren't perfectly filtered without a specific endpoint, 
        // we filter by object_id in frontend (assuming small volume for now, or use a better backend filter later)
        const allActs = activitiesRes.results ?? activitiesRes;
        const leadActs = allActs.filter(a => a.object_id === lead.id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        setTimeline(leadActs);
      } catch (err) {
        // ignore
      }
    };
    fetchSummary();
  }, [lead.id]);

  // Fetch related data when sidebar section changes
  const fetchRelated = useCallback(async (section) => {
    if (section === 'overview') return;
    setRelatedLoading(true);
    try {
      if (section === 'deals') {
        const res = await dealsApi.getAll({ search: lead.company || lead.name });
        setRelatedDeals((res.results ?? res).slice(0, 10));
      } else if (section === 'activities') {
        const res = await activitiesApi.getAll();
        setRelatedActivities((res.results ?? res).slice(0, 10));
      } else if (section === 'tasks') {
        const res = await tasksApi.getAll({ source_object_id: lead.id });
        setRelatedTasks((res.results ?? res).slice(0, 10));
      }
    } catch { /* non-critical */ }
    finally { setRelatedLoading(false); }
  }, [lead]);

  const handleSectionClick = (section) => {
    const key = section.toLowerCase();
    setActiveSection(key);
    if (key !== 'overview') {
      setActiveTab('related');
      fetchRelated(key);
    } else {
      setActiveTab('overview');
    }
  };

  // Send Email handler
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.subject.trim() || !emailForm.body.trim()) {
      addToast('Subject and message are required', 'error');
      return;
    }
    setIsSendingEmail(true);
    try {
      // Log as an Activity (email type)
      await activitiesApi.create({
        type: 'email',
        notes: `Subject: ${emailForm.subject}\n\n${emailForm.body}`,
      });
      addToast(`Email sent to ${lead.email}`);
      setShowEmailModal(false);
      setEmailForm({ subject: '', body: '' });
    } catch {
      addToast('Failed to send email', 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const SIDEBAR_ITEMS = ['Overview', 'Collaboration', 'Notes', 'Emails', 'Activities', 'Deals', 'Tasks', 'Attachments'];

  return (
    <div className="bg-[#F8FAFC] min-h-screen">

      {/* ── Top Action Bar ── */}
      <div className="border-b border-[#0F172A]/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1.5 text-[#0F172A]/70 hover:text-[#0F172A] hover:bg-[#0F172A]/10 rounded-lg transition-colors"
            title="Back to Leads"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-[#0F172A]/10 text-[#0F172A] rounded-lg flex items-center justify-center text-lg font-bold">
            {lead.name.substring(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 className="text-[18px] font-semibold text-[#0F172A]">
              {lead.name}{lead.company ? ` - ${lead.company}` : ''}
            </h2>
            <button className="flex items-center text-[12px] text-[#0F172A] hover:underline mt-0.5">
              <Plus className="w-3 h-3 mr-1" /> Add Tags
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Live Call Indicator in Header */}
          {timerRunning && (
            <div className="flex items-center bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse mr-2 border border-rose-100">
              <Timer className="w-3 h-3 mr-1.5" />
              LIVE CALL: {formattedTime}
            </div>
          )}

          {/* Send Email */}
          <button
            onClick={() => setShowEmailModal(true)}
            className="px-4 py-1.5 bg-[#0F172A] text-[#F8FAFC] rounded-[4px] font-medium text-[13px] hover:bg-blue-700 transition-colors flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" /> Send Email
          </button>

          {/* Convert */}
          <button
            onClick={onConvert}
            className="px-4 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 text-[#0F172A] font-medium rounded-[4px] text-[13px] hover:bg-[#0F172A]/5 transition-colors"
          >
            Convert
          </button>

          {/* Edit */}
          <button
            onClick={onEdit}
            className="px-4 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 text-[#0F172A] font-medium rounded-[4px] text-[13px] hover:bg-[#0F172A]/5 transition-colors flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>

          {/* More options (...) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(v => !v)}
              className="px-2 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 text-[#0F172A] rounded-[4px] hover:bg-[#0F172A]/5 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                <button
                  onClick={() => { onStatusChange('contacted'); setShowMoreMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#0F172A] hover:bg-[#0F172A]/5 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-500" /> Mark as Contacted
                </button>
                <button
                  onClick={() => { onStatusChange('qualified'); setShowMoreMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#0F172A] hover:bg-[#0F172A]/5 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-500" /> Mark as Qualified
                </button>
                <button
                  onClick={() => { onStatusChange('lost'); setShowMoreMenu(false); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#0F172A] hover:bg-[#0F172A]/5 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4 text-rose-500" /> Mark as Lost
                </button>
                <div className="my-1 h-px bg-[#0F172A]/10" />
                <button
                  onClick={() => { setShowMoreMenu(false); onDelete(); }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete Lead
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex">

        {/* ── Left Sidebar — Related List ── */}
        <div className="w-56 border-r border-[#0F172A]/20 bg-[#F8FAFC] h-[calc(100vh-137px)] overflow-y-auto py-4 flex-shrink-0">
          <h3 className="text-[13px] font-bold text-[#0F172A]/70 uppercase tracking-widest px-5 mb-2">Related List</h3>
          <ul className="text-[13px] text-[#0F172A]">
            {SIDEBAR_ITEMS.map(item => {
              const key = item.toLowerCase();
              const isActive = activeSection === key;
              return (
                <li key={item}>
                  <button
                    onClick={() => handleSectionClick(item)}
                    className={`w-full text-left px-5 py-2.5 transition-colors flex items-center justify-between group ${
                      isActive
                        ? 'bg-[#0F172A]/10 text-blue-700 font-semibold border-r-2 border-blue-600'
                        : 'hover:bg-[#0F172A]/5 hover:text-[#0F172A]'
                    }`}
                  >
                    <span>{item}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="px-5 mt-4 space-y-2">
            <button className="text-[13px] text-[#0F172A] hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Related List
            </button>
          </div>
          <div className="px-5 mt-6">
            <h3 className="text-[13px] font-bold text-[#0F172A]/70 uppercase tracking-widest mb-2">Links</h3>
            <button className="text-[13px] text-[#0F172A] hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Link
            </button>
          </div>
        </div>

        {/* ── Main Content Area ── */}
        <div className="flex-1 bg-[#F5F6F8] h-[calc(100vh-137px)] overflow-y-auto">

          {/* ── Overview Tab ── */}
          {activeSection === 'overview' && (
            <div className="p-6 space-y-4">
              {/* Tab switcher */}
              <div className="flex items-center space-x-3 mb-2">
                <div className="flex bg-[#F8FAFC] rounded-full border border-[#0F172A]/20 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-6 py-1.5 text-[13px] font-medium transition-colors ${activeTab === 'overview' ? 'bg-[#EBF0FA] text-[#1a56d9]' : 'text-[#0F172A]/70 hover:bg-[#0F172A]/5'}`}
                  >Overview</button>
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className={`px-6 py-1.5 text-[13px] font-medium transition-colors ${activeTab === 'timeline' ? 'bg-[#EBF0FA] text-[#1a56d9]' : 'text-[#0F172A]/70 hover:bg-[#0F172A]/5'}`}
                  >Timeline</button>
                </div>
              </div>

              {activeTab === 'overview' && (
                <>
                  {/* Deal Required Reminder */}
                  {lead.deal_required && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-sm p-5 mb-4 relative overflow-hidden animate-pulse">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[12px] font-black text-amber-600 uppercase tracking-widest mb-1 flex items-center">
                            🚨 Action Required: Create Deal
                          </h4>
                          <p className="text-[14px] font-bold text-[#0F172A] mt-1">
                            A successful meeting was held. Please create a deal to progress this lead.
                          </p>
                        </div>
                        <button 
                          onClick={onConvert}
                          className="px-6 py-2 bg-amber-600 text-[#F8FAFC] rounded-lg text-[13px] font-bold hover:bg-amber-700 transition-colors shadow-md shadow-amber-600/20 flex items-center gap-2"
                        >
                          <Briefcase className="w-4 h-4" /> Create Deal Now
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Smart Next Action block */}
                  {suggestedNextTask && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm p-5 mb-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                      <h4 className="text-[12px] font-black text-emerald-600 uppercase tracking-widest mb-1 flex items-center">
                        ✅ Task Completed
                      </h4>
                      <div className="mt-3">
                        <p className="text-[12px] font-semibold text-emerald-800 uppercase tracking-wider mb-1">➡ Next Action Suggestion</p>
                        <p className="text-[15px] font-bold text-[#0F172A]">{suggestedNextTask}</p>
                      </div>
                      
                      <div className="mt-3 mb-2 flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="autoCreatePref"
                          checked={autoCreatePreference}
                          onChange={(e) => setAutoCreatePreference(e.target.checked)}
                          className="w-3.5 h-3.5 text-[#0F172A] rounded border-[#0F172A]/20"
                        />
                        <label htmlFor="autoCreatePref" className="text-[12px] text-emerald-700 cursor-pointer select-none">
                          Auto-create this step next time?
                        </label>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button 
                          className="px-4 py-1.5 bg-[#F59E0B] border border-blue-700 rounded text-[12px] font-semibold text-[#F8FAFC] hover:bg-blue-700 transition-colors"
                          onClick={async () => {
                            try {
                              if (autoCreatePreference) {
                                addToast('Preference saved. Will auto-create next time.', 'success');
                              }
                              await tasksApi.create({ title: suggestedNextTask, lead: lead.id, priority: 'medium', status: 'not_started' });
                              setSuggestedNextTask(null);
                              const tasksRes = await tasksApi.getAll({ source_object_id: lead.id, is_active: true });
                              setCurrentTask((tasksRes.results ?? tasksRes)[0] || null);
                            } catch(e) {}
                          }}
                        >
                          [ Create ]
                        </button>
                        <button 
                          className="px-4 py-1.5 bg-[#F8FAFC] border border-emerald-300 rounded text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          onClick={() => setSuggestedNextTask(null)}
                        >
                          [ Skip ]
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Current Task Card */}
                  {currentTask && (
                    <div className={`bg-gradient-to-r ${timerRunning ? 'from-rose-50 to-white border-rose-200' : 'from-orange-50 to-white border-orange-100'} border rounded-xl shadow-sm p-5 mb-4 relative overflow-hidden transition-all`}>
                      <div className={`absolute top-0 left-0 w-1 h-full ${timerRunning ? 'bg-rose-500' : 'bg-orange-400'}`}></div>
                      <div className="flex items-center justify-between">
                        <h4 className={`text-[12px] font-black ${timerRunning ? 'text-rose-600' : 'text-orange-600'} uppercase tracking-widest mb-1 flex items-center`}>
                          {timerRunning ? <span className="flex items-center"><Timer className="w-3 h-3 mr-1 animate-pulse" /> LIVE CALL IN PROGRESS</span> : '🔥 Current Task'}
                        </h4>
                        {timerRunning && <span className="text-xl font-black tabular-nums text-rose-600">{formattedTime}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <p className="text-[15px] font-semibold text-[#0F172A]">
                            {currentTask.title} 
                          </p>
                          <p className="text-[13px] text-[#0F172A]/70 mt-0.5">
                            Due: <span className="font-medium text-[#0F172A]">{currentTask.due_date ? dayjs(currentTask.due_date).format('MMM D') : 'N/A'}</span>
                            <span className="mx-2 text-[#0F172A]/30">|</span>
                            Priority: <span className={`font-bold ${currentTask.priority === 'high' ? 'text-rose-600' : 'text-[#0F172A]'}`}>{currentTask.priority?.toUpperCase()}</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!timerRunning ? (
                            <>
                              {currentTask.task_type === 'call' && (
                                <button 
                                  className="px-4 py-1.5 bg-[#F59E0B] text-[#F8FAFC] rounded-lg text-[12px] font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 flex items-center gap-1.5"
                                  onClick={() => handleStartCall(currentTask)}
                                >
                                  <Phone className="w-3.5 h-3.5" /> Start Call
                                </button>
                              )}
                              {currentTask.task_type === 'meeting' && (
                                <button 
                                  className="px-4 py-1.5 bg-indigo-600 text-[#F8FAFC] rounded-lg text-[12px] font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 flex items-center gap-1.5"
                                  onClick={() => addToast("Select Date/Time feature goes here", "info")}
                                >
                                  <Calendar className="w-3.5 h-3.5" /> Schedule Date/Time
                                </button>
                              )}
                              <button 
                                className="px-4 py-1.5 bg-[#F8FAFC] border border-slate-300 rounded-lg text-[12px] font-semibold text-[#0F172A] hover:bg-[#0F172A]/10"
                                onClick={handleCompleteTaskGeneric}
                              >
                                {currentTask.task_type === 'call' ? 'Log Manually' : 'Log Outcome'}
                              </button>
                            </>
                          ) : (
                            <button 
                              className="px-6 py-1.5 bg-rose-600 text-[#F8FAFC] rounded-lg text-[12px] font-bold shadow-lg shadow-rose-600/20 hover:bg-rose-700 flex items-center gap-1.5"
                              onClick={handleEndCall}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> End Call
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick info card */}
                  <div className="bg-[#F8FAFC] border border-[#0F172A]/20 rounded-xl shadow-sm p-6">
                    <div className="grid grid-cols-2 gap-y-5">
                      <InfoRow label="Lead Owner" value={lead.assigned_to_full_name || lead.assigned_to_username || '—'} />
                      <InfoRow label="Email" value={lead.email} isLink />
                      <InfoRow label="Phone" value={lead.phone} isPhone />
                      <InfoRow label="Mobile" value="—" />
                      <div className="flex">
                        <div className="w-32 text-[13px] text-[#0F172A]/70 text-right pr-6">Lead Status</div>
                        <select
                          disabled={true}
                          title="Lead status is updated automatically by completing tasks."
                          value={lead.status || 'new'}
                          onChange={e => onStatusChange(e.target.value)}
                          className={`px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider outline-none cursor-not-allowed opacity-80 border ${getStatusStyles(lead.status)}`}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="qualified">Qualified</option>
                          <option value="lost">Lost</option>
                          <option value="won">Success</option>
                        </select>
                      </div>
                      <InfoRow label="Source" value={lead.source || '—'} />
                    </div>
                  </div>

                  {/* Full lead info */}
                  {!hideDetails && (
                    <div className="bg-[#F8FAFC] border border-[#0F172A]/20 rounded-xl shadow-sm mt-4">
                      <div className="border-b border-[#0F172A]/10 px-6 py-3 flex justify-between items-center">
                        <span className="text-[14px] font-semibold text-[#0F172A]">Lead Information</span>
                        <button
                          onClick={() => setHideDetails(true)}
                          className="text-[12px] text-[#0F172A] hover:underline"
                        >Hide Details</button>
                      </div>
                      <div className="px-6 py-5">
                        <div className="grid grid-cols-2 gap-y-5">
                          <InfoRow label="Lead Owner" value={lead.assigned_to_full_name || lead.assigned_to_username || '—'} />
                          <InfoRow label="Company"    value={lead.company || '—'} />
                          <InfoRow label="Lead Name"  value={lead.name} />
                          <InfoRow label="Title"      value={lead.source || '—'} />
                          <InfoRow label="Phone"      value={lead.phone} isPhone />
                          <InfoRow label="Email"      value={lead.email} isLink />
                          <InfoRow label="Created"    value={new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
                          <InfoRow label="Status"     value={lead.status?.toUpperCase() === 'WON' ? 'SUCCESS' : lead.status?.toUpperCase()} />
                        </div>
                      </div>
                    </div>
                  )}

                  {hideDetails && (
                    <button
                      onClick={() => setHideDetails(false)}
                      className="text-[13px] text-[#0F172A] hover:underline px-1 mt-2"
                    >Show Details</button>
                  )}
                </>
              )}

              {activeTab === 'timeline' && (
                <div className="bg-[#F8FAFC] border border-[#0F172A]/20 rounded-xl p-6">
                  <h4 className="text-[14px] font-bold text-[#0F172A] mb-6 flex items-center">
                    📜 Timeline
                  </h4>
                  {timeline.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-10 h-10 text-[#0F172A]/30 mx-auto mb-3" />
                      <p className="text-[14px] font-semibold text-[#0F172A]/70">No activity timeline yet</p>
                      <p className="text-[12px] text-[#0F172A]/50 mt-1">Actions on this lead will appear here</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-[#0F172A]/10 ml-4 space-y-6">
                      {(() => {
                        const grouped = [];
                        let currentGroup = null;
                        [...timeline].reverse().forEach(act => {
                          if (act.type === 'update') {
                            if (!currentGroup) {
                              currentGroup = { isGroup: true, type: 'update', count: 1, items: [act], id: act.id };
                              grouped.push(currentGroup);
                            } else {
                              currentGroup.count += 1;
                              currentGroup.items.push(act);
                            }
                          } else {
                            currentGroup = null;
                            grouped.push(act);
                          }
                        });
                        return grouped.reverse().map((act) => {
                          if (act.isGroup) {
                            return (
                              <div key={act.id} className="relative pl-6 opacity-70">
                                <div className="absolute -left-[11px] top-1 bg-[#F8FAFC] border-2 border-[#0F172A]/20 w-5 h-5 rounded-full flex items-center justify-center">
                                  <div className="text-blue-500 font-bold text-[10px]">🔄</div>
                                </div>
                                <div className="bg-[#0F172A]/10 border border-[#0F172A]/10 rounded-lg p-3 cursor-pointer hover:bg-[#0F172A]/20 transition-colors" onClick={(e) => {
                                  const details = e.currentTarget.nextElementSibling;
                                  if (details) details.classList.toggle('hidden');
                                }}>
                                  <p className="text-[13px] text-[#0F172A] font-medium">🔄 Task updated ({act.count} times)</p>
                                  <p className="text-[11px] text-[#0F172A]/50 mt-1">Click to expand details</p>
                                </div>
                                <div className="hidden mt-2 space-y-2 pl-2 border-l-2 border-[#0F172A]/20">
                                  {act.items.slice().reverse().map(subAct => (
                                    <div key={subAct.id} className="text-[12px] text-[#0F172A]/70">
                                      <span className="font-semibold text-slate-600">{dayjs(subAct.created_at).fromNow()}</span> → {subAct.notes}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          const isHighValue = ['call', 'meeting', 'completed'].includes(act.type);
                          let icon = <CheckCircle2 className="w-3.5 h-3.5 text-[#0F172A]/70" />;
                          if (act.type === 'call') icon = <Phone className="w-3.5 h-3.5 text-blue-500" />;
                          if (act.type === 'reminder') icon = <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
                          if (act.type === 'created') icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
                          if (act.type === 'completed') icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
                          if (act.type === 'email') icon = <Mail className="w-3.5 h-3.5 text-indigo-500" />;
                          
                          const timeStr = dayjs(act.created_at).isToday() ? `Today at ${dayjs(act.created_at).format('h:mm A')}` : dayjs(act.created_at).fromNow();

                          return (
                            <div key={act.id} className={`relative pl-6 ${isHighValue ? 'opacity-100' : 'opacity-80'}`}>
                              <div className={`absolute -left-[11px] top-1 bg-[#F8FAFC] border-2 ${isHighValue ? 'border-blue-100 shadow-sm' : 'border-[#0F172A]/20'} w-5 h-5 rounded-full flex items-center justify-center`}>
                                {icon}
                              </div>
                              <div className={`rounded-lg p-3 ${isHighValue ? 'bg-[#0F172A]/10 border border-blue-100' : 'bg-[#0F172A]/10 border border-[#0F172A]/10'}`}>
                                <p className={`text-[13px] ${isHighValue ? 'text-blue-900 font-bold' : 'text-[#0F172A] font-medium'}`}>{act.notes || act.type}</p>
                                <p className={`text-[11px] mt-1 ${isHighValue ? 'text-[#0F172A] font-medium' : 'text-[#0F172A]/70'}`}>
                                  {timeStr}
                                </p>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Related: Activities ── */}
          {activeSection === 'activities' && (
            <RelatedSection title="Activities" icon={<Activity className="w-4 h-4" />} loading={relatedLoading}>
              {relatedActivities.length === 0
                ? <EmptyState icon={<Activity className="w-8 h-8" />} message="No activities logged yet" />
                : relatedActivities.map(a => (
                  <div key={a.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 bg-[#0F172A]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-[#0F172A]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#0F172A] capitalize">{a.type}</p>
                      <p className="text-[12px] text-[#0F172A]/70 mt-0.5 line-clamp-2">{a.notes}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{new Date(a.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              }
            </RelatedSection>
          )}

          {/* ── Related: Deals ── */}
          {activeSection === 'deals' && (
            <RelatedSection title="Deals" icon={<Briefcase className="w-4 h-4" />} loading={relatedLoading}>
              {relatedDeals.length === 0
                ? <EmptyState icon={<Briefcase className="w-8 h-8" />} message="No deals linked to this lead yet" sub="Convert this lead to create a deal" />
                : relatedDeals.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-[13px] font-semibold text-[#0F172A]">{d.title}</p>
                      <p className="text-[12px] text-[#0F172A]/70">{d.stage} · ${parseFloat(d.value).toLocaleString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      (d.stage === 'Closed Won' || d.stage === 'Successfully Closed') ? 'bg-emerald-50 text-emerald-600' :
                      d.stage?.startsWith('Closed') ? 'bg-rose-50 text-rose-600' :
                      'bg-[#0F172A]/10 text-[#0F172A]'
                    }`}>{d.stage === 'Closed Won' ? 'SUCCESS' : d.stage === 'Successfully Closed' ? 'SUCCESS' : d.stage}</span>
                  </div>
                ))
              }
            </RelatedSection>
          )}

          {/* ── Related: Tasks ── */}
          {activeSection === 'tasks' && (
            <RelatedSection title="Tasks" icon={<CheckCircle2 className="w-4 h-4" />} loading={relatedLoading}>
              {relatedTasks.length === 0
                ? <EmptyState icon={<CheckCircle2 className="w-8 h-8" />} message="No tasks assigned to this lead yet" sub="Create a task to follow up" />
                : relatedTasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className={`text-[13px] font-semibold ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-[#0F172A]'}`}>{t.title}</p>
                      <p className="text-[12px] text-[#0F172A]/70">Due: {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A'} · Priority: <span className="capitalize">{t.priority}</span></p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      t.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                      t.status === 'in_progress' ? 'bg-[#0F172A]/10 text-[#0F172A]' :
                      'bg-[#0F172A]/10 text-slate-600'
                    }`}>{t.status}</span>
                  </div>
                ))
              }
            </RelatedSection>
          )}

          {/* ── Related: Notes ── */}
          {activeSection === 'notes' && (
            <RelatedSection title="Notes" icon={<FileText className="w-4 h-4" />} loading={false}>
              <EmptyState icon={<FileText className="w-8 h-8" />} message="No notes added yet" />
            </RelatedSection>
          )}

          {/* ── Related: Emails ── */}
          {activeSection === 'emails' && (
            <RelatedSection title="Emails" icon={<Mail className="w-4 h-4" />} loading={false}>
              <div className="mb-4">
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="px-4 py-1.5 bg-[#0F172A] text-[#F8FAFC] rounded-[4px] font-medium text-[13px] hover:bg-blue-700 flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" /> Compose Email
                </button>
              </div>
              <EmptyState icon={<Mail className="w-8 h-8" />} message="No emails sent yet" sub={`Send the first email to ${lead.email}`} />
            </RelatedSection>
          )}

          {/* ── Related: Attachments ── */}
          {activeSection === 'attachments' && (
            <RelatedSection title="Attachments" icon={<Paperclip className="w-4 h-4" />} loading={false}>
              <EmptyState icon={<Paperclip className="w-8 h-8" />} message="No attachments yet" />
            </RelatedSection>
          )}

          {/* ── Related: Collaboration ── */}
          {activeSection === 'collaboration' && (
            <div className="p-6 h-[calc(100vh-200px)]">
              <CollaborationHub contentType="lead" objectId={lead.id} />
            </div>
          )}

        </div>
      </div>

      {/* ── Send Email Modal ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => !isSendingEmail && setShowEmailModal(false)} />
          <div className="bg-[#F8FAFC] rounded-2xl shadow-2xl w-full max-w-lg relative z-10">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#0F172A]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#0F172A]/10 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-[#0F172A]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#0F172A]">Send Email</h3>
                  <p className="text-[12px] text-[#0F172A]/70">To: {lead.name} &lt;{lead.email}&gt;</p>
                </div>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                disabled={isSendingEmail}
                className="p-1.5 text-gray-400 hover:text-[#0F172A] hover:bg-[#0F172A]/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              {/* To (read-only display) */}
              <div className="flex items-center gap-3 px-3 py-2 bg-[#0F172A]/5 rounded-lg border border-[#0F172A]/20">
                <span className="text-[12px] text-[#0F172A]/70 font-semibold w-10">To:</span>
                <span className="text-[13px] text-[#0F172A]">{lead.name} &lt;{lead.email}&gt;</span>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Subject *</label>
                <input
                  required
                  type="text"
                  value={emailForm.subject}
                  onChange={e => setEmailForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="e.g. Following up on your inquiry"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Message *</label>
                <textarea
                  required
                  rows={6}
                  value={emailForm.body}
                  onChange={e => setEmailForm(p => ({ ...p, body: e.target.value }))}
                  placeholder={`Hi ${lead.name.split(' ')[0]},\n\n`}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-400">Activity will be logged automatically</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    disabled={isSendingEmail}
                    className="px-4 py-2 text-[13px] font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="px-5 py-2 text-[13px] font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {isSendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {isSendingEmail ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Outcome Selection Modal (Automated Flow) ── */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => !isSubmittingActivity && setShowOutcomeModal(null)} />
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative z-10">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Record Outcome</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{currentTask?.title}</p>
              </div>
              <button onClick={() => !isSubmittingActivity && setShowOutcomeModal(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-8">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Select the outcome of this {currentTask?.task_type || 'task'}:</p>
              <div className="grid grid-cols-1 gap-3">
                {(() => {
                  const tt = currentTask?.task_type || 'call';
                  if (tt === 'meeting') return [
                    { value: 'interested',      label: 'Interested',      color: 'emerald', icon: '🟢' },
                    { value: 'not_interested',  label: 'Not Interested',  color: 'rose',    icon: '🔴' },
                  ];
                  if (tt === 'proposal') return [
                    { value: 'success',         label: 'Accepted (Won)',         color: 'blue',    icon: '✅' },
                    { value: 'failed',          label: 'Rejected (Lost)',        color: 'slate',   icon: '❌' },
                  ];
                  return [
                    { value: 'success',         label: 'Connected (Success)',   color: 'emerald', icon: '📞' },
                    { value: 'no_response',     label: 'No Response',           color: 'amber',   icon: '🟡' },
                    { value: 'not_interested',  label: 'Not Interested',        color: 'rose',    icon: '🔴' },
                  ];
                })().map(opt => (
                  <button key={opt.value} disabled={isSubmittingActivity}
                    onClick={() => handleSubmitOutcome(opt.value)}
                    className={`w-full px-5 py-4 rounded-2xl border-2 text-left font-bold text-sm transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-between group
                      ${opt.color === 'emerald' ? 'border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 text-emerald-700' :
                        opt.color === 'amber'   ? 'border-amber-200 hover:bg-amber-50 hover:border-amber-400 text-amber-700' :
                        opt.color === 'rose'    ? 'border-rose-200 hover:bg-rose-50 hover:border-rose-400 text-rose-700' :
                        opt.color === 'blue'    ? 'border-blue-200 hover:bg-blue-50 hover:border-blue-400 text-blue-700' :
                                                  'border-slate-200 hover:bg-slate-50 hover:border-slate-400 text-slate-700'}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-lg">{opt.icon}</span>
                      {opt.label}
                    </span>
                    {isSubmittingActivity ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </button>
                ))}
              </div>
              <p className="mt-6 text-[10px] text-center text-slate-400 font-medium">⚡ Selecting an outcome will automatically trigger next steps and update lead status.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small reusable helpers ────────────────────────────────────────────────────
function InfoRow({ label, value, isLink, isPhone }) {
  return (
    <div className="flex">
      <div className="w-32 text-[13px] text-gray-500 text-right pr-6 flex-shrink-0">{label}</div>
      {isLink && value ? (
        <a href={`mailto:${value}`} className="text-[13px] text-blue-600 hover:underline">{value}</a>
      ) : isPhone && value ? (
        <div className="flex items-center gap-1.5 text-[13px] text-gray-800">
          {value}
          <div className="w-5 h-5 bg-[#D4E8D4] rounded flex items-center justify-center">
            <Phone className="w-3 h-3 text-[#1B5E20]" />
          </div>
        </div>
      ) : (
        <div className="text-[13px] text-gray-800">{value || '—'}</div>
      )}
    </div>
  );
}

function RelatedSection({ title, icon, loading, children }) {
  return (
    <div className="p-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <span className="text-gray-500">{icon}</span>
          <h3 className="text-[14px] font-bold text-gray-800">{title}</h3>
        </div>
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : children}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="text-slate-200 mb-3">{icon}</div>
      <p className="text-[13px] font-semibold text-slate-500">{message}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}



export default function Leads() {
  const fetchLeadsWithSort = useCallback(async (params, config) => {
    const res = await leadsApi.getAll(params, config);
    if (Array.isArray(res)) {
      const order = { 'new': 1, 'contacted': 2, 'qualified': 3 };
      return res.sort((a, b) => {
        const orderA = order[a.status?.toLowerCase()] || 99;
        const orderB = order[b.status?.toLowerCase()] || 99;
        return orderA - orderB;
      });
    }
    return res;
  }, []);

  const { 
    currentPage, 
    rowsPerPage, 
    totalRecords, 
    totalPages, 
    isLoading, 
    error, 
    setPage, 
    changeRowsPerPage, 
    loadData, 
    setCurrentPage 
  } = usePagination(fetchLeadsWithSort);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState([]);
  const { lastMessage } = useWebSocket();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [viewingLead, setViewingLead] = useState(null);
  const [convertingLead, setConvertingLead] = useState(false);
  const [conversionSuccess, setConversionSuccess] = useState(null);
  const [convertData, setConvertData] = useState({
    createDeal: false, dealName: '', amount: '', stage: 'proposal',
    closingDate: '', campaign_source: '', contact_role: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });
  
  // Debounce search query
  useEffect(() => {
    if (searchQuery !== debouncedSearchQuery) {
      setIsSearching(true);
    }
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
      setCurrentPage(1); // Reset page on search change
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery, debouncedSearchQuery, setCurrentPage]);

  // Dynamic conversion rate fetched from backend
  const [conversionStats, setConversionStats] = useState({ conversion_rate: 0, qualified: 0, total: 0 });
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '', email: '', company: '', phone: '', source: 'website', status: 'new'
  });

  // ─── Data Fetching ───────────────────────────────────────────────────────────

  const fetchLeads = useCallback(async () => {
    const params = { ordering: '-created_at' };
    if (debouncedSearchQuery) {
      params.search = debouncedSearchQuery;
    }
    if (statusFilter !== 'All') {
      params.status = statusFilter.toLowerCase();
    }
    const data = await loadData(params);
    setLeads(data);
  }, [loadData, debouncedSearchQuery, statusFilter]);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'model_update' && lastMessage.model === 'lead') {
      console.log("[Leads] WebSocket update received, refetching leads...");
      fetchLeads();
    }
  }, [lastMessage, fetchLeads]);

  const fetchConversionRate = useCallback(async () => {
    try {
      const stats = await leadsApi.getConversionRate();
      setConversionStats(stats);
    } catch {
      // non-critical — keep default 0
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchConversionRate();
  }, [fetchLeads, fetchConversionRate]);

  // Deep linking and browser navigation logic
  useEffect(() => {
    const leadId = searchParams.get('id');
    
    // If URL has no ID but we are viewing a lead, user clicked browser Back
    if (!leadId && viewingLead) {
      setViewingLead(null);
    } 
    // If URL has an ID but we aren't viewing it (deep link, refresh, or browser Forward)
    else if (leadId && (!viewingLead || viewingLead.id.toString() !== leadId)) {
      const fetchDeepLinkedLead = async () => {
        try {
          const lead = await leadsApi.getById(leadId);
          setViewingLead(lead);
        } catch (err) {
          console.error("Failed to fetch deep-linked lead", err);
          // Clean up URL if lead not found
          setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.delete('id');
            return newParams;
          });
        }
      };
      fetchDeepLinkedLead();
    }
  }, [searchParams, viewingLead, setSearchParams]);

  // Handle /new route
  useEffect(() => {
    if (location.pathname.endsWith('/new')) {
      setSelectedLead(null);
      setFormData({ name: '', email: '', company: '', phone: '', source: 'website', status: 'new' });
      setIsModalOpen(true);
      // Clean up URL so refresh doesn't reopen modal
      navigate('/leads', { replace: true });
    }
  }, [location.pathname, navigate]);

  // ─── CRUD Handlers ───────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    setDialogConfig({
      isOpen: true,
      title: "Delete Lead",
      description: "Are you sure you want to delete this lead? This action cannot be undone.",
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await leadsApi.delete(id);
          addToast('Lead deleted successfully');
          fetchLeads();
        } catch (err) {
          addToast('Failed to delete lead', 'error');
        }
      }
    });
  };

  const handleAddOrEditLead = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedLead) {
        await leadsApi.update(selectedLead.id, formData);
        addToast('Lead updated successfully');
      } else {
        await leadsApi.create(formData);
        addToast('Lead created successfully');
      }
      setIsModalOpen(false);
      fetchLeads();
    } catch (err) {
      console.error('Failed to save lead', err);
      addToast('Error saving lead. Please check your inputs.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertLead = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        createDeal:      convertData.createDeal,
        dealName:        convertData.dealName || `${viewingLead.company || viewingLead.name} Deal`,
        amount:          convertData.amount || 0,
        stage:           convertData.stage || 'Qualification',
        campaign_source: convertData.campaign_source || '',
        contact_role:    convertData.contact_role || '',
      };

      // Normalize closing date to YYYY-MM-DD
      if (convertData.closingDate) {
        if (convertData.closingDate.includes('-')) {
          payload.closingDate = convertData.closingDate;
        } else {
          const parts = convertData.closingDate.split('/');
          if (parts.length === 3) {
            payload.closingDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
          }
        }
      }

      const response = await leadsApi.convert(viewingLead.id, payload);
      setConversionSuccess({
        account: response.contact.company || response.contact.name,
        contact: response.contact.name,
        deal: response.deal ? response.deal.title : null,
      });
      setConvertingLead(false);
      fetchLeads();
      fetchConversionRate();
    } catch (err) {
      console.error('Conversion Error Details:', err.response?.data || err);
      let errorMsg = 'Failed to convert lead';
      const data = err.response?.data;
      if (data) {
        if (typeof data === 'object' && data.detail) {
          errorMsg = data.detail;
        } else if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          if (firstKey) errorMsg = `${firstKey}: ${data[firstKey]}`;
        } else if (typeof data === 'string') {
          errorMsg = data;
        }
      }
      addToast(errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Modal Helpers ───────────────────────────────────────────────────────────

  const openAddModal = () => {
    setSelectedLead(null);
    setFormData({ name: '', email: '', company: '', phone: '', source: 'website', status: 'new' });
    setIsModalOpen(true);
  };

  const openEditModal = (lead) => {
    setSelectedLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email,
      company: lead.company || '',
      phone: lead.phone || '',
      source: lead.source || 'website',
      status: lead.status || 'new',
    });
    setIsModalOpen(true);
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getStatusStyles = (status) => {
    switch (status?.toLowerCase()) {
      case 'new':       return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'contacted': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'qualified': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'lost':      return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'converted': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'won':       return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default:          return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  // Server-side filtering is used, so we just use the leads array directly
  const filteredLeads = leads;

  // ─── Table Columns ───────────────────────────────────────────────────────────

  const columns = [
    {
      header: (
        <div className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-500">
          Name <ArrowDown className="ml-1 h-3 w-3" />
        </div>
      ),
      accessor: 'name',
      render: (row) => {
        const initials = row.name.split(' ').map(n => n[0]).join('');
        const bgColors = ['bg-blue-50', 'bg-indigo-50', 'bg-violet-50', 'bg-cyan-50'];
        const textColors = ['text-blue-600', 'text-indigo-600', 'text-violet-600', 'text-cyan-600'];
        const idx = row.name.length % bgColors.length;
        return (
          <div className="flex items-center group">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold mr-3 shadow-sm border border-white transition-transform group-hover:scale-110 ${bgColors[idx]} ${textColors[idx]}`}>
              {initials.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{row.name}</div>
              <div className="text-[11px] font-medium text-slate-500 mt-0.5 flex items-center">
                <Phone className="w-3 h-3 mr-1 opacity-50" /> {row.phone || 'N/A'}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Company',
      accessor: 'company',
      render: (row) => (
        <div className="flex items-center text-slate-600 font-medium">
          <Building2 className="w-3.5 h-3.5 mr-2 opacity-50" />
          {row.company || '-'}
        </div>
      )
    },
    {
      header: 'Email',
      accessor: 'email',
      render: (row) => (
        <div className="flex items-center text-slate-500 text-sm">
          <Mail className="w-3.5 h-3.5 mr-2 opacity-50" />
          {row.email}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const isConverted = row.status?.toLowerCase() === 'qualified' && row.contact;
        const displayStatus = row.status?.toLowerCase() === 'won' ? 'Success' : (row.status || 'New');
        return (
          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 inline-flex text-[10px] font-bold rounded-lg capitalize border shadow-sm ${getStatusStyles(row.status)}`}>
              {displayStatus}
            </span>
            {isConverted && (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded text-[9px] font-bold uppercase tracking-tight">
                Converted
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'Created',
      accessor: 'created_at',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-slate-600 text-xs font-semibold">{new Date(row.created_at).toLocaleDateString()}</span>
          <span className="text-[10px] text-slate-400 font-medium">{new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      )
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <div className="flex justify-end space-x-1">
          <button
            onClick={() => {
              setViewingLead(row);
              setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);
                newParams.set('id', row.id);
                return newParams;
              });
            }}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            title="View Lead"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            title="Edit Lead"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            title="Delete Lead"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // ─── Render Views ────────────────────────────────────────────────────────────

  if (conversionSuccess) {
    return (
      <div className="bg-white min-h-screen">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-[18px] font-semibold text-gray-800">Convert Lead ({viewingLead?.name}{viewingLead?.company ? ` - ${viewingLead?.company}` : ''})</h2>
        </div>
        
        <div className="p-8 max-w-4xl">
          <p className="text-[15px] text-gray-700 mb-6">
            The Lead "{viewingLead?.name}" has been successfully converted.
          </p>
          
          <h3 className="text-[15px] text-gray-800 mb-4">Conversion Details</h3>
          
          <div className="w-full border-t border-b border-gray-200">
            <div className="flex py-3 border-b border-gray-100">
              <div className="w-48 text-[14px] text-gray-700">Account</div>
              <div className="text-[14px] text-blue-600 hover:underline cursor-pointer">{conversionSuccess.account}</div>
            </div>
            <div className="flex py-3 border-b border-gray-100">
              <div className="w-48 text-[14px] text-gray-700">Contact</div>
              <div className="text-[14px] text-blue-600 hover:underline cursor-pointer">{conversionSuccess.contact}</div>
            </div>
            {conversionSuccess.deal && (
              <div className="flex py-3">
                <div className="w-48 text-[14px] text-gray-700">Deal</div>
                <div className="text-[14px] text-blue-600 hover:underline cursor-pointer">{conversionSuccess.deal}</div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => { 
              setConversionSuccess(null); 
              setViewingLead(null); 
              setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);
                newParams.delete('id');
                return newParams;
              });
            }}
            className="mt-6 px-4 py-1.5 bg-white border border-blue-600 text-blue-600 rounded text-[14px] hover:bg-blue-50 transition-colors"
          >
            Go to Leads
          </button>
        </div>
      </div>
    );
  }

  if (convertingLead) {
    return (
      <div className="bg-white min-h-screen flex">
        <div className="flex-1">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-[18px] font-semibold text-gray-800">Convert Lead ({viewingLead?.name}{viewingLead?.company ? ` - ${viewingLead?.company}` : ''})</h2>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleConvertLead} className="space-y-6 max-w-2xl">
              <div className="space-y-4">
                <div className="flex items-center">
                  <span className="w-48 text-[14px] text-gray-800">Create New Account</span>
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-800 text-[13px] rounded">{viewingLead?.company || viewingLead?.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-48 text-[14px] text-gray-800">Create New Contact</span>
                  <span className="px-2 py-0.5 bg-gray-200 text-gray-800 text-[13px] rounded">{viewingLead?.name}</span>
                </div>
              </div>

              <div className="pt-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={convertData.createDeal}
                    onChange={(e) => setConvertData({ ...convertData, createDeal: e.target.checked })}
                    className="w-4 h-4 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-[14px] text-gray-800">Create a new Deal for this Account.</span>
                </label>
                
                {convertData.createDeal && (
                  <div className="mt-6 ml-6 space-y-4 max-w-lg">
                    <div className="flex items-center">
                      <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Amount *</div>
                      <div className="flex-1 relative flex items-center border border-gray-300 rounded overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                        <span className="px-3 py-1.5 bg-gray-50 border-r border-gray-300 text-[13px] text-gray-600">Rs.</span>
                        <input required={convertData.createDeal} type="number" className="w-full px-3 py-1.5 text-[13px] outline-none" value={convertData.amount || ''} onChange={e => setConvertData({...convertData, amount: e.target.value})} placeholder="Enter deal amount" />
                        <Info className="w-4 h-4 text-gray-400 absolute right-2" />
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Deal Name *</div>
                      <div className="flex-1">
                        <input required={convertData.createDeal} type="text" className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={convertData.dealName || viewingLead?.company || viewingLead?.name || ''} onChange={e => setConvertData({...convertData, dealName: e.target.value})} />
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Closing Date *</div>
                      <div className="flex-1">
                        <input required={convertData.createDeal} type="date" className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={convertData.closingDate || ''} onChange={e => setConvertData({...convertData, closingDate: e.target.value})} />
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Stage</div>
                      <div className="flex-1">
                        <select className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none bg-no-repeat bg-[right_0.5rem_center]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1em'}} value={convertData.stage || 'proposal'} onChange={e => setConvertData({...convertData, stage: e.target.value})}>
                          <option value="proposal">Proposal/Price Quote</option>
                          <option value="Qualification">Qualification</option>
                          <option value="Needs Analysis">Needs Analysis</option>
                          <option value="Value Proposition">Value Proposition</option>
                          <option value="Identify Decision Makers">Identify Decision Makers</option>
                          <option value="Negotiation/Review">Negotiation/Review</option>
                          <option value="Closed Won">Success</option>
                          <option value="Closed Lost">Closed Lost</option>
                          <option value="Closed Lost to Competition">Closed Lost to Competition</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Campaign Source</div>
                      <div className="flex-1 relative flex items-center border border-gray-300 rounded overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 text-[13px] outline-none"
                          value={convertData.campaign_source}
                          onChange={e => setConvertData({...convertData, campaign_source: e.target.value})}
                          placeholder="e.g. Google Ads"
                        />
                        <div className="px-2 py-1.5 bg-gray-50 border-l border-gray-300 flex items-center justify-center">
                           <Megaphone className="w-4 h-4 text-gray-600" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Contact Role</div>
                      <div className="flex-1">
                        <select
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none bg-no-repeat bg-[right_0.5rem_center]"
                          style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1em'}}
                          value={convertData.contact_role}
                          onChange={e => setConvertData({...convertData, contact_role: e.target.value})}
                        >
                          <option value="">None</option>
                          <option value="decision_maker">Decision Maker</option>
                          <option value="evaluator">Evaluator</option>
                          <option value="influencer">Influencer</option>
                          <option value="champion">Champion</option>
                          <option value="end_user">End User</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <p className="text-[14px] text-gray-800 mb-2">Owner of the New Records</p>
                <div className="text-[14px] text-gray-800">
                  {viewingLead?.assigned_to_full_name || viewingLead?.assigned_to_username || 'Me (current user)'}
                </div>
              </div>

              <div className="pt-6 flex space-x-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-1.5 bg-[#1a56d9] font-medium text-white rounded text-[14px] hover:bg-blue-700 transition-all flex items-center"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Convert
                </button>
                <button
                  type="button"
                  onClick={() => setConvertingLead(false)}
                  className="px-5 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 rounded text-[14px] hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
        
        {/* Right Sidebar Quick Links */}
        <div className="w-64 border-l border-gray-200 bg-[#F9FAFB] p-6 h-[calc(100vh-60px)]">
          <h3 className="text-[14px] font-semibold text-gray-800 mb-4">Quick Links</h3>
          <ul className="space-y-3 text-[13px] text-gray-600">
            <li><button className="hover:text-blue-600 hover:underline">Lead Conversion Mapping</button></li>
            <li><button className="flex items-center hover:text-blue-600 hover:underline"><AlertCircle className="w-4 h-4 mr-1"/> Help</button></li>
          </ul>
        </div>
      </div>
    );
  }

  if (viewingLead) {
    return (
      <LeadDetailView
        lead={viewingLead}
        onBack={() => {
          setViewingLead(null);
          setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.delete('id');
            return newParams;
          });
        }}
        onEdit={() => openEditModal(viewingLead)}
        onDelete={() => { 
          handleDelete(viewingLead.id); 
          setViewingLead(null); 
          setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.delete('id');
            return newParams;
          });
        }}
        onConvert={() => setConvertingLead(true)}
        onStatusChange={async (newStatus) => {
          setViewingLead({ ...viewingLead, status: newStatus });
          try {
            await leadsApi.update(viewingLead.id, { ...viewingLead, status: newStatus });
            fetchLeads();
            addToast('Lead status updated');
          } catch { addToast('Failed to update status', 'error'); }
        }}
        getStatusStyles={getStatusStyles}
        addToast={addToast}
        onRefresh={async () => {
          try {
            const updated = await leadsApi.getById(viewingLead.id);
            setViewingLead(updated);
            fetchLeads(); // Sync main list too
          } catch (err) {
            console.error("Failed to refresh lead", err);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto pb-10">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Leads</h2>
          <div className="flex items-center mt-1 space-x-2">
            <span className="text-sm font-medium text-slate-500">Sales Hub</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-sm font-bold text-blue-600">{totalRecords} Total Prospects</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Quick find..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-64 transition-all"
            />
            {(isSearching || isLoading) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>
          
          <button 
            onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8,name,company,email,status\n" + 
                leads.map(l => `"${l.name || ''}","${l.company || ''}","${l.email || ''}","${l.status || ''}"`).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", "leads.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            title="Download CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <Plus className="mr-2 w-4 h-4" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Filters & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-1 overflow-x-auto">
          <div className="flex items-center px-4 border-r border-slate-100 mr-2">
            <Filter className="w-4 h-4 text-slate-400 mr-2" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</span>
          </div>
          {['All', 'New', 'Contacted', 'Qualified', 'Lost'].map(status => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-between overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Conversion Rate</p>
            <p className="text-2xl font-black text-white mt-1">{conversionStats.conversion_rate}%</p>
            <p className="text-blue-200 text-[10px] mt-0.5">{conversionStats.qualified} of {conversionStats.total} qualified</p>
          </div>
          <div className="relative z-10 h-10 w-24">
             <div className="flex items-end space-x-1 h-full">
                {[20, 40, 30, 60, conversionStats.conversion_rate, 80].map((h, i) => (
                  <div key={i} className="flex-1 bg-white/30 rounded-full" style={{ height: `${Math.max(h, 4)}%` }} />
                ))}
             </div>
          </div>
          <UserPlus className="absolute -right-2 -bottom-2 w-20 h-20 text-white/10" />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
              </div>
            </div>
            <p className="mt-4 text-sm font-bold text-slate-500 animate-pulse uppercase tracking-widest">Gathering Intel...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white z-20">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Synchronization Failed</h3>
            <p className="text-slate-500 mt-2 max-w-xs">{error}</p>
            <button 
              onClick={fetchLeads} 
              className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 transition-all"
            >
              Reconnect
            </button>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white z-20">
             <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
               <Search className="w-10 h-10 text-slate-300" />
             </div>
             <h3 className="text-xl font-bold text-slate-900">No matching prospects</h3>
             <p className="text-slate-500 mt-2 max-w-xs">We couldn't find any leads matching your current criteria.</p>
             <button 
              onClick={() => {setSearchQuery(''); setStatusFilter('All');}} 
              className="mt-6 text-blue-600 font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : null}

        <div className="overflow-auto max-h-[400px] relative">
          <table className="min-w-full divide-y divide-[#0F172A]/20">
            <thead className="bg-[#0F172A] sticky top-0 z-20">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-black text-[#F8FAFC] uppercase tracking-wider"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-[#F8FAFC] divide-y divide-[#0F172A]/20">
              {filteredLeads.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-[#0F172A]/20 transition-colors">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-[#0F172A] font-medium">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={changeRowsPerPage}
        />
      </div>

      {/* Premium Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-10 pb-10 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{selectedLead ? 'Edit Prospect' : 'Add New Lead'}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Lead Management</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddOrEditLead} className="p-8">
               <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-5">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Full Name *</label>
                      <div className="relative">
                        <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field pl-12" placeholder="e.g. John Doe" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email Address *</label>
                      <input required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field" placeholder="john@example.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
                      <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field" placeholder="+1 (555) 000-0000" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Company</label>
                      <input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="input-field" placeholder="Acme Inc." />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Lead Source</label>
                      <select value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} className="input-field appearance-none bg-no-repeat bg-[right_1rem_center]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1em'}}>
                        <option value="website">Website</option>
                        <option value="referral">Referral</option>
                        <option value="cold_call">Cold Call</option>
                        <option value="social_media">Social Media</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>


               </div>

              <div className="pt-8 mt-8 border-t border-slate-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {selectedLead ? 'Update Prospect' : 'Confirm & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationDialog 
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        confirmText="Delete"
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
}
