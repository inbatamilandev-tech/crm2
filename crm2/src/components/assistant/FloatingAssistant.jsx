import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import AssistantChat from './AssistantChat';
import { useAssistant } from './AssistantProvider';
import './assistant.css';

export default function FloatingAssistant() {
  const { isAssistantEnabled } = useAssistant();
  const [isOpen, setIsOpen] = useState(false);
  
  // Dragging state
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        let newX = prev.x;
        let newY = prev.y;
        if (newX > window.innerWidth - 60) newX = window.innerWidth - 80;
        if (newY > window.innerHeight - 60) newY = window.innerHeight - 80;
        return { x: newX, y: newY };
      });
    };
    window.addEventListener('resize', handleResize);
    // Initialize default position properly after mount
    setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAssistantEnabled) return null;

  const handlePointerDown = (e) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    setIsDragging(false);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    e.preventDefault();
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setIsDragging(true);
    }

    let newX = dragRef.current.initialX + dx;
    let newY = dragRef.current.initialY + dy;

    // Constrain to window bounds
    newX = Math.max(0, Math.min(newX, window.innerWidth - 60));
    newY = Math.max(0, Math.min(newY, window.innerHeight - 60));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  };

  const handleClick = () => {
    if (!isDragging) {
      setIsOpen(true);
    }
  };

  return (
    <>
      {!isOpen && (
        <div 
          className="assistant-ball"
          style={{ left: position.x, top: position.y }}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          title="Assistant"
        >
          <MessageCircle className="w-6 h-6" />
        </div>
      )}
      
      {isOpen && (
        <AssistantChat 
          onClose={() => setIsOpen(false)} 
          onMinimize={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
