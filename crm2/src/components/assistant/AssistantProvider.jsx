import React, { createContext, useContext, useState, useEffect } from 'react';

const AssistantContext = createContext();

export const AssistantProvider = ({ children }) => {
  const [isAssistantEnabled, setIsAssistantEnabled] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('assistant_enabled');
    if (stored === 'true') {
      setIsAssistantEnabled(true);
    }
  }, []);

  const toggleAssistant = (enabled) => {
    setIsAssistantEnabled(enabled);
    localStorage.setItem('assistant_enabled', enabled ? 'true' : 'false');
  };

  return (
    <AssistantContext.Provider value={{ isAssistantEnabled, toggleAssistant }}>
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (context === undefined) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};
