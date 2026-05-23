import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

import { WebSocketProvider } from './context/WebSocketContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <WebSocketProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </WebSocketProvider>
    </ToastProvider>
  </StrictMode>,
);
