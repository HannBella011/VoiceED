'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, LoginModal } from '@/components/shared';

export default function Message() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  const handleLoginClick = () => {
    const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('shielded_current_user') || 'null') : null;
    if (currentUser) {
      // No user menu modal in message page - just redirect to profile
      window.location.href = '/profile';
    } else {
      setLoginOpen(true);
    }
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
      
      <main className="services-main">
        <div className="container">
          <div className="services-welcome">
            <h2>User Messages</h2>
            <p>View and manage all messages submitted through the VoiceED contact form.</p>
          </div>

          <div className="services-container">
            {/* Messages Overview */}
            <div className="service-box">
              <div className="service-header">
                <div className="service-icon">
                  <i className="fas fa-inbox"></i>
                </div>
                <h3>All Messages</h3>
              </div>
              <div className="service-details">
                <div className="message-controls">
                  <div className="message-stats">
                    <span className="stat-item">
                      <i className="fas fa-envelope"></i>
                      <span id="totalMessages">0</span> Total Messages
                    </span>
                    <span className="stat-item">
                      <i className="fas fa-clock"></i>
                      <span id="recentMessages">0</span> Recent (Last 7 Days)
                    </span>
                  </div>
                  <div className="message-actions">
                    <button className="cta-button" onClick={() => { /* refreshMessages() */ }}>
                      <i className="fas fa-sync"></i> Refresh
                    </button>
                    <button className="cta-button" onClick={() => { /* clearAllMessages() */ }}>
                      <i className="fas fa-trash"></i> Clear All
                    </button>
                  </div>
                </div>

                <div id="messagesList" className="messages-list">
                  {/* Messages will be dynamically added here */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => window.location.href = '/register'}
        onSwitchToForgotPassword={() => window.location.href = '/forgot-password'}
      />
    </>
  );
}