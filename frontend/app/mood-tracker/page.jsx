'use client';

import { ActivityShell } from '@/components/features/wellness/ActivityShell';
import { useWellnessStorage } from '@/hooks/useWellnessActivity';
import { MOODS } from '@/lib/wellness';

export function Activity() {
  const [moods, setMoods, error, ready] = useWellnessStorage('moods', []);
  const logMood = (mood, emoji) =>
    setMoods((previous) => [
      { id: crypto.randomUUID(), mood, emoji, timestamp: new Date().toISOString() },
      ...previous,
    ]);
  return (
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
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              <div className="mood-buttons">
                {MOODS.map(([mood, emoji]) => (
                  <button
                    key={mood}
                    type="button"
                    className="mood-btn"
                    aria-label={mood}
                    title={mood}
                    disabled={!ready}
                    onClick={() => logMood(mood, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
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
                {!ready ? (
                  <p role="status">Loading mood history...</p>
                ) : moods.length === 0 ? (
                  <p className="log-empty">Track your mood to see history</p>
                ) : (
                  moods.map((entry) => (
                    <div className="mood-entry" key={entry.id}>
                      <span className="mood-entry-emoji" title={entry.mood}>
                        {entry.emoji}
                      </span>
                      <span>{entry.mood}</span>
                      <time className="mood-entry-time" dateTime={entry.timestamp}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </time>
                    </div>
                  ))
                )}
              </div>
              <button
                className="wellness-btn outline-btn"
                id="clearMoods"
                disabled={!ready || moods.length === 0}
                onClick={() => {
                  if (window.confirm('Clear your mood history?')) setMoods([]);
                }}
              >
                Clear History
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
