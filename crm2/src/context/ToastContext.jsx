import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, X, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    // Basic deduplication: don't add exact same message if it's already showing
    setToasts((prev) => {
      if (prev.some(t => t.message === message && t.type === type)) {
        return prev;
      }
      const id = Date.now();
      setTimeout(() => {
        removeToast(id);
      }, 5000);
      return [...prev, { id, message, type }];
    });
  }, []);


  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center p-4 pr-12 bg-white border-l-4 rounded shadow-lg relative min-w-[300px] animate-in slide-in-from-right-8 fade-in ${
              toast.type === 'success' ? 'border-green-500' : 
              toast.type === 'error' ? 'border-red-500' : 'border-blue-500'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mr-3" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 mr-3" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500 mr-3" />}
            
            <p className="text-sm font-medium text-gray-800">{toast.message}</p>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="absolute right-2 top-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
