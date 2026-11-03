'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function WellnessJournalContent() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalMood, setJournalMood] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journals, setJournals] = useState([]);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const moodEmojis = {
    'excited': '🤩',
    'happy': '😊',
    'good': '🙂',
    'calm': '😌',
    'okay': '😐',
    'tired': '😴',
    'worried': '😟',
    'sad': '😔',
    'angry': '😠',
    'terrible': '😢',
    'great': '😊',
    'bad': '😔'
  };

  // Load journals from localStorage on mount
  const loadJournals = () => {
    const saved = localStorage.getItem('wellness_journals');
    if (saved) {
      try {
        setJournals(JSON.parse(saved));
      } catch (e) {
        setJournals([]);
      }
    }
  };

  const saveEntry = () => {
    if (!journalContent.trim()) {
      alert('Please write something in your journal entry.');
      return;
    }

    const entry = {
      date: journalDate,
      mood: journalMood || 'okay',
      content: journalContent,
      timestamp: new Date().toISOString()
    };

    const newJournals = [entry, ...journals].slice(0, 10);
    setJournals(newJournals);
    localStorage.setItem('wellness_journals', JSON.stringify(newJournals));

    setJournalContent('');
    setJournalMood('');
    setJournalDate(new Date().toISOString().split('T')[0]);
  };

  const deleteEntry = (index) => {
    if (confirm('Are you sure you want to delete this journal entry?')) {
      const newJournals = journals.filter((_, i) => i !== index);
      setJournals(newJournals);
      localStorage.setItem('wellness_journals', JSON.stringify(newJournals));
    }
  };

  const clearAll = () => {
    if (confirm('Are you sure you want to clear all journal entries?')) {
      setJournals([]);
      localStorage.setItem('wellness_journals', JSON.stringify([]));
    }
  };

  // Load on mount
  const [mounted, setMounted] = useState(false);
  if (!mounted) {
    loadJournals();
    setMounted(true);
  }

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
                    <input
                      type="date"
                      id="journalDate"
                      className="journal-input"
                      value={journalDate}
                      onChange={(e) => setJournalDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="journalMood">How are you feeling?</label>
                    <select
                      id="journalMood"
                      className="journal-input journal-mood-select"
                      value={journalMood}
                      onChange={(e) => setJournalMood(e.target.value)}
                    >
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
                    <textarea
                      id="journalContent"
                      className="journal-input journal-textarea"
                      rows={6}
                      placeholder="Write about your day, your feelings, or anything on your mind..."
                      value={journalContent}
                      onChange={(e) => setJournalContent(e.target.value)}
                    ></textarea>
                  </div>
                  <button className="wellness-btn primary-btn" id="saveJournal" onClick={saveEntry}>
                    Save Entry
                  </button>
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
                  {journals.length === 0 ? (
                    <p className="log-empty">No journal entries yet. Start writing!</p>
                  ) : (
                    journals.map((j, index) => (
                      <div key={index} className="journal-entry" data-index={index}>
                        <div className="journal-entry-header">
                          <span className="journal-entry-date">{j.date}</span>
                          <span className="journal-entry-mood">{moodEmojis[j.mood] || '😐'}</span>
                          <span className="journal-entry-delete" data-index={index} onClick={() => deleteEntry(index)}>
                            <i className="fas fa-trash"></i>
                          </span>
                        </div>
                        <p className="journal-entry-content">{j.content}</p>
                      </div>
                    ))
                  )}
                </div>
                <button className="wellness-btn outline-btn" id="clearJournal" onClick={clearAll} style={{ marginTop: '1rem' }}>
                  Clear All Entries
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

export default function WellnessJournal() {
  return (
    <ProtectedRoute fallback={null}>
      <WellnessJournalContent />
    </ProtectedRoute>
  );
}
