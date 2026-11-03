// GlobalModals - VoiceED
// Renders all modals globally (once) - matches base HTML structure

'use client';

import { useState, useContext, createContext, useEffect } from 'react';
import { SettingsModal } from './SettingsModal';
import { LoginModal } from './LoginModal';
import { UserMenuModal } from './UserMenuModal';

// Context for controlling modals from anywhere
const ModalContext = createContext(null);

export function useModals() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within ModalProvider');
  }
  return context;
}

export function ModalProvider({ children }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        setLoginOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const value = {
    settingsOpen,
    setSettingsOpen,
    loginOpen,
    setLoginOpen,
    userMenuOpen,
    setUserMenuOpen,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => {
          setLoginOpen(false);
          window.location.href = '/register';
        }}
        onSwitchToForgotPassword={() => {
          setLoginOpen(false);
          window.location.href = '/forgot-password';
        }}
      />
      <UserMenuModal
        isOpen={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        onProfileClick={() => {
          setUserMenuOpen(false);
          window.location.href = '/profile';
        }}
        onLogoutClick={() => {
          setUserMenuOpen(false);
          localStorage.removeItem('shielded_current_user');
          localStorage.removeItem('shielded_access_token');
          window.location.href = '/';
        }}
      />
    </ModalContext.Provider>
  );
}