import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Play, Search, Plus, Trash2, Settings, 
  Mail, CheckSquare, RefreshCw, Zap, Filter, LayoutGrid, Clock, XCircle
} from 'lucide-react';
import { workflowsApi } from '../../../services/api';
import { INPUT_STYLE } from '../../../utils/themeUtils';
import ConfirmationDialog from '../../../components/ConfirmationDialog';

// --- CONFIGURATION SCHEMAS --- //
const MODULES = ['lead', 'deal', 'task', 'contact', 'invoice', 'case'];
const TRIGGERS = {
  lead: ['CREATED', 'UPDATED', 'DELETED', 'STATUS_CHANGED'],
  deal: ['CREATED', 'STAGE_CHANGED', 'WON', 'LOST'],
  task: ['CREATED', 'COMPLETED', 'OVERDUE'],
  case: ['CREATED', 'UPDATED', 'CLOSED', 'ESCALATED']
};

const ACTION_TYPES = [
  { type: 'SEND_EMAIL', label: 'Send Email', icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { type: 'CREATE_TASK', label: 'Create Task', icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { type: 'UPDATE_STATUS', label: 'Update Status', icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { type: 'ASSIGN_ROUND_ROBIN', label: 'Round Robin Assignment', icon: LayoutGrid, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { type: 'WEBHOOK', label: 'Trigger Webhook', icon: Zap, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  { type: 'DELAY', label: 'Time Delay', icon: Clock, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
];

const OPERATORS = ['==', '!=', '>', '<', '>=', '<=', 'contains', 'icontains', 'in', 'isnull'];

export default function WorkflowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  
  // Selection State
  const [selectedNode, setSelectedNode] = useState(null); // 'trigger', 'condition_X', 'action_X'
  
  // Workflow State
  const [workflow, setWorkflow] = useState({
    name: 'New Workflow',
    description: '',
    module: 'lead',
    trigger_event: 'CREATED',
    is_active: false,
    status: 'DRAFT',
    version: 1,
    condition_logic: 'AND'
  });
  const [conditions, setConditions] = useState([]);
  const [actions, setActions] = useState([]);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  useEffect(() => {
    if (isEdit) {
      fetchWorkflow();
    } else {
      setSelectedNode('trigger');
    }
  }, [id]);

  const fetchWorkflow = async () => {
    try {
      setLoading(true);
      const data = await workflowsApi.getById(id);
      setWorkflow({
        name: data.name,
        description: data.description,
        module: data.module,
        trigger_event: data.trigger_event,
        is_active: data.is_active,
        status: data.status || 'DRAFT',
        version: data.version || 1,
        condition_logic: data.condition_logic || 'AND'
      });
      setConditions(data.conditions || []);
      setActions(data.actions || []);
      setSelectedNode('trigger');
    } catch (error) {
      console.error("Failed to fetch workflow", error);
      navigate('/settings/workflows');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setDialogConfig({
      isOpen: true,
      title: "Publish Workflow",
      description: "Publishing will make this version active and archive the previous version. Proceed?",
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        try {
          setSaving(true);
          await workflowsApi.publish(id);
          fetchWorkflow(); // Refresh to get PUBLISHED status
        } catch (error) {
          console.error("Failed to publish", error);
          setDialogConfig({
            isOpen: true,
            title: "Error",
            description: "Failed to publish workflow.",
            onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
          });
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleCreateDraft = async () => {
    try {
      setSaving(true);
      const res = await workflowsApi.createDraft(id);
      navigate(`/settings/workflows/${res.id}`);
      window.location.reload(); // Quick refresh to load new ID
    } catch (error) {
      console.error("Failed to create draft", error);
      setDialogConfig({
        isOpen: true,
        title: "Error",
        description: "Failed to create draft.",
        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        ...workflow,
        conditions: conditions.map((c, i) => ({ ...c, order: i })),
        actions: actions.map((a, i) => ({ ...a, order: i }))
      };

      if (isEdit) {
        await workflowsApi.update(id, payload);
        setDialogConfig({
          isOpen: true,
          title: "Success",
          description: "Draft saved successfully!",
          onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
        });
      } else {
        const res = await workflowsApi.create(payload);
        navigate(`/settings/workflows/${res.id}`);
      }
    } catch (error) {
      console.error("Failed to save workflow", error);
      setDialogConfig({
        isOpen: true,
        title: "Validation Error",
        description: "Please ensure all required fields are filled out.",
        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setSaving(false);
    }
  };

  // --- ACTIONS BUILDER LOGIC --- //
  const addAction = (actionType) => {
    const newAction = {
      action_type: actionType.type,
      assignment_type: 'SPECIFIC_USER',
      action_data: {}
    };
    setActions([...actions, newAction]);
    setSelectedNode(`action_${actions.length}`);
  };

  const updateAction = (index, key, value) => {
    const updated = [...actions];
    if (key.startsWith('data.')) {
      const dataKey = key.split('.')[1];
      updated[index].action_data = { ...updated[index].action_data, [dataKey]: value };
    } else {
      updated[index][key] = value;
    }
    setActions(updated);
  };

  const removeAction = (index) => {
    setActions(actions.filter((_, i) => i !== index));
    setSelectedNode(null);
  };

  // --- CONDITIONS BUILDER LOGIC --- //
  const addCondition = () => {
    setConditions([...conditions, { field_name: '', operator: '==', value: '' }]);
    setSelectedNode(`condition_${conditions.length}`);
  };

  const updateCondition = (index, key, value) => {
    const updated = [...conditions];
    updated[index][key] = value;
    setConditions(updated);
  };

  const removeCondition = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
    setSelectedNode('trigger');
  };

  if (loading) return <div className="p-8 text-center">Loading builder...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -m-8">
      
      {/* TOP BAR */}
      <div className="h-16 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 flex items-center justify-between px-6 flex-shrink-0 z-10">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/settings/workflows')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <input 
            type="text" 
            value={workflow.name} 
            onChange={(e) => setWorkflow({...workflow, name: e.target.value})}
            className="text-lg font-black bg-transparent border-none focus:outline-none focus:ring-0 text-slate-800 dark:text-white"
            placeholder="Workflow Name"
          />
          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${workflow.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
            {workflow.status} (v{workflow.version})
          </span>
        </div>
        <div className="flex items-center space-x-3">
          {workflow.status === 'PUBLISHED' ? (
            <button 
              onClick={handleCreateDraft}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Create New Draft
            </button>
          ) : (
            <>
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </button>
              {isEdit && (
                <button 
                  onClick={handlePublish}
                  disabled={saving}
                  className="flex items-center px-6 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Publish
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 3-PANEL LAYOUT */}
      <div className="flex flex-1 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
        
        {/* LEFT PANEL: Library */}
        <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/5 flex flex-col z-10 shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Action Library</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input type="text" placeholder="Search actions..." className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:border-[#50B1B9]" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {ACTION_TYPES.map(action => (
              <button 
                key={action.type}
                onClick={() => addAction(action)}
                className="w-full flex items-center p-3 mb-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${action.bg} ${action.color}`}>
                  <action.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#095D95] dark:group-hover:text-[#50B1B9] transition-colors">{action.label}</p>
                </div>
                <Plus className="w-4 h-4 ml-auto text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>

        {/* CENTER PANEL: Visual Builder */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center relative">
          
          <div className="w-full max-w-xl pb-32">
            {/* TRIGGER NODE */}
            <div 
              onClick={() => setSelectedNode('trigger')}
              className={`relative bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 transition-all cursor-pointer shadow-sm ${selectedNode === 'trigger' ? 'border-[#095D95] dark:border-[#50B1B9] ring-4 ring-[#095D95]/10 shadow-md transform scale-[1.01]' : 'border-slate-200 dark:border-white/5 hover:border-slate-300'}`}
            >
              <div className="flex items-center mb-2">
                <div className="w-8 h-8 bg-[#DF7F09]/10 rounded-lg flex items-center justify-center mr-3">
                  <Zap className="w-4 h-4 text-[#DF7F09]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Workflow Trigger</h4>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">When {workflow.module} is {workflow.trigger_event}</p>
                </div>
              </div>
            </div>

            <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600 mx-auto"></div>

            {/* CONDITIONS BLOCK */}
            <div 
              onClick={() => setSelectedNode('condition_0')}
              className={`relative bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 transition-all cursor-pointer shadow-sm ${selectedNode?.startsWith('condition') ? 'border-[#50B1B9] ring-4 ring-[#50B1B9]/10 shadow-md transform scale-[1.01]' : 'border-slate-200 dark:border-white/5 hover:border-slate-300'}`}
            >
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-[#50B1B9]/10 rounded-lg flex items-center justify-center mr-3">
                  <Filter className="w-4 h-4 text-[#50B1B9]" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Entry Conditions</h4>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    {conditions.length === 0 ? "Always run (no conditions)" : `Run if ${conditions.length} condition(s) are met`}
                  </p>
                </div>
              </div>
              {conditions.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
                  {conditions.map((c, i) => (
                    <div key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-center">
                      <span className="font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm mr-2">{c.field_name || '?'}</span>
                      <span className="font-bold text-[#DF7F09] mr-2">{c.operator}</span>
                      <span className="font-mono bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-sm">"{c.value}"</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ACTIONS LIST */}
            {actions.map((action, index) => {
              const ActionDef = ACTION_TYPES.find(a => a.type === action.action_type) || ACTION_TYPES[0];
              const isSelected = selectedNode === `action_${index}`;
              
              return (
                <React.Fragment key={index}>
                  <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600 mx-auto"></div>
                  <div 
                    onClick={() => setSelectedNode(`action_${index}`)}
                    className={`relative bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 transition-all cursor-pointer shadow-sm ${isSelected ? `border-[#095D95] ring-4 ring-[#095D95]/10 shadow-md transform scale-[1.01]` : 'border-slate-200 dark:border-white/5 hover:border-slate-300'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 ${ActionDef.bg} ${ActionDef.color}`}>
                          <ActionDef.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Step {index + 1}</h4>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{ActionDef.label}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeAction(index); }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* ADD ACTION BUTTON in Center */}
            <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-600 mx-auto"></div>
            <div className="flex justify-center">
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-white/10 text-xs font-black uppercase tracking-widest text-slate-400">
                End of Workflow
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT PANEL: Configuration */}
        <div className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/5 overflow-y-auto shadow-sm z-10">
          
          {selectedNode === 'trigger' && (
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-[#DF7F09]/10 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#DF7F09]" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-white">Configure Trigger</h3>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea 
                    value={workflow.description} 
                    onChange={e => setWorkflow({...workflow, description: e.target.value})} 
                    className={INPUT_STYLE} 
                    rows="3"
                    placeholder="What does this workflow do?"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trigger Module</label>
                  <select 
                    value={workflow.module} 
                    onChange={e => {
                      const newModule = e.target.value;
                      setWorkflow({
                        ...workflow, 
                        module: newModule,
                        trigger_event: TRIGGERS[newModule]?.[0] || ''
                      });
                    }} 
                    className={INPUT_STYLE}
                  >
                    {MODULES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trigger Event</label>
                  <select 
                    value={workflow.trigger_event} 
                    onChange={e => setWorkflow({...workflow, trigger_event: e.target.value})} 
                    className={INPUT_STYLE}
                  >
                    {(TRIGGERS[workflow.module] || []).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {selectedNode?.startsWith('condition') && (
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-[#50B1B9]/10 rounded-xl flex items-center justify-center">
                  <Filter className="w-5 h-5 text-[#50B1B9]" />
                </div>
                <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-white">Conditions</h3>
              </div>
              
              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evaluation Logic</label>
                <select 
                  value={workflow.condition_logic} 
                  onChange={e => setWorkflow({...workflow, condition_logic: e.target.value})} 
                  className={INPUT_STYLE}
                >
                  <option value="AND">ALL conditions must match (AND)</option>
                  <option value="OR">ANY condition can match (OR)</option>
                </select>
              </div>

              <div className="space-y-4">
                {conditions.map((cond, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-white/5 relative group">
                    <button onClick={() => removeCondition(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <XCircle className="w-4 h-4" />
                    </button>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Field (e.g. status, amount)</label>
                        <input value={cond.field_name} onChange={e => updateCondition(idx, 'field_name', e.target.value)} className={INPUT_STYLE} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Operator</label>
                        <select value={cond.operator} onChange={e => updateCondition(idx, 'operator', e.target.value)} className={INPUT_STYLE}>
                          {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Value</label>
                        <input value={cond.value} onChange={e => updateCondition(idx, 'value', e.target.value)} className={INPUT_STYLE} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={addCondition}
                className="mt-4 w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-[#50B1B9] hover:border-[#50B1B9] transition-colors"
              >
                + Add Condition
              </button>
            </div>
          )}

          {selectedNode?.startsWith('action') && (
            <div className="p-6">
              {(() => {
                const idx = parseInt(selectedNode.split('_')[1]);
                const action = actions[idx];
                if (!action) return null;
                const ActionDef = ACTION_TYPES.find(a => a.type === action.action_type) || ACTION_TYPES[0];

                return (
                  <>
                    <div className="flex items-center space-x-3 mb-8">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ActionDef.bg} ${ActionDef.color}`}>
                        <ActionDef.icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 dark:text-white">{ActionDef.label}</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Branch Logic / Label</label>
                        <input 
                          value={action.branch_label || ''} 
                          onChange={e => updateAction(idx, 'branch_label', e.target.value)} 
                          className={INPUT_STYLE} 
                          placeholder="e.g. IF TRUE, IF FALSE"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignment Type</label>
                        <select value={action.assignment_type} onChange={e => updateAction(idx, 'assignment_type', e.target.value)} className={INPUT_STYLE}>
                          <option value="SPECIFIC_USER">Specific User</option>
                          <option value="RECORD_OWNER">Record Owner</option>
                          <option value="UNASSIGNED">Unassigned</option>
                        </select>
                      </div>

                      {/* Action-specific fields dynamically based on action_data */}
                      {action.action_type === 'CREATE_TASK' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Title</label>
                          <input 
                            value={action.action_data?.title || ''} 
                            onChange={e => updateAction(idx, 'data.title', e.target.value)} 
                            className={INPUT_STYLE} 
                            placeholder="Follow up with lead"
                          />
                        </div>
                      )}

                      {action.action_type === 'UPDATE_STATUS' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Status</label>
                          <input 
                            value={action.action_data?.status || ''} 
                            onChange={e => updateAction(idx, 'data.status', e.target.value)} 
                            className={INPUT_STYLE} 
                            placeholder="Qualified"
                          />
                        </div>
                      )}

                      {action.action_type === 'SEND_EMAIL' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Line</label>
                            <input 
                              value={action.action_data?.subject || ''} 
                              onChange={e => updateAction(idx, 'data.subject', e.target.value)} 
                              className={INPUT_STYLE} 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Body</label>
                            <textarea 
                              value={action.action_data?.body || ''} 
                              onChange={e => updateAction(idx, 'data.body', e.target.value)} 
                              className={INPUT_STYLE} 
                              rows="4"
                            />
                          </div>
                        </>
                      )}

                      <div className="p-4 bg-[#095D95]/5 rounded-xl border border-[#095D95]/10">
                        <p className="text-[10px] font-black text-[#095D95] uppercase tracking-widest mb-1">Dynamic Variables</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">You can use <code className="bg-white dark:bg-slate-800 px-1 rounded text-[#DF7F09]">{'{{instance.first_name}}'}</code> syntax to inject real record data.</p>
                      </div>

                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {!selectedNode && (
            <div className="flex h-full items-center justify-center p-6 text-center text-slate-500">
              Select a node in the visual builder to configure its properties.
            </div>
          )}

        </div>
      </div>

      <ConfirmationDialog 
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        confirmText="OK"
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
}
