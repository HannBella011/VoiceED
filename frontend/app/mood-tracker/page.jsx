'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function MoodTrackerContent() {
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
            <h2>Mood Tracker</h2>
            <p>Track your daily mood and emotional patterns for better self-awareness</p>
          </div>

          <div className="wellness-grid">
            <div className="wellness-card mood-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-heart"></i>
                </div>
                <h3>Mood Tracker</h3>
              </div>
              <div className="card-body">
                <p className="card-subtitle">Select your current mood</p>
                <div className="mood-buttons">
                  <button className="mood-btn" data-mood="excited" data-emoji="🤩">🤩</button>
                  <button className="mood-btn" data-mood="happy" data-emoji="😊">😊</button>
                  <button className="mood-btn" data-mood="good" data-emoji="🙂">🙂</button>
                  <button className="mood-btn" data-mood="calm" data-emoji="😌">😌</button>
                  <button className="mood-btn" data-mood="okay" data-emoji="😐">😐</button>
                  <button className="mood-btn" data-mood="tired" data-emoji="😴">😴</button>
                  <button className="mood-btn" data-mood="worried" data-emoji="😟">😟</button>
                  <button className="mood-btn" data-mood="sad" data-emoji="😔">😔</button>
                  <button className="mood-btn" data-mood="angry" data-emoji="😠">😠</button>
                  <button className="mood-btn" data-mood="terrible" data-emoji="😢">😢</button>
                </div>
              </div>
            </div>

            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-history"></i>
                </div>
                <h3>Mood History</h3>
              </div>
              <div className="card-body">
                <div className="mood-log" id="moodLog">
                  <p className="log-empty">Track your mood to see history</p>
                </div>
                <button className="wellness-btn outline-btn" id="clearMoods">Clear History</button>
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

export default function MoodTracker() {
  return (
    <ProtectedRoute fallback={null}>
      <MoodTrackerContent />
    </ProtectedRoute>
  );
}