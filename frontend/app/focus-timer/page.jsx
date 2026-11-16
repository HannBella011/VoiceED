'use client';

import { ActivityShell } from '@/components/features/wellness/ActivityShell';
import { useCountdown } from '@/hooks/useWellnessActivity';
import { formatTimer } from '@/lib/wellness';

export function Activity() {
  const timer = useCountdown(25);
  return (
    <main className="wellness-main">
      <div className="container">
        <div className="wellness-hero">
          <h2>Focus Timer</h2>
          <p>Use the Pomodoro technique to boost productivity and manage study time</p>
        </div>

        <div className="wellness-grid">
          <div className="wellness-card timer-card">
            <div className="card-header">
              <div className="card-icon">
                <i className="fas fa-hourglass-half"></i>
              </div>
              <h3>Pomodoro Timer</h3>
            </div>
            <div className="card-body">
              <div className="timer-display" id="timerDisplay">
                {formatTimer(timer.remaining)}
              </div>
              <div className="timer-presets">
                <button
                  className="preset-btn"
                  data-time="25"
                  aria-pressed={timer.duration === 1500}
                  onClick={() => timer.select(25)}
                >
                  25
                </button>
                <button
                  className="preset-btn"
                  data-time="45"
                  aria-pressed={timer.duration === 2700}
                  onClick={() => timer.select(45)}
                >
                  45
                </button>
                <button
                  className="preset-btn"
                  data-time="60"
                  aria-pressed={timer.duration === 3600}
                  onClick={() => timer.select(60)}
                >
                  60
                </button>
              </div>
              {timer.completed && <p role="status">Focus session complete!</p>}
              <div className="timer-controls">
                <button
                  className="wellness-btn primary-btn"
                  id="startTimer"
                  onClick={timer.start}
                  style={{ display: timer.running ? 'none' : undefined }}
                >
                  Start
                </button>
                <button
                  className="wellness-btn secondary-btn"
                  id="pauseTimer"
                  onClick={timer.pause}
                  style={{ display: !timer.running ? 'none' : undefined }}
                >
                  Pause
                </button>
                <button
                  className="wellness-btn outline-btn"
                  id="resetTimer"
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
                <i className="fas fa-info-circle"></i>
              </div>
              <h3>About Pomodoro</h3>
            </div>
            <div className="card-body">
              <p className="card-description">
                The Pomodoro Technique is a time management method:
              </p>
              <ul className="breathing-steps">
                <li>Work on a task for 25 minutes</li>
                <li>Take a short 5-minute break</li>
                <li>After 4 pomodoros, take a longer 15-30 minute break</li>
                <li>Repeat the cycle as needed</li>
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
