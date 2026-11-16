'use client';

import { ActivityShell } from '@/components/features/wellness/ActivityShell';
import { useCountdown } from '@/hooks/useWellnessActivity';
import { formatTimer } from '@/lib/wellness';

export function Activity() {
  const timer = useCountdown(10);
  return (
    <main className="wellness-main">
      <div className="container">
        <div className="wellness-hero">
          <h2>Meditation</h2>
          <p>Guided meditation sessions for relaxation and mental clarity</p>
        </div>

        <div className="wellness-grid">
          <div className="wellness-card">
            <div className="card-header">
              <div className="card-icon">
                <i className="fas fa-clock"></i>
              </div>
              <h3>Meditation Timer</h3>
            </div>
            <div className="card-body">
              <div className="timer-display" id="meditationTimerDisplay">
                {formatTimer(timer.remaining)}
              </div>
              <div className="timer-presets">
                <button
                  className="preset-btn"
                  data-time="5"
                  aria-pressed={timer.duration === 300}
                  onClick={() => timer.select(5)}
                >
                  5
                </button>
                <button
                  className="preset-btn"
                  data-time="10"
                  aria-pressed={timer.duration === 600}
                  onClick={() => timer.select(10)}
                >
                  10
                </button>
                <button
                  className="preset-btn"
                  data-time="15"
                  aria-pressed={timer.duration === 900}
                  onClick={() => timer.select(15)}
                >
                  15
                </button>
                <button
                  className="preset-btn"
                  data-time="20"
                  aria-pressed={timer.duration === 1200}
                  onClick={() => timer.select(20)}
                >
                  20
                </button>
              </div>
              {timer.completed && <p role="status">Meditation session complete!</p>}
              <div className="timer-controls">
                <button
                  className="wellness-btn primary-btn"
                  id="startMeditation"
                  onClick={timer.start}
                  style={{ display: timer.running ? 'none' : undefined }}
                >
                  Start
                </button>
                <button
                  className="wellness-btn secondary-btn"
                  id="pauseMeditation"
                  onClick={timer.pause}
                  style={{ display: !timer.running ? 'none' : undefined }}
                >
                  Pause
                </button>
                <button
                  className="wellness-btn outline-btn"
                  id="resetMeditation"
                  onClick={timer.reset}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="wellness-card">
            <div className="card-header">
              <div className="card-icon">
                <i className="fas fa-leaf"></i>
              </div>
              <h3>Meditation Tips</h3>
            </div>
            <div className="card-body">
              <ul className="breathing-steps">
                <li>Find a quiet, comfortable space</li>
                <li>Sit or lie down in a relaxed position</li>
                <li>Close your eyes and focus on your breath</li>
                <li>Let thoughts come and go without judgment</li>
                <li>Start with short sessions (5-10 minutes)</li>
              </ul>
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
