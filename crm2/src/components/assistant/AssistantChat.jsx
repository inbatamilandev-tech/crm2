import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Minus } from 'lucide-react';
import { AssistantService } from './AssistantService';
import './assistant.css';

export default function AssistantChat({ onClose, onMinimize }) {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I am your CRM Assistant. How can I help you today?", sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = { id: Date.now(), text: inputValue.trim(), sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    const responseText = await AssistantService.processMessage(userMessage.text);
    
    setIsTyping(false);
    setMessages(prev => [...prev, { id: Date.now() + 1, text: responseText, sender: 'bot' }]);
  };

  return (
    <div className="assistant-chat-window">
      <div className="assistant-chat-header">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black">
            A
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide">Assistant</h3>
            <span className="text-[10px] text-white/70 uppercase tracking-widest">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onMinimize} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="assistant-chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`assistant-message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
        {isTyping && (
          <div className="assistant-message bot flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="assistant-chat-input">
        <input 
          type="text" 
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Ask a question..."
          disabled={isTyping}
        />
        <button type="submit" disabled={!inputValue.trim() || isTyping}>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
