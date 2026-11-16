'use client';

import { useState } from 'react';
import { ActivityShell } from '@/components/features/wellness/ActivityShell';
import { useWellnessStorage } from '@/hooks/useWellnessActivity';
import { localDate, MOODS } from '@/lib/wellness';

export function Activity() {
  const [entries, setEntries, error, ready] = useWellnessStorage('journals', []);
  const [date, setDate] = useState(localDate);
  const [mood, setMood] = useState('');
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const moodEmojis = Object.fromEntries(MOODS);
  const save = async () => {
    if (!content.trim() || !date) return;
    const entry = {
      id: crypto.randomUUID(),
      date,
      mood: mood || 'okay',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };
    if (await setEntries((previous) => [entry, ...previous])) {
      setContent('');
      setMood('');
      setDate(localDate());
      setSaved(true);
    }
  };
  return (
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
                {error && (
                  <p className="error-message" role="alert">
                    {error}
                  </p>
                )}
                {saved && <p role="status">Entry saved to your account.</p>}
                <div className="form-group">
                  <label htmlFor="journalDate">Date</label>
                  <input
                    type="date"
                    id="journalDate"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                    className="journal-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="journalMood">How are you feeling?</label>
                  <select
                    id="journalMood"
                    value={mood}
                    onChange={(event) => setMood(event.target.value)}
                    className="journal-input journal-mood-select"
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
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    className="journal-input journal-textarea"
                    rows="6"
                    placeholder="Write about your day, your feelings, or anything on your mind..."
                  ></textarea>
                </div>
                <button
                  className="wellness-btn primary-btn"
                  id="saveJournal"
                  disabled={!ready || !date || !content.trim()}
                  onClick={save}
                >
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
                {!ready ? (
                  <p role="status">Loading journal entries...</p>
                ) : entries.length === 0 ? (
                  <p className="log-empty">No journal entries yet. Start writing!</p>
                ) : (
                  entries.map((entry) => (
                    <article className="journal-entry" key={entry.id}>
                      <div className="journal-entry-header">
                        <time className="journal-entry-date" dateTime={entry.date}>
                          {entry.date}
                        </time>
                        <span className="journal-entry-mood" title={entry.mood}>
                          {moodEmojis[entry.mood]}
                        </span>
                        <button
                          type="button"
                          className="journal-entry-delete"
                          aria-label={`Delete entry for ${entry.date}`}
                          onClick={() => {
                            if (window.confirm('Delete this journal entry?'))
                              setEntries((previous) =>
                                previous.filter((item) => item.id !== entry.id)
                              );
                          }}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                      <p
                        className="journal-entry-content"
                        style={{ whiteSpace: 'pre-wrap' }}
                      >
                        {entry.content}
                      </p>
                    </article>
                  ))
                )}
              </div>
              <button
                className="wellness-btn outline-btn"
                id="clearJournal"
                disabled={!ready || entries.length === 0}
                onClick={() => {
                  if (window.confirm('Clear all your journal entries?')) setEntries([]);
                }}
                style={{ marginTop: '1rem' }}
              >
                Clear All Entries
              </button>
            </div>
          </div>
        </div>

        <div className="back-button-container">
          <a href="/wellness-ed" className="back-btn">
            <i className="fas fa-arrow-left"></i> Back to WellnessED
          </a>
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return <ActivityShell Activity={Activity} />;
}
