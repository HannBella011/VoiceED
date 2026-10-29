'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function WellnessJournalContent() {
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
            <h2>Wellness Journal</h2>
            <p>Write and reflect on your thoughts, feelings, and daily experiences</p>
          </div>

          <div className="wellness-grid">
            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-pen"></i>
                </div>
                <h3>New Entry</h3>
              </div>
              <div className="card-body">
                <div className="journal-form">
                  <div className="form-group">
                    <label htmlFor="journalDate">Date</label>
                    <input type="date" id="journalDate" className="journal-input" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="journalMood">How are you feeling?</label>
                    <select id="journalMood" className="journal-input journal-mood-select">
                      <option value="">Select your mood...</option>
                      <option value="excited">🤩 Excited</option>
                      <option value="happy">😊 Happy</option>
                      <option value="good">🙂 Good</option>
                      <option value="calm">😌 Calm</option>
                      <option value="okay">😐 Okay</option>
                      <option value="tired">😴 Tired</option>
                      <option value="worried">😟 Worried</option>
                      <option value="sad">😔 Sad</option>
                      <option value="angry">😠 Angry</option>
                      <option value="terrible">😢 Terrible</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="journalContent">Your thoughts...</label>
                    <textarea id="journalContent" className="journal-input journal-textarea" rows="6" placeholder="Write about your day, your feelings, or anything on your mind..."></textarea>
                  </div>
                  <button className="wellness-btn primary-btn" id="saveJournal">Save Entry</button>
                </div>
              </div>
            </div>

            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-book"></i>
                </div>
                <h3>Recent Entries</h3>
              </div>
              <div className="card-body">
                <div className="journal-entries" id="journalEntries">
                  <p className="log-empty">No journal entries yet. Start writing!</p>
                </div>
                <button className="wellness-btn outline-btn" id="clearJournal" style={{ marginTop: "1rem" }}>Clear All Entries</button>
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

export default function WellnessJournal() {
  return (
    <ProtectedRoute fallback={null}>
      <WellnessJournalContent />
    </ProtectedRoute>
  );
}