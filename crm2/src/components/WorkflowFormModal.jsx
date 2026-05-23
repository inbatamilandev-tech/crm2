import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { workflowsApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function WorkflowFormModal({ workflow, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState(workflow || {
    name: '',
    module: 'lead',
    trigger_event: 'create',
    is_active: true,
    conditions: [],
    actions: []
  });

  const handleConditionChange = (index, field, value) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setFormData({ ...formData, conditions: newConditions });
  };

  const handleActionChange = (index, field, value) => {
    const newActions = [...formData.actions];
    if (field === 'action_type') {
        newActions[index] = { action_type: value, action_data: {} };
    } else {
        // Assume field is part of action_data for simplicity
        newActions[index].action_data = { ...newActions[index].action_data, [field]: value };
    }
    setFormData({ ...formData, actions: newActions });
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [...formData.conditions, { field_name: '', operator: 'equals', value: '' }]
    });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, { action_type: 'create_task', action_data: {} }]
    });
  };

  const removeCondition = (index) => {
    const newConditions = formData.conditions.filter((_, i) => i !== index);
    setFormData({ ...formData, conditions: newConditions });
  };

  const removeAction = (index) => {
    const newActions = formData.actions.filter((_, i) => i !== index);
    setFormData({ ...formData, actions: newActions });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (workflow?.id) {
        await workflowsApi.update(workflow.id, formData);
        addToast("Workflow updated successfully");
      } else {
        await workflowsApi.create(formData);
        addToast("Workflow created successfully");
      }
      onSuccess();
    } catch (error) {
      addToast("Failed to save workflow", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{workflow ? 'Edit Workflow' : 'Create Workflow'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 border-b pb-2">Basic Details</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="E.g., High Value Lead Task" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                <select value={formData.module} onChange={e => setFormData({...formData, module: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                  <option value="lead">Lead</option>
                  <option value="deal">Deal</option>
                  <option value="task">Task</option>
                  <option value="contact">Contact</option>
                  <option value="project">Project</option>
                  <option value="quote">Quote</option>
                  <option value="invoice">Invoice</option>
                  <option value="case">Support Case</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Event</label>
                <select value={formData.trigger_event} onChange={e => setFormData({...formData, trigger_event: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                  <option value="create">On Create</option>
                  <option value="update">On Update</option>
                  <option value="delete">On Delete</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-semibold text-gray-900">Conditions</h4>
              <button type="button" onClick={addCondition} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <Plus className="w-4 h-4 mr-1" /> Add Condition
              </button>
            </div>
            
            {formData.conditions.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No conditions. Workflow will trigger for all events.</p>
            ) : (
              formData.conditions.map((cond, idx) => (
                <div key={idx} className="flex space-x-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <input required type="text" value={cond.field_name} onChange={e => handleConditionChange(idx, 'field_name', e.target.value)} placeholder="Field (e.g. status)" className="flex-1 px-2 py-1.5 border rounded text-sm" />
                  <select value={cond.operator} onChange={e => handleConditionChange(idx, 'operator', e.target.value)} className="w-32 px-2 py-1.5 border rounded text-sm">
                    <option value="equals">=</option>
                    <option value="not_equals">!=</option>
                    <option value="contains">Contains</option>
                    <option value="gt">&gt;</option>
                    <option value="lt">&lt;</option>
                  </select>
                  <input required type="text" value={cond.value} onChange={e => handleConditionChange(idx, 'value', e.target.value)} placeholder="Value" className="flex-1 px-2 py-1.5 border rounded text-sm" />
                  <button type="button" onClick={() => removeCondition(idx)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-semibold text-gray-900">Actions</h4>
              <button type="button" onClick={addAction} className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                <Plus className="w-4 h-4 mr-1" /> Add Action
              </button>
            </div>
            
            {formData.actions.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No actions defined.</p>
            ) : (
              formData.actions.map((action, idx) => (
                <div key={idx} className="space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <div className="flex space-x-2 items-center">
                    <select value={action.action_type} onChange={e => handleActionChange(idx, 'action_type', e.target.value)} className="flex-1 px-2 py-1.5 border rounded text-sm font-medium">
                      <option value="create_task">Create Task</option>
                      <option value="assign_user">Assign User</option>
                      <option value="send_email">Send Email</option>
                      <option value="update_field">Update Field</option>
                      <option value="create_project">Create Project</option>
                      <option value="send_notification">Send Notification</option>
                      <option value="convert_lead">Convert Lead to Deal/Contact</option>
                      <option value="create_quote">Create Quote</option>
                      <option value="generate_invoice">Generate Invoice</option>
                    </select>
                    <button type="button" onClick={() => removeAction(idx)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  
                  {/* Dynamic Action Fields */}
                  {action.action_type === 'create_task' && (
                    <input type="text" value={action.action_data.title || ''} onChange={e => handleActionChange(idx, 'title', e.target.value)} placeholder="Task Title" className="w-full px-2 py-1.5 border rounded text-sm" />
                  )}
                  {action.action_type === 'assign_user' && (
                    <input type="text" value={action.action_data.user_id || ''} onChange={e => handleActionChange(idx, 'user_id', e.target.value)} placeholder="User ID" className="w-full px-2 py-1.5 border rounded text-sm" />
                  )}
                  {action.action_type === 'update_field' && (
                    <div className="flex space-x-2">
                      <input type="text" value={action.action_data.field || ''} onChange={e => handleActionChange(idx, 'field', e.target.value)} placeholder="Field Name" className="flex-1 px-2 py-1.5 border rounded text-sm" />
                      <input type="text" value={action.action_data.value || ''} onChange={e => handleActionChange(idx, 'value', e.target.value)} placeholder="New Value" className="flex-1 px-2 py-1.5 border rounded text-sm" />
                    </div>
                  )}
                  {action.action_type === 'create_project' && (
                    <input type="text" value={action.action_data.name || ''} onChange={e => handleActionChange(idx, 'name', e.target.value)} placeholder="Project Name" className="w-full px-2 py-1.5 border rounded text-sm" />
                  )}
                  {['send_email', 'send_notification'].includes(action.action_type) && (
                    <input type="text" value={action.action_data.message || action.action_data.email || ''} onChange={e => handleActionChange(idx, action.action_type === 'send_email' ? 'email' : 'message', e.target.value)} placeholder={action.action_type === 'send_email' ? "Email Address" : "Message text"} className="w-full px-2 py-1.5 border rounded text-sm" />
                  )}
                </div>
              ))
            )}
          </div>
        </form>
        
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50 rounded-b-xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          <button type="submit" onClick={handleSubmit} disabled={isSubmitting || formData.actions.length === 0} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
