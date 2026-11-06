// GlobalModals - VoiceED
// Renders all modals globally (once) - matches base HTML structure

'use client';

import { useState, useContext, createContext, useEffect } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { SettingsModal } from './SettingsModal';
import { UserMenuModal } from './UserMenuModal';
import { LoginModal } from './LoginModal';
import { LoginRequiredPopup } from './LoginRequiredPopup';

// Context for controlling modals from anywhere
const ModalContext = createContext(null);

export function useModals() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within ModalProvider');
  }
  return context;
}

// Export ModalContext for use in routeProtection
export { ModalContext };

export function ModalProvider({ children }) {
  const { logout } = useAuthContext();
  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);

  // Handle Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLoginOpen(false);
        setSettingsOpen(false);
        setUserMenuOpen(false);
        setLoginRequiredOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const value = {
    loginOpen,
    setLoginOpen,
    settingsOpen,
    setSettingsOpen,
    userMenuOpen,
    setUserMenuOpen,
    loginRequiredOpen,
    setLoginRequiredOpen,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => { window.location.href = '/register'; }}
        onSwitchToForgotPassword={() => { window.location.href = '/forgot-password'; }}
      />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UserMenuModal
        isOpen={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        onProfileClick={() => {
          setUserMenuOpen(false);
          window.location.href = '/profile';
        }}
        onLogoutClick={() => {
          setUserMenuOpen(false);
          logout();
        }}
      />
      <LoginRequiredPopup
        isOpen={loginRequiredOpen}
        onClose={() => setLoginRequiredOpen(false)}
        onGoToLogin={() => {
          const returnUrl = window.location.pathname + window.location.search;
          sessionStorage.setItem('shielded_return_url', returnUrl);
          window.location.href = '/login';
        }}
      />
    </ModalContext.Provider>
  );
}