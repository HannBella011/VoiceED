// useNotifications - VoiceED
// Hook for managing notifications/toasts

'use client';

import { useState, useCallback, useRef } from 'react';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const idCounter = useRef(0);

  const show = useCallback((message, type = 'success', useMessageAsTitle = false) => {
    const id = ++idCounter.current;
    const title = useMessageAsTitle ? message : (type === 'success' ? 'Success!' : type === 'error' ? 'Error' : 'Information');
    const bodyMessage = useMessageAsTitle ? (type === 'success' ? 'Logged out successfully' : message) : message;
    
    const notification = {
      id,
      message,
      type,
      title,
      bodyMessage,
      useMessageAsTitle,
    };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      hide(id);
    }, 5000);
  }, []);

  const hide = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notifications, show, hide };
}

export default useNotifications;
