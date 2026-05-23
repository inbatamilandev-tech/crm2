import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from './ToastContext';

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

/**
 * WS Status: 'connected' | 'reconnecting' | 'degraded' | 'offline'
 */

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('offline');
  const [lastMessage, setLastMessage] = useState(null);
  const [presence, setPresence] = useState({});
  const [activeViewers, setActiveViewers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [latency, setLatency] = useState(0);
  
  const { addToast } = useToast();
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const currentRecordRef = useRef({ type: null, id: null });
  const lastEventIdRef = useRef(null);
  const optimisticQueueRef = useRef([]);

  const sendAction = useCallback((action, payload = {}) => {
    const msg = JSON.stringify({ action, ...payload });
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(msg);
    } else {
      // Queue optimistic actions if disconnected (only high priority ones)
      if (['heartbeat', 'subscribe_record', 'catch_up'].includes(action)) {
        optimisticQueueRef.current.push({ action, payload });
      }
    }
  }, [socket]);

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setStatus('offline');
      return;
    }

    setStatus('connecting');
    const wsUrl = `ws://localhost:8000/ws/main/?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('⚡ Presence Matrix Online');
      setSocket(ws);
      setStatus('connected');
      
      // 1. Process Optimistic Queue
      while (optimisticQueueRef.current.length > 0) {
        const { action, payload } = optimisticQueueRef.current.shift();
        ws.send(JSON.stringify({ action, ...payload }));
      }

      // 2. Catch Up on missed events
      if (lastEventIdRef.current) {
        ws.send(JSON.stringify({ 
          action: 'catch_up', 
          last_event_id: lastEventIdRef.current 
        }));
      }
      
      // 3. Start Heartbeat
      heartbeatIntervalRef.current = setInterval(() => {
        const start = Date.now();
        ws.send(JSON.stringify({ 
          action: 'heartbeat', 
          status: 'online', 
          record_type: currentRecordRef.current.type,
          record_id: currentRecordRef.current.id,
          _ts: start
        }));
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Latency tracking if heartbeat echo
        if (data._ts) {
          setLatency(Date.now() - data._ts);
        }

        // Event Integrity
        if (data.event_id) {
          lastEventIdRef.current = data.event_id;
        }

        setLastMessage(data);

        switch (data.event) {
          case 'presence.updated':
            setPresence(prev => ({
              ...prev,
              [data.payload.user_id]: { 
                status: data.payload.status, 
                last_seen: data.payload.last_seen 
              }
            }));
            break;
            
          case 'record.viewers_updated':
            setActiveViewers(data.payload.viewers);
            break;
            
          case 'typing.started':
            setTypingUsers(prev => ({
              ...prev,
              [data.payload.user_id]: data.payload.username
            }));
            break;
            
          case 'typing.stopped':
            setTypingUsers(prev => {
              const next = { ...prev };
              delete next[data.payload.user_id];
              return next;
            });
            break;

          case 'notification.created':
            addToast(data.payload.message, data.payload.type || "info");
            break;

          case 'system.error':
            if (data.payload.code === 'RATE_LIMIT') {
              console.warn("Realtime Rate Limited:", data.payload.message);
            }
            break;
        }
      } catch (err) {
        console.error('WebSocket parse error', err);
      }
    };

    ws.onclose = () => {
      setSocket(null);
      setStatus('reconnecting');
      clearInterval(heartbeatIntervalRef.current);
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };

    ws.onerror = () => {
      setStatus('degraded');
    };

    return ws;
  }, [addToast]);

  useEffect(() => {
    const ws = connect();
    return () => {
      if (ws) ws.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      clearInterval(heartbeatIntervalRef.current);
    };
  }, [connect]);

  const subscribeToRecord = useCallback((recordType, recordId) => {
    currentRecordRef.current = { type: recordType, id: recordId };
    setActiveViewers([]);
    setTypingUsers({}); 
    sendAction('subscribe_record', { record_type: recordType, record_id: recordId });
  }, [sendAction]);

  const setTyping = useCallback((isTyping) => {
    const { type, id } = currentRecordRef.current;
    if (type && id) {
      sendAction(isTyping ? 'typing_start' : 'typing_stop', { 
        record_type: type, 
        record_id: id 
      });
    }
  }, [sendAction]);

  return (
    <WebSocketContext.Provider value={{ 
      socket, status, lastMessage, latency,
      presence, activeViewers, typingUsers,
      subscribeToRecord, setTyping 
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};
