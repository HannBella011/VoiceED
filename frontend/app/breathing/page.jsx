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

          <div className="wellness-grid">
            <div className="wellness-card breathing-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-wind"></i>
                </div>
                <h3>4-7-8 Breathing Technique</h3>
              </div>
              <div className="card-body">
                <div className="breathing-circle-wrapper">
                  <div className="breathing-circle" id="breathingCircle">
                    <span className="breathing-text" id="breathingText">Start</span>
                  </div>
                </div>
                <div className="breathing-info">
                  <p className="breathing-phase" id="breathingPhase">Ready to begin</p>
                  <p className="breathing-count" id="breathingCount">0 cycles</p>
                </div>
                <button className="wellness-btn primary-btn" id="startBreathing">Start Exercise</button>
                <button className="wellness-btn secondary-btn" id="stopBreathing" style={{ display: "none" }}>Stop</button>
              </div>
            </div>

            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-info-circle"></i>
                </div>
                <h3>How It Works</h3>
              </div>
              <div className="card-body">
                <p className="card-description">The 4-7-8 breathing technique is a simple yet powerful method to calm your nervous system:</p>
                <ul className="breathing-steps">
                  <li><strong>Inhale</strong> for 4 seconds through your nose</li>
                  <li><strong>Hold</strong> your breath for 7 seconds</li>
                  <li><strong>Exhale</strong> for 8 seconds through your mouth</li>
                </ul>
                <p className="card-description">Repeat for 4-8 cycles to feel relaxed and focused.</p>
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

export default function Breathing() {
  return (
    <ProtectedRoute fallback={null}>
      <BreathingContent />
    </ProtectedRoute>
  );
}