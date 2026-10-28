'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';

export default function FocusTimer() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  return (
    <>
      <Navbar 
        currentPage={pathname} 
        variant="wellness"
        onUserMenuClick={handleUserMenuClick}
        onSettingsClick={handleSettingsClick}
      />
      
      <main className="wellness-main">
        <div className="container">
          <div className="wellness-hero">
            <h2>Focus Timer</h2>
            <p>Use the Pomodoro technique to boost productivity and manage study time</p>
          </div>

          <div className="wellness-grid">
            <div className="wellness-card timer-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-hourglass-half"></i>
                </div>
                <h3>Pomodoro Timer</h3>
              </div>
              <div className="card-body">
                <div className="timer-display" id="timerDisplay">25:00</div>
                <div className="timer-presets">
                  <button className="preset-btn" data-time="25">25</button>
                  <button className="preset-btn" data-time="45">45</button>
                  <button className="preset-btn" data-time="60">60</button>
                </div>
                <div className="timer-controls">
                  <button className="wellness-btn primary-btn" id="startTimer">Start</button>
                  <button className="wellness-btn secondary-btn" id="pauseTimer" style={{ display: "none" }}>Pause</button>
                  <button className="wellness-btn outline-btn" id="resetTimer">Reset</button>
                </div>
              </div>
            </div>

            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-info-circle"></i>
                </div>
                <h3>About Pomodoro</h3>
              </div>
              <div className="card-body">
                <p className="card-description">The Pomodoro Technique is a time management method:</p>
                <ul className="breathing-steps">
                  <li>Work on a task for 25 minutes</li>
                  <li>Take a short 5-minute break</li>
                  <li>After 4 pomodoros, take a longer 15-30 minute break</li>
                  <li>Repeat the cycle as needed</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="back-button-container">
            <a href="/wellness-ed" className="back-btn"><i className="fas fa-arrow-left"></i> Back to WellnessED</a>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UserMenuModal
        isOpen={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        onProfileClick={() => window.location.href = '/profile'}
        onLogoutClick={() => {
          localStorage.removeItem('shielded_current_user');
        }}
      />
    </>
  );
}