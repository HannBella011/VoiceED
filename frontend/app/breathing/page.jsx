'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function BreathingContent() {
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
            <h2>Breathing Exercise</h2>
            <p>Practice guided breathing to reduce stress and improve focus</p>
          </div>

          <div className="breathing-container">
            <div className="breathing-circle">
              <div className="breathing-text">
                <span className="breathing-instruction">Ready to begin</span>
                <span className="breathing-count">0 cycles</span>
              </div>
            </div>
            <div className="breathing-controls">
              <button className="btn btn--primary breathing-btn" id="startBreathing">
                Start Exercise
              </button>
              <button className="btn btn--secondary breathing-btn" id="stopBreathing" disabled>
                Stop
              </button>
            </div>
            <div className="breathing-phases">
              <div className="phase">
                <span className="phase-label">Inhale</span>
                <span className="phase-time">4s</span>
              </div>
              <div className="phase">
                <span className="phase-label">Hold</span>
                <span className="phase-time">7s</span>
              </div>
              <div className="phase">
                <span className="phase-label">Exhale</span>
                <span className="phase-time">8s</span>
              </div>
            </div>
          </div>

          <div className="breathing-info">
            <h3>How It Works</h3>
            <p>The 4-7-8 breathing technique is a simple yet powerful method to calm your nervous system:</p>
            <ul>
              <li>Inhale for 4 seconds through your nose</li>
              <li>Hold your breath for 7 seconds</li>
              <li>Exhale for 8 seconds through your mouth</li>
            </ul>
            <p>{'Repeat for 4-8 cycles to feel relaxed and focused.'}</p>
          </div>

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

export default function Breathing() {
  return (
    <ProtectedRoute fallback={null}>
      <BreathingContent />
    </ProtectedRoute>
  );
}
