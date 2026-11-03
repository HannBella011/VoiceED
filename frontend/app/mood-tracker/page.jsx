'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function MoodTrackerContent() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [moods, setMoods] = useState([]);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const loadMoods = () => {
    const saved = localStorage.getItem('wellness_moods');
    if (saved) {
      try {
        setMoods(JSON.parse(saved));
      } catch (e) {
        setMoods([]);
      }
    }
  };

  const handleMoodSelect = (mood, emoji) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMoods = [{ mood, emoji, timestamp }, ...moods].slice(0, 10);
    setMoods(newMoods);
    localStorage.setItem('wellness_moods', JSON.stringify(newMoods));
  };

  const clearMoods = () => {
    setMoods([]);
    localStorage.setItem('wellness_moods', JSON.stringify([]));
  };

  useEffect(() => {
    loadMoods();
  }, []);

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
                  <button className="mood-btn" data-mood="excited" data-emoji="🤩" onClick={() => handleMoodSelect('excited', '🤩')}>🤩</button>
                  <button className="mood-btn" data-mood="happy" data-emoji="😊" onClick={() => handleMoodSelect('happy', '😊')}>😊</button>
                  <button className="mood-btn" data-mood="good" data-emoji="🙂" onClick={() => handleMoodSelect('good', '🙂')}>🙂</button>
                  <button className="mood-btn" data-mood="calm" data-emoji="😌" onClick={() => handleMoodSelect('calm', '😌')}>😌</button>
                  <button className="mood-btn" data-mood="okay" data-emoji="😐" onClick={() => handleMoodSelect('okay', '😐')}>😐</button>
                  <button className="mood-btn" data-mood="tired" data-emoji="😴" onClick={() => handleMoodSelect('tired', '😴')}>😴</button>
                  <button className="mood-btn" data-mood="worried" data-emoji="😟" onClick={() => handleMoodSelect('worried', '😟')}>😟</button>
                  <button className="mood-btn" data-mood="sad" data-emoji="😔" onClick={() => handleMoodSelect('sad', '😔')}>😔</button>
                  <button className="mood-btn" data-mood="angry" data-emoji="😠" onClick={() => handleMoodSelect('angry', '😠')}>😠</button>
                  <button className="mood-btn" data-mood="terrible" data-emoji="😢" onClick={() => handleMoodSelect('terrible', '😢')}>😢</button>
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
                  {moods.length === 0 ? (
                    <p className="log-empty">Track your mood to see history</p>
                  ) : (
                    moods.map((m, index) => (
                      <div key={index} className="mood-entry">
                        <span className="mood-entry-emoji">{m.emoji}</span>
                        <span className="mood-entry-time">{m.timestamp}</span>
                      </div>
                    ))
                  )}
                </div>
                <button className="wellness-btn outline-btn" id="clearMoods" onClick={clearMoods}>
                  Clear History
                </button>
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
