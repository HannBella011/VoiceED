'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, LoginModal } from '@/components/shared';

export default function LoginPage() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(true); // Always show login on login page

  const handleLoginClick = () => {
    setLoginOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="public"
        onLoginClick={handleLoginClick}
        onSettingsClick={handleSettingsClick}
      />

      <main className="main-content">
        <div className="container">
          <div className="register-container">
            <div className="register-card" style={{ maxWidth: '420px' }}>
              <div className="register-header">
                <div className="register-icon">
                  <i className="fas fa-sign-in-alt"></i>
                </div>
                <h2>WELCOME BACK!</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '0.5rem' }}>Sign in to access VoiceED services</p>
              </div>

              <LoginModal
                isOpen={loginOpen}
                onClose={() => setLoginOpen(false)}
                onSwitchToRegister={() => window.location.href = '/register'}
                onSwitchToForgotPassword={() => window.location.href = '/forgot-password'}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}