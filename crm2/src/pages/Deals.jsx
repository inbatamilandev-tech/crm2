import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { dealsApi, contactsApi } from '../services/api';
import confetti from 'canvas-confetti';
import {
  Plus, Loader2, Search, Briefcase,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../context/WebSocketContext';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Pipeline stages (mirrors backend STAGE_PROBABILITY_MAP) ─────────────────
const STAGES = [
  { id: 'qualification',            title: 'Qualification',            color: 'bg-blue-500' },
  { id: 'needs_analysis',           title: 'Needs Analysis',           color: 'bg-cyan-500' },
  { id: 'value_proposition',        title: 'Value Proposition',        color: 'bg-indigo-500' },
  { id: 'identify_decision_makers', title: 'Identify Decision Makers', color: 'bg-violet-500' },
  { id: 'proposal',                 title: 'Proposal/Price Quote',     color: 'bg-purple-500' },
  { id: 'negotiation',              title: 'Negotiation/Review',       color: 'bg-amber-500' },
  { id: 'closed_won',               title: 'Closed Won',               color: 'bg-emerald-500' },
  { id: 'closed_lost',              title: 'Closed Lost',              color: 'bg-rose-500' },
  { id: 'closed_lost_to_competition', title: 'Closed Lost to Competition', color: 'bg-red-600' },
];

const PROBABILITY_MAP = {
  'qualification': 10,
  'needs_analysis': 25,
  'value_proposition': 40,
  'identify_decision_makers': 40,
  'proposal': 60,
  'negotiation': 80,
  'closed_won': 100,
  'closed_lost': 0,
  'closed_lost_to_competition': 0
};


const getFutureDate = (days = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

const EMPTY_FORM = {
  title: '',
  contact: '',
  value: '1000',
  stage: 'proposal',
  expected_close_date: getFutureDate(30),
};

// ─── Memoized Deal Card Component ──────────────────────────────────────────────
const DealCard = memo(({ deal, isOverlay = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: deal.id,
    data: {
      type: 'Deal',
      deal,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-slate-100/50 p-4 rounded-2xl border border-dashed border-slate-300 h-[160px] opacity-50"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white p-4 rounded-2xl border transition-all duration-200 group cursor-grab active:cursor-grabbing ${
        isOverlay 
          ? 'shadow-2xl border-blue-400 scale-[1.03] rotate-1 ring-4 ring-blue-500/10' 
          : 'border-slate-100 shadow-sm hover:border-slate-200 hover:shadow-md'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
          {deal.name}
        </h4>
      </div>
      <div className="flex items-center text-[11px] font-medium text-slate-500 mb-2">
        <Briefcase className="w-3 h-3 mr-1.5 opacity-50" />
        {deal.company}
      </div>

      {deal.requirement && (
        <div className="text-[10px] text-slate-600 mb-2 line-clamp-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
          <span className="font-bold text-slate-400 uppercase text-[8px] tracking-widest block mb-0.5">Requirement</span>
          {deal.requirement}
        </div>
      )}
      
      <div className="flex items-center gap-3 mb-3">
        {deal.timeline && (
          <div className="text-[10px] text-slate-500">
            <span className="font-bold text-slate-400 uppercase text-[8px] tracking-widest mr-1">Timeline:</span>
            {deal.timeline}
          </div>
        )}
        
        {deal.techStack && (
          <div className="text-[10px] text-slate-500">
            <span className="font-bold text-slate-400 uppercase text-[8px] tracking-widest mr-1">Tech:</span>
            {deal.techStack}
          </div>
        )}
      </div>
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Win probability</span>
          <span className="text-[9px] font-black text-slate-600">{deal.probability}%</span>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              deal.probability === 100 ? 'bg-emerald-500' :
              deal.probability === 0 ? 'bg-rose-400' :
              deal.probability >= 70 ? 'bg-amber-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${deal.probability}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Value</span>
          <span className="text-sm font-black text-slate-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(deal.amount)}</span>
        </div>
        <div className="w-7 h-7 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-[10px] font-black text-blue-600 shadow-sm">
          {deal.ownerInitial}
        </div>
      </div>
    </div>
  );
});

// ─── Memoized Kanban Column Component ──────────────────────────────────────────
const KanbanColumn = memo(({ column, deals, stageInfo, isOver }) => {
  const colValue = useMemo(() => deals.reduce((s, d) => s + (d?.amount || 0), 0), [deals]);

  const {
    setNodeRef,
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  return (
    <div className="w-[300px] flex-shrink-0 flex flex-col max-h-full">
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex flex-col">
          <div className="flex items-center space-x-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${stageInfo?.color}`} />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">{column?.title}</h3>
            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{deals.length}</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 pl-4">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(colValue)} Target</span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto custom-scrollbar rounded-[20px] p-2 space-y-3 transition-all duration-200 min-h-[200px] border-2 ${
          isOver 
            ? 'bg-blue-50/80 border-blue-300 ring-4 ring-blue-500/5' 
            : 'bg-slate-50/60 border-transparent'
        }`}
      >
        <SortableContext items={column.dealIds} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {deals.map((deal) => (
              <motion.div
                key={deal.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <DealCard deal={deal} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>
    </div>
  );
});

// ─── Main Deals Component ──────────────────────────────────────────────────────
export default function Deals() {
  const [data, setData]           = useState({ columns: {}, columnOrder: [], deals: {} });
  const [contacts, setContacts]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimer, setSearchTimer] = useState(null);
  const [activeDeal, setActiveDeal]   = useState(null);
  const [originalStage, setOriginalStage] = useState(null);

  // ── New Deal modal state ────────────────────────────────────────────────────
  const [showModal, setShowModal]     = useState(false);
  const [formData, setFormData]       = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { addToast } = useToast();
  const { lastMessage } = useWebSocket();

  // ─── Sensors ───────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ─── Pipeline data builder ──────────────────────────────────────────────────
  const buildKanban = useCallback((fetchedDeals) => {
    const columns = {};
    STAGES.forEach(s => {
      columns[s.id] = { id: s.id, title: s.title, dealIds: [] };
    });

    const stageMap = {
      'Proposal/Price Quote': 'proposal',
      'Negotiation/Review': 'negotiation',
      'Closed Won': 'closed_won',
      'Closed Lost': 'closed_lost',
      'Closed Lost to Competition': 'closed_lost_to_competition',
      'Qualification': 'qualification',
      'Needs Analysis': 'needs_analysis',
      'Value Proposition': 'value_proposition',
      'Identify Decision Makers': 'identify_decision_makers'
    };

    const dealsMap = {};
    fetchedDeals.forEach(deal => {
      const id = String(deal.id);
      const stageId = stageMap[deal.stage] || (deal.stage || 'qualification').toLowerCase();
      
      const notes = deal.notes || '';
      const requirement = notes.match(/Project Requirement: ([^\n]*)/)?.[1] || '';
      const timeline = notes.match(/Timeline: ([^\n]*)/)?.[1] || '';
      const techStack = notes.match(/Tech Stack: ([^\n]*)/)?.[1] || '';
      
      dealsMap[id] = {
        id,
        name: deal.title,
        amount: parseFloat(deal.value || 0),
        company: deal.company_name || deal.contact_name || '—',
        owner: deal.owner_full_name || deal.owner_username || '?',
        ownerInitial: (deal.owner_full_name || deal.owner_username || '?')[0].toUpperCase(),
        stage: stageId,
        probability: deal.probability ?? PROBABILITY_MAP[stageId] ?? 0,
        expectedClose: deal.expected_close_date || 'TBD',
        requirement,
        timeline,
        techStack,
      };

      const col = columns[stageId] ?? columns['proposal'] ?? Object.values(columns)[0];
      col.dealIds.push(id);
    });

    return {
      columns,
      columnOrder: STAGES.map(s => s.id),
      deals: dealsMap,
    };
  }, []);

  // ─── Fetch deals ─────────────────────────────────────────────────────────────
  const fetchDeals = useCallback(async (query = '', isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const response = query
        ? await dealsApi.search(query)
        : await dealsApi.getAll();
      const fetched = response.results ?? response;
      setData(buildKanban(fetched));
      setError(null);
    } catch {
      setError('Failed to synchronize pipeline data');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [buildKanban]);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await contactsApi.getAll();
      setContacts(res.results ?? res);
    } catch { }
  }, []);

  useEffect(() => {
    fetchDeals();
    fetchContacts();
  }, [fetchDeals, fetchContacts]);

  useEffect(() => {
    if (lastMessage && (lastMessage.model === 'Deal' || lastMessage.model === 'Task') && !isSyncing && !activeDeal) {
      fetchDeals(searchQuery, true);
    }
  }, [lastMessage, searchQuery, fetchDeals, isSyncing, activeDeal]);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimer) clearTimeout(searchTimer);
    setSearchTimer(setTimeout(() => fetchDeals(q), 400));
  };

  // ─── Helper: Find column of an item ──────────────────────────────────────────
  const findColumn = useCallback((id) => {
    if (id in data.columns) return id;
    const strId = String(id);
    return Object.keys(data.columns).find(key => data.columns[key].dealIds.includes(strId));
  }, [data.columns]);

  // ─── Drag Handlers ──────────────────────────────────────────────────────────
  const onDragStart = ({ active }) => {
    const deal = data.deals[active.id];
    setActiveDeal(deal);
    setOriginalStage(deal.stage);
  };

  const onDragOver = ({ active, over }) => {
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const activeColId = findColumn(activeId);
    const overColId = over.data.current?.type === 'Column' ? overId : findColumn(overId);

    if (!activeColId || !overColId || activeColId === overColId) return;

    setData(prev => {
      const activeItems = prev.columns[activeColId].dealIds;
      const overItems = prev.columns[overColId].dealIds;

      const activeIndex = activeItems.indexOf(activeId);
      const overIndex = over.data.current?.type === 'Column' 
        ? overItems.length 
        : overItems.indexOf(overId);

      return {
        ...prev,
        columns: {
          ...prev.columns,
          [activeColId]: {
            ...prev.columns[activeColId],
            dealIds: activeItems.filter(id => id !== activeId),
          },
          [overColId]: {
            ...prev.columns[overColId],
            dealIds: [
              ...overItems.slice(0, overIndex),
              activeId,
              ...overItems.slice(overIndex),
            ],
          },
        },
        deals: {
          ...prev.deals,
          [activeId]: {
            ...prev.deals[activeId],
            stage: overColId,
            probability: PROBABILITY_MAP[overColId] ?? prev.deals[activeId].probability,
          }
        }
      };
    });
  };

  const onDragEnd = async ({ active, over }) => {
    const activeId = String(active.id);
    const startStage = originalStage;
    setActiveDeal(null);
    setOriginalStage(null);
    
    if (!over) {
      if (startStage) fetchDeals(searchQuery);
      return;
    }

    const overId = String(over.id);
    const activeColId = findColumn(activeId);
    const overColId = over.data.current?.type === 'Column' ? overId : findColumn(overId);

    if (!activeColId || !overColId) return;

    // Handle reordering within same column
    if (activeColId === overColId && activeId !== overId) {
      setData(prev => {
        const items = prev.columns[activeColId].dealIds;
        const oldIndex = items.indexOf(activeId);
        const newIndex = items.indexOf(overId);

        return {
          ...prev,
          columns: {
            ...prev.columns,
            [activeColId]: {
              ...prev.columns[activeColId],
              dealIds: arrayMove(items, oldIndex, newIndex),
            },
          },
        };
      });
    }

    // Call API if stage changed from the original start stage
    const finalStage = overColId;
    if (finalStage === startStage) return;

    setIsSyncing(true);
    
    if (finalStage === 'closed_won') {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#10b981', '#f59e0b']
      });
    }

    try {
      await dealsApi.patch(activeId, { stage: finalStage });
      addToast(`Pipeline updated: ${STAGES.find(s => s.id === finalStage)?.title}`, 'success');
    } catch (err) {
      const errorDetail = err.response?.data?.detail || "Sync failed — reverting";
      addToast(errorDetail, 'error');
      fetchDeals(searchQuery);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    
    const valueNum = parseFloat(formData.value);
    if (!formData.title.trim() || !formData.contact) {
      addToast('Title and Contact are required', 'error');
      return;
    }
    if (isNaN(valueNum) || valueNum <= 0) {
      addToast('Deal value must be greater than zero', 'error');
      return;
    }
    if (!formData.expected_close_date) {
      addToast('Expected close date is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await dealsApi.create({
        title: formData.title.trim(),
        contact: formData.contact,
        value: valueNum,
        stage: formData.stage,
        expected_close_date: formData.expected_close_date,
      });
      addToast('Deal created successfully');
      setShowModal(false);
      setFormData(EMPTY_FORM);
      fetchDeals(searchQuery);
    } catch (err) {
      console.error('Deal creation failed:', err.response?.data);
      const errors = err.response?.data;
      if (errors && typeof errors === 'object') {
        const firstError = Object.values(errors).flat()[0];
        addToast(firstError || 'Failed to create deal', 'error');
      } else {
        addToast('Failed to create deal', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalValue = useMemo(() => Object.values(data.deals).reduce((s, d) => s + (d.amount || 0), 0), [data.deals]);
  const totalDeals = useMemo(() => Object.keys(data.deals).length, [data.deals]);

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

  return (
    <div className="space-y-8 animate-fade-in h-full flex flex-col max-w-[1800px] mx-auto pb-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Deals</h2>
          <div className="flex items-center mt-1 space-x-2">
            <span className="text-sm font-medium text-slate-500">Sales Pipeline</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <div className="flex items-center bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
               <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{totalDeals} Deals Active</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <div className="flex items-center bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalValue)} Pipeline Value</span>
            </div>
            <div className="ml-4 flex items-center bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
               <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{isSyncing ? 'Syncing...' : 'Live Pipeline Sync'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-64 transition-all"
            />
          </div>
          <button
            onClick={() => { setFormData(EMPTY_FORM); setShowModal(true); }}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="mr-2 w-4 h-4" />
            New Deal
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto pb-4 relative custom-scrollbar">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/50 z-20 backdrop-blur-[2px]">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          <div className="flex space-x-5 h-full items-start min-w-max p-1">
            {data.columnOrder.map(columnId => {
              const column = data.columns[columnId];
              const deals = (column?.dealIds ?? []).map(id => data.deals[id]).filter(Boolean);
              const stageInfo = STAGES.find(s => s.id === columnId);

              return (
                <KanbanColumn
                  key={columnId}
                  column={column}
                  deals={deals}
                  stageInfo={stageInfo}
                  isOver={activeDeal && (findColumn(activeDeal.id) === columnId)}
                />
              );
            })}
          </div>

          <DragOverlay dropAnimation={dropAnimation}>
            {activeDeal ? (
              <DealCard deal={activeDeal} isOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* New Deal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isSubmitting && setShowModal(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 p-8"
          >
            <h3 className="text-2xl font-black text-slate-900 mb-6">New Deal</h3>
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deal Title</label>
                <input type="text" placeholder="e.g. Enterprise Licence" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact</label>
                <select value={formData.contact} onChange={e => setFormData(p => ({ ...p, contact: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all">
                  <option value="">Select Contact</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Value (₹)</label>
                  <input type="number" placeholder="0.00" value={formData.value} onChange={e => setFormData(p => ({ ...p, value: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expected Close</label>
                  <input type="date" value={formData.expected_close_date} onChange={e => setFormData(p => ({ ...p, expected_close_date: e.target.value }))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Deal'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
