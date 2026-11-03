'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function FocusTimerContent() {
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

          <section className="timer-section">
            <div className="timer-card">
              <h3>Pomodoro Timer</h3>
              <div className="timer-display">25:00</div>
              <div className="timer-presets">
                <button className="preset-btn active">25</button>
                <button className="preset-btn">45</button>
                <button className="preset-btn">60</button>
              </div>
              <div className="timer-controls">
                <button className="btn btn--primary timer-btn">Start</button>
                <button className="btn btn--secondary timer-btn">Pause</button>
                <button className="btn btn--ghost timer-btn">Reset</button>
              </div>
            </div>
          </section>

          <section className="info-section">
            <h3>About Pomodoro</h3>
            <p>The Pomodoro Technique is a time management method:</p>
            <ul>
              <li>Work on a task for 25 minutes</li>
              <li>Take a short 5-minute break</li>
              <li>After 4 pomodoros, take a longer 15-30 minute break</li>
              <li>Repeat the cycle as needed</li>
            </ul>
          </section>

          <a href="/wellness-ed" className="btn btn--secondary">
            <i className="fas fa-arrow-left"></i> Back to WellnessED
          </a>
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

export default function FocusTimer() {
  return (
    <ProtectedRoute fallback={null}>
      <FocusTimerContent />
    </ProtectedRoute>
  );
}
