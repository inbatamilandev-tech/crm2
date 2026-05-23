import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Plus, Clock, Calendar, AlertCircle, X, 
  Trash2, CheckCircle2, ListTodo, MoreHorizontal,
  ChevronRight, Activity, PhoneCall, Mail, FileText, CheckSquare,
  Settings, Zap, List, LayoutGrid, Check, Play, Edit3,
  Video, Users, Loader2, Timer, ArrowRight, History
} from 'lucide-react';
import { tasksApi, leadsApi, dealsApi, meetingsApi } from '../services/api';

import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import MeetingSchedulerModal from '../components/MeetingSchedulerModal';

dayjs.extend(relativeTime);

const TYPE_ICONS = {
  call: <PhoneCall className="w-3.5 h-3.5" />,
  meeting: <Video className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
  follow_up: <Clock className="w-3.5 h-3.5" />,
  proposal: <FileText className="w-3.5 h-3.5" />,
  todo: <CheckSquare className="w-3.5 h-3.5" />,
};

const TYPE_COLORS = {
  call:     'bg-blue-50 text-blue-600 border-blue-200',
  meeting:  'bg-purple-50 text-purple-600 border-purple-200',
  email:    'bg-amber-50 text-amber-600 border-amber-200',
  follow_up:'bg-teal-50 text-teal-600 border-teal-200',
  proposal: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  todo:     'bg-slate-50 text-slate-500 border-slate-200',
};

const OUTCOME_STYLES = {
  interested:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  no_response:    'bg-amber-50 text-amber-700 border-amber-200',
  not_interested: 'bg-rose-50 text-rose-700 border-rose-200',
  success:        'bg-blue-50 text-blue-700 border-blue-200',
  failed:         'bg-slate-100 text-slate-600 border-slate-200',
};

const LOG_COLORS = {
  created:       'bg-blue-500',
  status_change: 'bg-amber-500',
  outcome_change:'bg-purple-500',
  completed:     'bg-emerald-500',
  updated:       'bg-slate-400',
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState('Current Tasks');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [layout, setLayout] = useState('list');
  const [autoMode, setAutoMode] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerLogs, setDrawerLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // For bulk actions/global state
  
  // Realtime Sync Architecture
  const [loadingTaskIds, setLoadingTaskIds] = useState(new Set());
  const pendingSyncRef = useRef(false);
  const latestFetchRef = useRef(0);
  const lastProcessedMessageRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const addLoadingTask = useCallback((id) => {
    setLoadingTaskIds(prev => {
      const next = new Set(prev);
      next.add(String(id));
      return next;
    });
  }, []);

  const removeLoadingTask = useCallback((id) => {
    setLoadingTaskIds(prev => {
      const next = new Set(prev);
      next.delete(String(id));
      return next;
    });
  }, []);

  const isTaskLoading = useCallback((id) => {
    return loadingTaskIds.has(String(id));
  }, [loadingTaskIds]);

  // Deal Creation Flow
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [dealData, setDealData] = useState({ title: '', value: '', expected_close_date: '', lead_id: '' });
  const [isCreatingDeal, setIsCreatingDeal] = useState(false);
  const [projectRequirement, setProjectRequirement] = useState('');
  const [timeline, setTimeline] = useState('');
  const [techStack, setTechStack] = useState('');
  const [dealNotes, setDealNotes] = useState('');

  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);
  const [isMeetingOutcomeModalOpen, setIsMeetingOutcomeModalOpen] = useState(false);
  const [isProposalOutcomeModalOpen, setIsProposalOutcomeModalOpen] = useState(false);

  
  // Timer for live execution in drawer
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
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', due_date: '', priority: 'medium', status: 'not_started', description: '', task_type: 'todo' });

  const { addToast } = useToast();
  const { lastMessage } = useWebSocket();

  const fetchTasks = useCallback(async (silent = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const currentFetchId = ++latestFetchRef.current;
    if (!silent) setIsLoading(true);
    try {
      const data = await tasksApi.getAll({}, { signal: abortController.signal });
      if (!isMountedRef.current) return;
      if (currentFetchId === latestFetchRef.current) {
        const rawTasks = data.results || data;
        const uniqueTasks = [];
        const seenIds = new Set();
        for (const t of rawTasks) {
          if (!seenIds.has(t.id)) {
            seenIds.add(t.id);
            uniqueTasks.push(t);
          }
        }
        setTasks(uniqueTasks);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      if (!silent) addToast("We couldn't fetch your tasks, sorry about that", "error");
    } finally {
      if (isMountedRef.current && currentFetchId === latestFetchRef.current) {
        setIsLoading(false);
      }
    }
  }, [addToast]);

  // Real-time updates sync
  useEffect(() => {
    if (lastMessage) {
      let msgId;
      try {
        const payload = JSON.parse(lastMessage.data);
        msgId = payload.message_id || payload.id || lastMessage.timeStamp;
      } catch {
        msgId = lastMessage.timeStamp;
      }

      if (msgId && msgId !== lastProcessedMessageRef.current) {
        lastProcessedMessageRef.current = msgId;
        // Lock background refreshes during active calls or pending operations
        if (loadingTaskIds.size > 0 || isProcessing || timerRunning) {
          pendingSyncRef.current = true;
        } else {
          fetchTasks(true);
        }
      }
    }
  }, [lastMessage, loadingTaskIds.size, isProcessing, fetchTasks]);

  useEffect(() => {
    if (loadingTaskIds.size === 0 && !isProcessing && !timerRunning && pendingSyncRef.current) {
      pendingSyncRef.current = false;
      fetchTasks(true);
    }
  }, [loadingTaskIds.size, isProcessing, timerRunning, fetchTasks]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await tasksApi.create(newTask);
      addToast("Task added successfully, brilliant!", "success");
      setIsCreateModalOpen(false);
      setNewTask({ title: '', due_date: '', priority: 'medium', status: 'not_started', description: '', task_type: 'todo' });
      fetchTasks();
    } catch (err) {
      addToast("We couldn't add the task, sorry", "error");
    }
  };

  const fetchActivityLogs = useCallback(async (taskId) => {
    if (!taskId) return;
    setLogsLoading(true);
    try {
      const data = await tasksApi.activityLog(taskId);
      setDrawerLogs(Array.isArray(data) ? data : (data.results || []));
    } catch {
      setDrawerLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, []);
  
  // Sync selectedTask when main tasks list changes (to keep drawer fresh)
  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => String(t.id) === String(selectedTask.id));
      
      // Only sync if we're not in the middle of a call to avoid UI resets/jitter
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTask) && !timerRunning) {
        setSelectedTask(updated);
        // Stop timer if status is no longer in_progress (e.g. updated by another user)
        if (updated.status !== 'in_progress' && timerRunning) {
          setTimerRunning(false);
        }
      }
    }
  }, [tasks, selectedTask, timerRunning]);

  const openDrawer = (task) => {
    // Always fetch latest data before opening drawer to avoid stale info
    const latestTask = tasks.find(t => String(t.id) === String(task.id)) || task;
    setSelectedTask(latestTask);
    setIsDrawerOpen(true);
    setDrawerLogs([]);
    setElapsed(0);
    setTimerRunning(latestTask.status === 'in_progress' && latestTask.task_type === 'call');
    fetchActivityLogs(latestTask.id);
  };

  const handleStartCall = async (task) => {
    const strTaskId = String(task.id);
    if (isTaskLoading(strTaskId)) return;
    addLoadingTask(strTaskId);
    
    // Optimistic Update
    const originalTask = tasks.find(t => String(t.id) === strTaskId);
    const previousTask = { ...task };
    setSelectedTask({ ...task, status: 'in_progress' });
    setTasks(prev => prev.map(t => String(t.id) === strTaskId ? { ...t, status: 'in_progress' } : t));

    try {
      await tasksApi.startCall(task.id);
      if (!isMountedRef.current) return;
      setTimerRunning(true);
      setElapsed(0);
      addToast(`Call started: ${task.title}`, 'info');
      // No need to fetchTasks here as we updated optimistically
    } catch {
      if (!isMountedRef.current) return;
      // Rollback
      setSelectedTask(previousTask);
      setTasks(prev => prev.map(t => String(t.id) === strTaskId && originalTask ? originalTask : t));
      addToast('Failed to start call', 'error');
    } finally {
      if (isMountedRef.current) removeLoadingTask(strTaskId);
    }
  };

  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);

  const handleCompleteWithOutcome = async (task, outcome) => {
    if (isSubmittingOutcome) return;
    setIsSubmittingOutcome(true);
    try {
      const res = await tasksApi.completeTask(task.id, { outcome });
      addToast(`Task completed: ${outcome}`, 'success');
      
      // Open Deal Modal for successful meetings
      if (task.task_type === 'meeting' && outcome === 'success' && task.lead) {
        setDealData({
          title: `${task.lead_name || 'Prospect'} Deal`,
          value: '',
          expected_close_date: '',
          lead: task.lead
        });
        setIsDealModalOpen(true);
      }

      if (res.workflow_actions?.length) {
        res.workflow_actions.forEach(a => addToast(`⚡ ${a}`, 'info'));
      }

      // Optimistic update for newly created tasks (instant feedback)
      if (res.new_tasks && res.new_tasks.length > 0) {
        setTasks(prev => {
          const existingIds = new Set(prev.map(t => String(t.id)));
          const uniqueNew = res.new_tasks.filter(t => !existingIds.has(String(t.id)));
          return [...uniqueNew, ...prev];
        });
      }

      setTimerRunning(false);
      fetchTasks(true); // Silent fetch to sync with backend
      setIsDrawerOpen(false);
    } catch {
      addToast('Failed to complete task', 'error');
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!dealData.value || !dealData.expected_close_date) {
      addToast("Please enter deal amount and expected close date.", "error");
      return;
    }
    setIsCreatingDeal(true);
    try {
      const payload = {
        title: dealData.title,
        value: parseFloat(dealData.value),
        expected_close_date: dealData.expected_close_date,
        lead: dealData.lead,
        stage: 'Qualification',
        notes: `Project Requirement: ${projectRequirement}\nTimeline: ${timeline}\nTech Stack: ${techStack}\nNotes: ${dealNotes}`
      };
      
      // We'll use dealsApi.create to create the deal after meeting.
      const createdDeal = await dealsApi.create(payload); 
      addToast("Deal created successfully!", "success");
      
      // Create Proposal Task by repurposing current task and linking the deal
      await tasksApi.update(selectedTask.id, {
        task_type: 'proposal',
        status: 'pending',
        title: 'Send Proposal: ' + (selectedTask.lead_name || 'Prospect'),
        description: 'Prepare and send proposal for the created deal.',
        deal: createdDeal.id
      });
      addToast("Proposal Task Created!", "success");
      
      setIsDealModalOpen(false);
      fetchTasks();
    } catch (err) {
      addToast("Failed to create deal.", "error");
    } finally {
      setIsCreatingDeal(false);
    }
  };

  const handleScheduleMeeting = async (meetingData) => {
    setIsSchedulingMeeting(true);
    try {
      // 1. Create a real Meeting record (for the Meetings module)
      await meetingsApi.create({
        title: meetingData.title,
        start_time: meetingData.meeting_start,
        end_time: meetingData.meeting_end,
        notes: meetingData.notes,
        meeting_type: meetingData.metadata.meeting_type === 'discovery' ? 'Video Call' : 'In Person', 
        object_id: meetingData.lead,
        participants: [selectedTask.owner || 'Sales Rep', meetingData.title.split(': ').pop() || 'Lead'],
      });

      // 2. Update the current task with scheduling info instead of creating a new one
      if (selectedTask) {
        await tasksApi.patch(selectedTask.id, {
          title: meetingData.title,
          due_date: meetingData.meeting_start,
          notes: meetingData.notes,
          task_type: 'meeting',
          metadata: meetingData.metadata
        });
      } else {
        await tasksApi.create(meetingData);
      }
      
      addToast("Meeting scheduled and synced with calendar!", "success");
      setIsMeetingModalOpen(false);
      fetchTasks();
      setIsDrawerOpen(false);
    } catch (err) {
      console.error("Meeting creation error:", err);
      addToast("Failed to schedule meeting", "error");
    } finally {
      setIsSchedulingMeeting(false);
    }
  };



  const handleStatusChange = async (taskId, newStatus) => {
    const strTaskId = String(taskId);
    if (isTaskLoading(strTaskId)) return;
    
    const originalTask = tasks.find(t => String(t.id) === strTaskId);
    const previousSelected = selectedTask ? { ...selectedTask } : null;
    const isActive = newStatus !== 'completed';

    // Optimistic UI update
    setTasks(prevTasks => prevTasks.map(t => 
      String(t.id) === strTaskId 
        ? { ...t, status: newStatus, is_active: isActive } 
        : t
    ));
    
    if (selectedTask && String(selectedTask.id) === strTaskId) {
      setSelectedTask(prev => ({ ...prev, status: newStatus, is_active: isActive }));
    }

    if (newStatus === 'completed' && originalTask && originalTask.task_type === 'meeting') {
      setIsMeetingOutcomeModalOpen(true);
      return;
    }

    addLoadingTask(strTaskId);
    try {
      await tasksApi.patch(taskId, { status: newStatus });
      if (!isMountedRef.current) return;
      addToast(`Status updated to ${newStatus.replace('_', ' ')}`, "success");
      // Silent fetch to sync any backend-side changes (like automation results)
      fetchTasks(true); 
    } catch (err) {
      if (!isMountedRef.current) return;
      // Rollback
      setTasks(prevTasks => prevTasks.map(t => String(t.id) === strTaskId && originalTask ? originalTask : t));
      if (previousSelected && String(previousSelected.id) === strTaskId) {
        setSelectedTask(previousSelected);
      }
      addToast("Failed to update status", "error");
    } finally {
      if (isMountedRef.current) removeLoadingTask(strTaskId);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    
    if (source.droppableId !== destination.droppableId) {
      const newStatus = destination.droppableId;
      handleStatusChange(draggableId, newStatus);
    }
  };

  const handleLeadStageChange = async (leadId, newStage) => {
    if (!leadId) return;
    try {
      await leadsApi.patch(leadId, { status: newStage });
      addToast("Lead stage updated. Automations are running.", "success");
      fetchTasks();
    } catch (err) {
      addToast("We couldn't update the lead stage", "error");
    }
  };

  const handleDelete = async (id) => {
    const strId = String(id);
    if (isTaskLoading(strId)) return;
    if (!window.confirm("Are you sure you'd like to remove this task?")) return;
    
    const originalTask = tasks.find(t => String(t.id) === strId);
    // Optimistic removal (safe ID comparison)
    setTasks(prev => prev.filter(t => String(t.id) !== strId));
    if (selectedTask && String(selectedTask.id) === strId) setIsDrawerOpen(false);

    addLoadingTask(strId);
    try {
      await tasksApi.delete(id);
      if (!isMountedRef.current) return;
      addToast("Task removed successfully", "success");
      // Clean up selection if needed
      setSelectedTasks(prev => prev.filter(tid => String(tid) !== strId));
    } catch (err) {
      if (!isMountedRef.current) return;
      // Rollback
      if (originalTask) setTasks(prev => [...prev, originalTask]);
      if (selectedTask && String(selectedTask.id) === strId) setIsDrawerOpen(true);
      addToast("Failed to remove the task", "error");
    } finally {
      if (isMountedRef.current) removeLoadingTask(strId);
    }
  };

  const toggleTaskSelection = (taskId) => {
    const strTaskId = String(taskId);
    setSelectedTasks(prev => 
      prev.map(String).includes(strTaskId) 
        ? prev.filter(id => String(id) !== strTaskId) 
        : [...prev, strTaskId]
    );
  };

  const selectAllTasks = (currentFilteredTasks) => {
    if (selectedTasks.length === currentFilteredTasks.length && currentFilteredTasks.length > 0) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(currentFilteredTasks.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedTasks.length || isProcessing) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) return;
    
    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const results = await Promise.allSettled(selectedTasks.map(id => tasksApi.delete(id)));
      results.forEach(res => {
        if (res.status === 'fulfilled') successCount++;
        else failCount++;
      });

      if (failCount === 0) {
        addToast(`Successfully deleted ${successCount} tasks`, "success");
      } else {
        addToast(`${successCount} deleted, ${failCount} failed`, failCount > 0 ? "warning" : "success");
      }
      
      setSelectedTasks([]);
      fetchTasks();
    } catch (err) {
      addToast("Bulk delete operation failed", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    if (!selectedTasks.length || isProcessing) return;
    
    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const results = await Promise.allSettled(selectedTasks.map(id => tasksApi.patch(id, { status })));
      results.forEach(res => {
        if (res.status === 'fulfilled') successCount++;
        else failCount++;
      });

      if (failCount === 0) {
        addToast(`Updated ${successCount} tasks to ${status.replace('_', ' ')}`, "success");
      } else {
        addToast(`${successCount} updated, ${failCount} failed`, "warning");
      }
      
      setSelectedTasks([]);
      fetchTasks();
    } catch (err) {
      addToast("Bulk update operation failed", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const recentlyCompletedTasks = useMemo(() => {
    const last24h = dayjs().subtract(24, 'hour');
    return tasks.filter(task => 
      task.status === 'completed' && 
      task.completed_at && 
      dayjs(task.completed_at).isAfter(last24h)
    ).sort((a, b) => dayjs(b.completed_at).valueOf() - dayjs(a.completed_at).valueOf());
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // IMMUNITY: Always show the task if it's currently being worked on by the user
      // This prevents it from disappearing if assignment changes or filters update during a call
      const isBeingWorkedOn = (String(task.id) === String(selectedTask?.id) && timerRunning);
      if (isBeingWorkedOn) return true;

      if (view === 'Recent Activity') return false; // Handled by dedicated section
      if (view === 'Completed Tasks') return task.status === 'completed' || task.is_active === false;

      // For all other views:
      // 1. Hide inactive/completed tasks in List view to keep it clean
      // 2. SHOW them in Kanban view so the "Completed" column isn't empty
      if (layout !== 'kanban' && (task.status === 'completed' || task.is_active === false)) return false;
      
      if (view === 'My Focus Today') {
        const isUrgentOrHigh = ['urgent', 'high'].includes(task.priority);
        const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day');
        const isToday = task.due_date && dayjs(task.due_date).isSame(dayjs(), 'day');
        // Critical actionable tasks only
        return isUrgentOrHigh || isOverdue || isToday;
      }
      if (view === 'My Tasks') return task.assigned_to === user?.id;
      if (view === 'Active Calls') return task.task_type === 'call' && task.status === 'in_progress';
      if (view === 'Overdue Tasks') return task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day');
      if (view === 'Today Tasks') return task.due_date && dayjs(task.due_date).isSame(dayjs(), 'day');
      if (view === 'Current Tasks') return true; // Show all active
      return true;
    }).sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return dayjs(a.due_date).valueOf() - dayjs(b.due_date).valueOf();
    });
  }, [tasks, view, layout]);

  const getPriorityBadge = (prio) => {
    switch(prio) {
      case 'urgent': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-semibold">Urgent</span>;
      case 'high': return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-semibold">High</span>;
      case 'medium': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">Medium</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">Low</span>;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const views = ['My Focus Today', 'My Tasks', 'Active Calls', 'Current Tasks', 'Today Tasks', 'Overdue Tasks', 'Recent Activity', 'Completed Tasks'];

  return (
    <div className="h-full flex bg-slate-50 overflow-hidden font-sans">
      {/* Left Sidebar - Views */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-blue-600 font-bold text-lg">
            <CheckSquare className="w-6 h-6" />
            <span>Tasks</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">Your Views</p>
            <div className="space-y-0.5">
              {views.map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${view === v ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <span className="flex items-center">
                    {v === 'My Focus Today' && <Zap className={`w-4 h-4 mr-2 ${view === v ? 'text-blue-600' : 'text-purple-500'}`} />}
                    {v === 'My Tasks' && <Users className={`w-4 h-4 mr-2 ${view === v ? 'text-blue-600' : 'text-indigo-500'}`} />}
                    {v === 'Active Calls' && <PhoneCall className={`w-4 h-4 mr-2 ${view === v ? 'text-blue-600' : 'text-emerald-500'}`} />}
                    {v === 'Overdue Tasks' && <AlertCircle className={`w-4 h-4 mr-2 ${view === v ? 'text-blue-600' : 'text-rose-500'}`} />}
                    {v === 'Today Tasks' && <Calendar className={`w-4 h-4 mr-2 ${view === v ? 'text-blue-600' : 'text-amber-500'}`} />}
                    {v === 'Current Tasks' && <ListTodo className={`w-4 h-4 mr-2 ${view === v ? 'text-blue-600' : 'text-slate-500'}`} />}
                    {v === 'Recent Activity' && <History className={`w-4 h-4 mr-2 ${view === v ? 'text-blue-600' : 'text-slate-500'}`} />}
                    {v}
                  </span>
                  {view === v && <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 mt-8">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3 flex items-center justify-between">
              Automations
              <Zap className="w-3 h-3" />
            </p>
            <div className="space-y-0.5">
              <button 
                onClick={() => setIsAutomationModalOpen(true)}
                className="w-full flex items-center px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2 text-slate-400" />
                Manage Rules
              </button>
              <button className="w-full flex items-center px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                <Play className="w-4 h-4 mr-2 text-slate-400" />
                Run Macro
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-slate-800">{view}</h1>
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-md">
              <button onClick={() => setLayout('list')} className={`p-1.5 rounded ${layout === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => setLayout('kanban')} className={`p-1.5 rounded ${layout === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {selectedTasks.length > 0 && (
              <div className="flex items-center bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100 mr-2 animate-fade-in">
                <span className="text-sm text-blue-700 font-medium mr-3">{selectedTasks.length} selected</span>
                <div className="flex items-center border-r border-blue-200 pr-2 mr-2">
                  <select 
                    onChange={(e) => handleBulkStatusUpdate(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-blue-700 outline-none cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>Update Status</option>
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <button 
                  onClick={handleBulkDelete}
                  className="text-rose-500 hover:text-rose-700 px-2 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            )}
            <div className="flex items-center space-x-2 mr-4 border-r border-slate-200 pr-4">
              <span className="text-sm font-medium text-slate-600">Auto Mode</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={autoMode} 
                  onChange={() => setAutoMode(!autoMode)} 
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            
            <button 
              onClick={fetchTasks}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="Refresh Tasks"
            >
              <Activity className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => setIsAutomationModalOpen(true)}
              className="inline-flex items-center px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-md font-medium text-sm hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Zap className="mr-2 w-4 h-4 text-amber-500" />
              Automations
            </button>
            {!autoMode && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md font-medium text-sm shadow-sm hover:bg-blue-700 transition-colors"
              >
                <Plus className="mr-2 w-4 h-4" />
                Add Task
              </button>
            )}
          </div>
        </div>

        {/* Task List/Board Area */}
        <div className="flex-1 overflow-auto bg-slate-50/50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <CheckCircle2 className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-lg font-medium text-slate-700">No tasks to show here</p>
              <p className="text-sm mt-1">You're completely up to date! Brilliant.</p>
            </div>
          ) : layout === 'list' ? (
            <div className="min-w-full inline-block align-middle">
              <div className="border-b border-slate-200 shadow-sm">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                          onChange={() => selectAllTasks(filteredTasks)}
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Related To</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredTasks.map((task) => {
                      const isOverdue = task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day') && task.status !== 'completed';
                      return (
                        <tr 
                          key={task.id} 
                          className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${selectedTasks.includes(String(task.id)) ? 'bg-blue-50/50' : ''}`}
                          onClick={() => { setSelectedTask(task); setIsDrawerOpen(true); }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              checked={selectedTasks.includes(String(task.id))}
                              onChange={() => toggleTaskSelection(task.id)}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${TYPE_COLORS[task.task_type] || TYPE_COLORS.todo}`}>
                                  {TYPE_ICONS[task.task_type] || TYPE_ICONS.todo}
                                  {(task.task_type || 'todo').replace('_', ' ')}
                                </span>
                                {isOverdue && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                    <AlertCircle className="w-3 h-3" /> Overdue
                                  </span>
                                )}
                              </div>
                              <span className={`text-sm font-medium ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900 group-hover:text-blue-600 transition-colors'}`}>
                                {task.title}
                              </span>
                              {task.outcome && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border w-fit ${OUTCOME_STYLES[task.outcome] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                  Outcome: {task.outcome.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {task.related_name ? (
                              <div className="text-sm text-slate-700 flex items-center">
                                <div className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold mr-2">
                                  {task.related_name.charAt(0).toUpperCase()}
                                </div>
                                {task.related_name}
                              </div>
                            ) : <span className="text-sm text-slate-400">-</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {task.due_date ? (
                              <div className={`text-sm flex items-center ${isOverdue ? 'text-rose-600 font-medium' : 'text-slate-600'}`}>
                                {isOverdue && <AlertCircle className="w-3.5 h-3.5 mr-1.5" />}
                                {dayjs(task.due_date).format('MMM D, YYYY')}
                              </div>
                            ) : <span className="text-sm text-slate-400">-</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <select
                              value={task.status}
                              disabled={isTaskLoading(task.id)}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full border outline-none cursor-pointer appearance-none transition-opacity ${getStatusColor(task.status)} ${isTaskLoading(task.id) ? 'opacity-50 cursor-wait' : ''}`}
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPriorityBadge(task.priority)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-full flex overflow-x-auto p-6 space-x-6">
              <DragDropContext onDragEnd={onDragEnd}>
                {['not_started', 'in_progress', 'completed'].map(status => (
                  <Droppable key={status} droppableId={status}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-shrink-0 w-80 flex flex-col rounded-xl bg-slate-100/50 border ${snapshot.isDraggingOver ? 'border-blue-300 bg-blue-50/30' : 'border-slate-200'} transition-colors h-full`}
                      >
                        <div className="p-4 border-b border-slate-200/60 flex items-center justify-between bg-white/50 rounded-t-xl">
                          <h3 className="font-semibold text-slate-800 flex items-center capitalize">
                            <div className={`w-2.5 h-2.5 rounded-full mr-2 ${status === 'completed' ? 'bg-emerald-500' : status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                            {status.replace('_', ' ')}
                          </h3>
                          <span className="bg-white text-slate-600 text-xs font-bold px-2 py-1 rounded-md shadow-sm border border-slate-100">
                            {filteredTasks.filter(t => t.status === status).length}
                          </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                          {filteredTasks.filter(t => t.status === status).map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white p-4 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 transition-colors ${snapshot.isDragging ? 'shadow-lg border-blue-400 ring-2 ring-blue-500/20' : 'border-slate-200'}`}
                                  onClick={() => openDrawer(task)}
                                  style={{...provided.draggableProps.style}}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {getPriorityBadge(task.priority)}
                                      {task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day') && task.status !== 'completed' && (
                                        <span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-rose-100 flex items-center">
                                          <AlertCircle className="w-3 h-3 mr-1" /> Overdue
                                        </span>
                                      )}
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-600" onClick={(e) => { e.stopPropagation(); /* Menu logic */ }}>
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                  </div>
                                  
                                  <h4 className={`text-sm font-medium mb-1 ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                    {task.title}
                                  </h4>
                                  
                                  {task.current_step && (
                                    <div className="text-[10px] font-medium text-slate-500 mb-2 flex items-center bg-blue-50 w-fit px-1.5 py-0.5 rounded border border-blue-100">
                                      <Activity className="w-2.5 h-2.5 mr-1 text-blue-500" />
                                      {task.current_step}
                                    </div>
                                  )}
                                  
                                  {task.title.includes('(Auto') && (
                                    <span className="mb-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 w-fit">
                                      <Zap className="w-3 h-3 mr-1" /> System Executed
                                    </span>
                                  )}
                                  
                                  {task.related_name && (
                                    <div className="flex items-center text-xs text-slate-600 mb-3 bg-slate-50 p-1.5 rounded border border-slate-100">
                                      <div className="w-4 h-4 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold mr-1.5 text-[8px]">
                                        {task.related_name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="truncate">{task.related_name}</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                                    <div className="flex items-center">
                                      <Calendar className="w-3.5 h-3.5 mr-1" />
                                      {task.due_date ? dayjs(task.due_date).format('MMM D') : 'No date'}
                                    </div>
                                    {task.owner && (
                                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px]" title={task.owner}>
                                        {task.owner.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </DragDropContext>
            </div>
          )}

          {/* Recently Completed Section (Last 24h) */}
          {(view === 'Current Tasks' || view === 'Recent Activity' || view === 'My Focus Today') && recentlyCompletedTasks.length > 0 && (
            <div className="p-8 border-t border-slate-200 bg-slate-50/30">
              <div className="flex items-center space-x-2 mb-6">
                <div className="p-1.5 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest italic">Recently Completed (Last 24h)</h3>
              </div>
              
              <div className="space-y-3">
                {recentlyCompletedTasks.map(task => (
                  <div 
                    key={`recent-${task.id}`}
                    onClick={() => openDrawer(task)}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all cursor-pointer opacity-80 hover:opacity-100"
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className="flex-shrink-0 p-2 bg-slate-50 rounded-xl group-hover:bg-emerald-50 transition-colors">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-500 line-through truncate group-hover:text-slate-700 transition-colors">{task.title}</h4>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{task.related_name}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-tight border border-emerald-100">
                            {task.outcome?.replace('_', ' ') || 'Finished'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Completed</p>
                      <p className="text-[11px] font-bold text-slate-400">{dayjs(task.completed_at).fromNow()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Drawer */}
      {isDrawerOpen && selectedTask && (
        <div className="fixed top-16 bottom-0 right-0 z-[100] w-full max-w-md bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <button 
                onClick={() => {
                  if (selectedTask.task_type === 'meeting' && selectedTask.status !== 'completed') {
                    setIsMeetingOutcomeModalOpen(true);
                  } else if (selectedTask.task_type === 'proposal' && selectedTask.status !== 'completed') {
                    setIsProposalOutcomeModalOpen(true);
                  } else {
                    handleStatusChange(selectedTask.id, selectedTask.status === 'completed' ? 'in_progress' : 'completed');
                  }
                }}
                disabled={isTaskLoading(selectedTask.id)}
                className={`flex-shrink-0 p-1.5 rounded-md transition-all ${selectedTask.status === 'completed' ? 'text-emerald-600 bg-emerald-100' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'} ${isTaskLoading(selectedTask.id) ? 'opacity-50 animate-pulse' : ''}`}
                title="Mark Complete"
              >
                {isTaskLoading(selectedTask.id) ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              </button>
              <h3 className="text-lg font-semibold text-slate-900 truncate pr-4">{selectedTask.title}</h3>
            </div>
            {timerRunning && (
              <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-black animate-pulse flex items-center border border-rose-200">
                <Timer className="w-3 h-3 mr-1.5" /> {formattedTime}
              </div>
            )}
            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
              <button 
                onClick={() => handleDelete(selectedTask.id)} 
                disabled={isTaskLoading(selectedTask.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors disabled:opacity-30"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button onClick={() => setIsDrawerOpen(false)} className="flex items-center px-2 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors ml-2">
                Back
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Progress Tracker / Stepper UI */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                  <Activity className="w-4 h-4 mr-1.5 text-blue-500" /> Sales Lifecycle
                </p>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200 uppercase tracking-tight">
                  {selectedTask.stage || selectedTask.lead_status || 'In Progress'}
                </span>
              </div>
              <div className="flex items-center justify-between relative px-2">
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 -z-10"></div>
                {[
                  { name: 'Lead', status: 'new' },
                  { name: 'Contacted', status: 'contacted' },
                  { name: 'Follow-up', status: 'follow_up' },
                  { name: 'Meeting', status: 'meeting' },
                  { name: 'Qualified', status: 'qualified' },
                  { name: 'Proposal', status: 'proposal' },
                  { name: 'Closed', status: 'won' },
                ].map((step, index) => {
                  const leadStatus = selectedTask.lead_status || 'new';
                  const taskType = selectedTask.task_type;
                  
                  // Logic to determine if a step is completed, current, or pending
                  const stepOrder = ['new', 'contacted', 'follow_up', 'meeting', 'qualified', 'proposal', 'won', 'lost'];
                  const currentIdx = stepOrder.indexOf(leadStatus);
                  const stepIdx = stepOrder.indexOf(step.status);
                  
                  let state = 'pending';
                  if (stepIdx < currentIdx) state = 'completed';
                  else if (stepIdx === currentIdx || (step.status === 'follow_up' && taskType === 'follow_up') || (step.status === 'meeting' && taskType === 'meeting')) {
                    state = 'current';
                  }

                  return (
                    <div key={index} className="flex flex-col items-center relative z-10">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 mb-1.5 bg-white transition-all ${state === 'completed' ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : state === 'current' ? 'border-blue-600 text-blue-600 shadow-md scale-110' : 'border-slate-200 text-slate-300'}`}>
                        {state === 'completed' ? <Check className="w-3.5 h-3.5" /> : <span className="text-[9px] font-black">{index + 1}</span>}
                      </div>
                      <span className={`text-[8px] font-black text-center whitespace-nowrap uppercase tracking-tighter ${state === 'completed' ? 'text-emerald-700' : state === 'current' ? 'text-blue-700' : 'text-slate-400'}`}>
                        {step.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>


            {/* Execution Controls */}
            {selectedTask.status !== 'completed' && (
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Workflow Execution</p>
                
                {selectedTask.task_type === 'call' && !timerRunning && (
                  <button 
                    onClick={() => handleStartCall(selectedTask)}
                    className="w-full py-3 bg-blue-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Play className="w-4 h-4" /> Start Call Execution
                  </button>
                )}

                {selectedTask.task_type === 'follow_up' && (
                  <div className="space-y-4">
                    <button 
                      onClick={() => setIsMeetingModalOpen(true)}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      <Calendar className="w-4 h-4" /> Schedule Meeting
                    </button>
                    
                    <button 
                      onClick={() => handleCompleteWithOutcome(selectedTask, 'success')}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-white/5 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Quick Complete (Interested)
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleCompleteWithOutcome(selectedTask, 'success')}
                        className="py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-left transition-all border border-white/5 group"
                      >
                        <span className="text-xs font-bold flex items-center gap-2">
                          📝 Send Proposal
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1 font-medium">→ Mark Qualified</span>
                      </button>
                      <button 
                        onClick={() => handleCompleteWithOutcome(selectedTask, 'no_response')}
                        className="py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-left transition-all border border-white/5 group"
                      >
                        <span className="text-xs font-bold flex items-center gap-2">
                          ⏳ Callback Later
                        </span>
                        <span className="text-[9px] text-slate-400 mt-1 font-medium">→ Create Reminder</span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedTask.task_type === 'meeting' && (
                  <div className="space-y-4">
                    <button 
                      onClick={() => setIsMeetingOutcomeModalOpen(true)}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Complete Meeting
                    </button>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                         Identity Sync & Lead Propagation 
                      </p>
                      <p className="text-[8px] text-slate-500 text-center mt-1">
                        Completion triggers automated proposal generation
                      </p>
                    </div>
                  </div>
                )}

                {selectedTask.task_type === 'proposal' && (
                  <div className="space-y-4 mb-4">
                    <button 
                      onClick={() => setIsProposalOutcomeModalOpen(true)}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Complete Proposal Task
                    </button>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                         Deal Lifecycle Progression 
                      </p>
                      <p className="text-[8px] text-slate-500 text-center mt-1">
                        Completion updates deal stage and creates follow-up
                      </p>
                    </div>
                  </div>
                )}

                {!['call', 'follow_up', 'meeting', 'proposal'].includes(selectedTask.task_type) && (
                  <div className="space-y-4 mb-4">
                    <button 
                      onClick={() => handleCompleteWithOutcome(selectedTask, 'success')}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Complete Task
                    </button>
                  </div>
                )}

                {(timerRunning || (selectedTask.status === 'in_progress' && selectedTask.task_type === 'call')) && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-300">Record Outcome:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: 'follow_up',     label: 'Connected',    icon: '✅', nextAction: 'Require Follow-up' },
                        { val: 'no_response',   label: 'No Answer',    icon: '🟡', nextAction: 'Retry Tomorrow' },
                        { val: 'not_interested',label: 'Not Interested',icon: '❌', nextAction: 'Mark Lost' },
                        { val: 'interested',    label: 'Call Later',   icon: '📞', nextAction: 'Manual Sync' },
                      ].map(opt => (
                        <button 
                          key={opt.val}
                          disabled={isSubmittingOutcome}
                          onClick={() => handleCompleteWithOutcome(selectedTask, opt.val)}
                          className="py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-left transition-all border border-white/5 disabled:opacity-50 disabled:cursor-not-allowed group flex flex-col"
                        >
                          <span className="text-xs font-bold flex items-center gap-2">
                            {opt.icon} {opt.label}
                            {isSubmittingOutcome ? <Loader2 className="w-3 h-3 animate-spin ml-auto" /> : <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-1 font-medium italic group-hover:text-slate-300">
                            → {opt.nextAction}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedTask.status === 'completed' && (
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Workflow Execution</p>
                <div className="flex items-center justify-center gap-2 text-emerald-400 py-4">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold text-sm">Task Completed</span>
                </div>
                {selectedTask.outcome && (
                  <p className="text-xs text-slate-400 text-center">
                    Outcome: <span className="font-semibold text-white">{selectedTask.outcome}</span>
                  </p>
                )}
              </div>
            )}


            {/* Meta info grid */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Type</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${TYPE_COLORS[selectedTask.task_type] || TYPE_COLORS.todo}`}>
                  {TYPE_ICONS[selectedTask.task_type] || TYPE_ICONS.todo}
                  {(selectedTask.task_type || 'todo').replace('_', ' ')}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Priority</p>
                <div>{getPriorityBadge(selectedTask.priority)}</div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Due Date</p>
                <p className={`text-sm font-medium ${selectedTask.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-900'}`}>
                  {selectedTask.due_date ? dayjs(selectedTask.due_date).format('MMM D, YYYY h:mm A') : 'None'}
                  {selectedTask.is_overdue && <span className="ml-1 text-[10px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full border border-rose-200 font-black">OVERDUE</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                <p className="text-sm font-medium text-slate-900 capitalize">{selectedTask.status.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Outcome</p>
                {selectedTask.outcome ? (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${OUTCOME_STYLES[selectedTask.outcome] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {selectedTask.outcome.replace('_', ' ')}
                  </span>
                ) : <p className="text-sm text-slate-400 italic">Pending</p>}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Owner</p>
                <p className="text-sm font-medium text-slate-900">{selectedTask.owner || 'Unassigned'}</p>
              </div>
            </div>

            {selectedTask.related_name && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Related To ({selectedTask.lead ? 'Lead' : selectedTask.contact ? 'Contact' : 'Account'})</p>
                <div 
                  onClick={() => {
                    if (selectedTask.lead) navigate(`/leads?id=${selectedTask.lead}`);
                    else if (selectedTask.contact) navigate(`/contacts?id=${selectedTask.contact}`);
                  }}
                  className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-3 rounded-lg cursor-pointer hover:bg-indigo-100 transition-all group"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center font-bold mr-3 group-hover:scale-110 transition-transform">
                      {selectedTask.related_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-indigo-900 group-hover:text-blue-700">{selectedTask.related_name}</p>
                      <p className="text-xs text-indigo-700/70 capitalize">{selectedTask.stage || 'Connected Entity'}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            )}

            {selectedTask.description && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  Description
                  <button className="text-blue-600 hover:text-blue-700"><Edit3 className="w-3.5 h-3.5" /></button>
                </p>
                <div className="text-sm text-slate-700 bg-white p-4 rounded-lg border border-slate-200 shadow-sm whitespace-pre-wrap leading-relaxed">
                  {selectedTask.description}
                </div>
              </div>
            )}

            {/* Real Activity Log */}
            <div className="pt-6 border-t border-slate-100">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <ListTodo className="w-3 h-3" /> Audit Timeline
                </p>
                
                {logsLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading history…
                  </div>
                ) : drawerLogs.length === 0 ? (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center">
                    <p className="text-sm text-slate-400 italic">No history available for this task.</p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                    {drawerLogs.map((log, index) => (
                      <div key={log.id || index} className="relative group">
                        <div className={`absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-white z-10 transition-transform group-hover:scale-125 ${LOG_COLORS[log.action_type] || 'bg-slate-300'}`}></div>
                        
                        <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm group-hover:border-blue-200 group-hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400">
                              {(log.action_type || 'Update').replace(/_/g, ' ')}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                              {dayjs(log.timestamp).fromNow()}
                            </p>
                          </div>
                          <div className="text-xs text-slate-700 leading-relaxed font-medium">
                            {log.notes ? log.notes.split('— outcome:').map((part, i) => 
                              i === 1 ? <span key={i} className="ml-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-bold uppercase text-[9px] border border-blue-100">{part}</span> : part
                            ) : (
                              <span className="italic text-slate-400">Activity logged without notes</span>
                            )}
                            {log.new_value?.status && (
                              <span className="ml-2 px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-bold uppercase text-[8px] border border-amber-100">→ {log.new_value.status.replace(/_/g, ' ')}</span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 border border-slate-200">
                              {(log.user_name || 'S').charAt(0)}
                            </div>
                            <p className="text-[10px] text-slate-500 font-semibold">{log.user_name || 'System Auto-pilot'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Automation Rules Modal */}
      {isAutomationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-amber-500" />
                Workflow Automation Rules
              </h2>
              <button onClick={() => setIsAutomationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
                      <h3 className="font-semibold text-slate-800">Auto-assign Lead Tasks</h3>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded border border-emerald-200">Active</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">When a new Lead is created, automatically generate an initial follow-up task.</p>
                  <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded flex items-center">
                    <span className="font-semibold text-slate-700 mr-2">Trigger:</span> Lead Created 
                    <span className="mx-2">→</span> 
                    <span className="font-semibold text-slate-700 mr-2">Action:</span> Create Task "Initial Outreach"
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
                      <h3 className="font-semibold text-slate-800">Stage Transition Follow-up</h3>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded border border-emerald-200">Active</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">When Lead stage changes to "Proposal", create a reminder to check in after 3 days.</p>
                  <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded flex items-center">
                    <span className="font-semibold text-slate-700 mr-2">Trigger:</span> Stage = Proposal 
                    <span className="mx-2">→</span> 
                    <span className="font-semibold text-slate-700 mr-2">Action:</span> Create Task (+3 days)
                  </div>
                </div>

                <button className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-medium hover:bg-slate-50 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Rule
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
              <button 
                onClick={() => setIsAutomationModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md font-medium text-sm hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Deal Modal (After Meeting Success) */}
      {isDealModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-900">Create Deal</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Record deal details to move to Proposal</p>
              </div>
              <button onClick={() => setIsDealModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateDeal} className="p-8 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Deal Name *</label>
                <input 
                  required 
                  type="text" 
                  value={dealData.title} 
                  onChange={e => setDealData({...dealData, title: e.target.value})} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                  placeholder="e.g. Enterprise Licence Deal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount (₹) *</label>
                  <input 
                    required 
                    type="number" 
                    value={dealData.value} 
                    onChange={e => setDealData({...dealData, value: e.target.value})} 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Expected Close *</label>
                  <input 
                    required 
                    type="date" 
                    value={dealData.expected_close_date} 
                    onChange={e => setDealData({...dealData, expected_close_date: e.target.value})} 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Project Requirement</label>
                <textarea 
                  value={projectRequirement} 
                  onChange={e => setProjectRequirement(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                  placeholder="e.g. Enterprise CRM with custom workflows"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Timeline</label>
                  <input 
                    type="text" 
                    value={timeline} 
                    onChange={e => setTimeline(e.target.value)} 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                    placeholder="e.g. 3 months"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tech Stack</label>
                  <input 
                    type="text" 
                    value={techStack} 
                    onChange={e => setTechStack(e.target.value)} 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                    placeholder="e.g. React, Node"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Notes</label>
                <textarea 
                  value={dealNotes} 
                  onChange={e => setDealNotes(e.target.value)} 
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button 
                  type="submit" 
                  disabled={isCreatingDeal}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {isCreatingDeal ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2 fill-current" />}
                  Create Deal & Continue
                </button>
                <button 
                  type="button"
                  onClick={() => setIsDealModalOpen(false)}
                  className="w-full py-3 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <Plus className="w-5 h-5 mr-2 text-blue-600" />
                Create New Task
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input 
                    required 
                    type="text" 
                    value={newTask.title} 
                    onChange={e => setNewTask({...newTask, title: e.target.value})} 
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="E.g., Ring the prospect about pricing"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                    <input 
                      type="date" 
                      value={newTask.due_date} 
                      onChange={e => setNewTask({...newTask, due_date: e.target.value})} 
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                    <select 
                      value={newTask.priority} 
                      onChange={e => setNewTask({...newTask, priority: e.target.value})} 
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Task Type</label>
                    <select 
                      value={newTask.task_type} 
                      onChange={e => setNewTask({...newTask, task_type: e.target.value})} 
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="todo">To-Do</option>
                      <option value="call">Call</option>
                      <option value="meeting">Meeting</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select 
                      value={newTask.status} 
                      onChange={e => setNewTask({...newTask, status: e.target.value})} 
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea 
                    rows={4} 
                    value={newTask.description} 
                    onChange={e => setNewTask({...newTask, description: e.target.value})} 
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add more details here..."
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)} 
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meeting Scheduler Modal */}
      {isMeetingModalOpen && (
        <MeetingSchedulerModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          onSchedule={handleScheduleMeeting}
          leadName={selectedTask?.lead_name || 'Prospect'}
          leadId={selectedTask?.lead}
          isSubmitting={isSchedulingMeeting}
        />
      )}      {/* Meeting Outcome Modal */}
      {isMeetingOutcomeModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setIsMeetingOutcomeModalOpen(false)} />
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Meeting Outcome</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Lifecycle Propagation Sync</p>
              </div>
              <button onClick={() => setIsMeetingOutcomeModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-400 hover:text-rose-500 transition-all shadow-sm">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-8 space-y-3">
              {[
                { val: 'success',           label: 'Interested',       icon: '💎', color: 'blue',   desc: 'Qualified lead & prepare proposal' },
                { val: 'success',           label: 'Proposal Required',icon: '📝', color: 'emerald',desc: 'Triggers proposal generation' },
                { val: 'interested',        label: 'Follow-up Needed', icon: '⏳', color: 'amber',  desc: 'Creates a new follow-up task' },
                { val: 'not_interested',    label: 'Not Interested',   icon: '❌', color: 'rose',   desc: 'Marks lead as Lost' },
              ].map(opt => (
                <button 
                  key={opt.label}
                  onClick={() => {
                    handleCompleteWithOutcome(selectedTask, opt.val);
                    setIsMeetingOutcomeModalOpen(false);
                  }}
                  className={`w-full p-4 rounded-2xl border-2 border-slate-50 hover:border-slate-200 hover:bg-slate-50 transition-all text-left flex items-start gap-4 group`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shadow-sm border border-slate-200 group-hover:scale-110 transition-transform`}>
                    {opt.icon}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{opt.label}</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-0.5 uppercase tracking-tighter">{opt.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 ml-auto self-center text-slate-300 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
            
            <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Select outcome to proceed</p>
            </div>
          </div>
        </div>
      )}

      {isProposalOutcomeModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setIsProposalOutcomeModalOpen(false)} />
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Select Next Deal Stage</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Deal Lifecycle Progression</p>
              </div>
              <button onClick={() => setIsProposalOutcomeModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-400 hover:text-rose-500 transition-all shadow-sm">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-8 space-y-3 overflow-y-auto max-h-[60vh]">
              {[
                { val: 'Qualification',               label: 'Qualification',               icon: '🎯', color: 'blue',   desc: 'Update deal to Qualification' },

                { val: 'Needs Analysis',              label: 'Needs Analysis',              icon: '🔍', color: 'cyan',   desc: 'Update deal to Needs Analysis' },
                { val: 'Value Proposition',           label: 'Value Proposition',           icon: '💡', color: 'indigo', desc: 'Update deal to Value Proposition' },
                { val: 'Identify Decision Makers',    label: 'Identify Decision Makers',    icon: '👥', color: 'violet', desc: 'Update deal to Identify Decision Makers' },
                { val: 'Proposal/Price Quote',        label: 'Proposal/Price Quote',        icon: '📄', color: 'purple', desc: 'Update deal to Proposal/Price Quote' },
                { val: 'Negotiation/Review',          label: 'Negotiation/Review',          icon: '🤝', color: 'amber',  desc: 'Update deal to Negotiation/Review' },
                { val: 'Closed Won',                  label: 'Closed Won',                  icon: '🎉', color: 'emerald',desc: 'Mark Lead Won \u0026 Deal Closed Won' },
                { val: 'Closed Lost',                 label: 'Closed Lost',                 icon: '❌', color: 'rose',   desc: 'Mark Lead Lost \u0026 Deal Closed Lost' },
                { val: 'Closed Lost to Competition',    label: 'Closed Lost to Competition',       icon: '🏳️', color: 'red',    desc: 'Mark Lost to Competition' },
              ].map(opt => (
                <button 
                  key={opt.label}
                  onClick={() => {
                    handleCompleteWithOutcome(selectedTask, opt.val);
                    setIsProposalOutcomeModalOpen(false);
                    addToast(`Deal moved to ${opt.val}`, 'success');
                  }}
                  className={`w-full p-4 rounded-2xl border-2 border-slate-50 hover:border-slate-200 hover:bg-slate-50 transition-all text-left flex items-start gap-4 group`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg shadow-sm border border-slate-200 group-hover:scale-110 transition-transform`}>
                    {opt.icon}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{opt.label}</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-0.5 uppercase tracking-tighter">{opt.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 ml-auto self-center text-slate-300 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
            
            <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-center">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Select outcome to proceed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
