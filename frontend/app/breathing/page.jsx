'use client';

import { useEffect, useRef, useState } from 'react';
import { ActivityShell } from '@/components/features/wellness/ActivityShell';
import { breathingState } from '@/lib/wellness';

export function Activity() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const { phase, remaining, cycles } = breathingState(elapsed);
  const instructions = {
    Inhale: 'Breathe in...',
    Hold: 'Hold your breath...',
    Exhale: 'Breathe out...',
  };
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)),
      250
    );
    return () => clearInterval(timer);
  }, [running]);
  const start = () => {
    startedAt.current = Date.now();
    setElapsed(0);
    setRunning(true);
  };
  const stop = () => {
    setRunning(false);
  };
  return (
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
                <div
                  className="breathing-circle"
                  id="breathingCircle"
                  style={{
                    transform:
                      running && phase !== 'Exhale' ? 'scale(1.3)' : 'scale(1)',
                    transitionDuration: phase === 'Inhale' ? '4s' : '8s',
                  }}
                >
                  <span className="breathing-text" id="breathingText">
                    {running ? `${phase} ${remaining}` : 'Start'}
                  </span>
                </div>
              </div>
              <div className="breathing-info">
                <p className="breathing-phase" id="breathingPhase" aria-live="polite">
                  {running ? instructions[phase] : 'Ready to begin'}
                </p>
                <p className="breathing-count" id="breathingCount">
                  {cycles} cycles
                </p>
              </div>
              <button
                className="wellness-btn primary-btn"
                id="startBreathing"
                onClick={start}
                style={{ display: running ? 'none' : undefined }}
              >
                Start Exercise
              </button>
              <button
                className="wellness-btn secondary-btn"
                id="stopBreathing"
                onClick={stop}
                style={{ display: !running ? 'none' : undefined }}
              >
                Stop
              </button>
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
              <p className="card-description">
                The 4-7-8 breathing technique is a simple yet powerful method to calm
                your nervous system:
              </p>
              <ul className="breathing-steps">
                <li>
                  <strong>Inhale</strong> for 4 seconds through your nose
                </li>
                <li>
                  <strong>Hold</strong> your breath for 7 seconds
                </li>
                <li>
                  <strong>Exhale</strong> for 8 seconds through your mouth
                </li>
              </ul>
              <p className="card-description">
                Repeat for 4-8 cycles to feel relaxed and focused.
              </p>
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
