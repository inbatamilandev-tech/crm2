import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { workflowsApi, workflowLogsApi } from '../../../services/api';
import ConfirmationDialog from '../../../components/ConfirmationDialog';

export default function WorkflowLogs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRetry = async (logId) => {
    try {
      await workflowLogsApi.retry(logId);
      setDialogConfig({
        isOpen: true,
        title: "Retry Initiated",
        description: "Retry execution initiated. It will run in the background.",
        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
      // optionally refresh logs after a delay
      setTimeout(fetchData, 2000);
    } catch (error) {
      console.error("Failed to retry", error);
      setDialogConfig({
        isOpen: true,
        title: "Error",
        description: "Failed to initiate retry.",
        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const wfData = await workflowsApi.getById(id);
      setWorkflow(wfData);
      
      const logsData = await workflowsApi.getLogs(id);
      setLogs(logsData.results || logsData);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center mb-8">
        <button onClick={() => navigate('/settings/workflows')} className="p-2 mr-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9] flex items-center">
            Workflow Logs
          </h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">
            {workflow ? `Execution history for: ${workflow.name}` : 'Loading...'}
          </p>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading execution history...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">No Executions Yet</h3>
            <p className="text-xs text-slate-500 mt-2">This workflow has not been triggered yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-col">
                <div 
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(log.status)}
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center">
                        Execution #{log.id}
                        <span className={`ml-3 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                          log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' :
                          log.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {log.status}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 mt-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(log.executed_at).toLocaleString()}
                        <span className="mx-2">•</span>
                        Trigger: {log.trigger_event}
                        <span className="mx-2">•</span>
                        Record ID: {log.object_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {log.status === 'FAILED' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRetry(log.id); }}
                        className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors flex items-center"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry Flow
                      </button>
                    )}
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{log.action_logs?.length || 0} Actions Evaluated</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Trace Details */}
                {expandedLogId === log.id && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-t border-slate-100 dark:border-white/5">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Execution Trace</h4>
                    {log.message && (
                      <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-white/5 text-sm text-slate-700 dark:text-slate-300">
                        {log.message}
                      </div>
                    )}
                    
                    {log.action_logs && log.action_logs.length > 0 ? (
                      <div className="space-y-4">
                        {log.action_logs.map((actionLog, index) => (
                          <div key={actionLog.id} className="flex relative">
                            <div className="flex flex-col items-center mr-4">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white z-10 ${
                                actionLog.status === 'SUCCESS' ? 'bg-emerald-500' :
                                actionLog.status === 'FAILED' ? 'bg-red-500' : 'bg-slate-400'
                              }`}>
                                {index + 1}
                              </div>
                              {index !== log.action_logs.length - 1 && (
                                <div className="w-0.5 h-full bg-slate-200 dark:bg-slate-700 absolute top-6 bottom-[-16px] left-3 -ml-[1px]"></div>
                              )}
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-white/5 flex-1 shadow-sm">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">{actionLog.status}</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{actionLog.message}</p>
                                </div>
                              </div>
                              {actionLog.error_details && (
                                <div className="mt-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg text-xs text-red-600 dark:text-red-400 font-mono overflow-x-auto">
                                  {JSON.stringify(actionLog.error_details, null, 2)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No specific actions were executed during this run.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
