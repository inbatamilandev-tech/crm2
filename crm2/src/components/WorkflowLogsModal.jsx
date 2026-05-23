import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

export default function WorkflowLogsModal({ workflow, onClose }) {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await api.get(`/workflows/${workflow.id}/logs/`);
        setLogs(response.data.results || response.data);
      } catch (err) {
        setError("Failed to load logs");
      } finally {
        setIsLoading(false);
      }
    };
    if (workflow?.id) fetchLogs();
  }, [workflow]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Execution Logs</h3>
            <p className="text-sm text-gray-500">{workflow?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 relative min-h-[300px]">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
              <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
              <p className="text-gray-500">{error}</p>
            </div>
          )}

          {!isLoading && !error && logs.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              No logs recorded for this workflow yet.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex-shrink-0 mt-0.5">
                    {log.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${log.status === 'success' ? 'text-green-700' : 'text-red-700'} capitalize`}>
                        {log.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.executed_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
