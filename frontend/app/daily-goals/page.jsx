'use client';

import { useState } from 'react';
import { ActivityShell } from '@/components/features/wellness/ActivityShell';
import { useLocalDay, useWellnessStorage } from '@/hooks/useWellnessActivity';

export function Activity() {
  const today = useLocalDay();
  const [completed, setCompleted, error, ready] = useWellnessStorage(
    `goals:${today}`,
    {},
    (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  );
  const [custom, setCustom, customError, customReady] = useWellnessStorage(
    'custom-goals',
    []
  );
  const [customText, setCustomText] = useState('');
  const defaults = [
    { id: 'sleep', text: '7-8 hours sleep' },
    { id: 'water', text: '8 glasses water' },
    { id: 'exercise', text: '30 min exercise' },
    { id: 'breaks', text: 'Study breaks' },
  ];
  const goals = [...defaults, ...custom.map((goal) => ({ ...goal, custom: true }))];
  const count = goals.filter((goal) => completed[goal.id]).length;
  const addGoal = async () => {
    const text = customText.trim();
    if (
      text &&
      (await setCustom((previous) => [...previous, { id: crypto.randomUUID(), text }]))
    )
      setCustomText('');
  };
  const removeGoal = async (id) => {
    if (await setCustom((previous) => previous.filter((goal) => goal.id !== id))) {
      await setCompleted((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
    }
  };
  return (
    <main className="wellness-main">
      <div className="container">
        <div className="wellness-hero">
          <h2>Daily Goals</h2>
          <p>Set and track daily wellness goals to build healthy habits</p>
        </div>

        <div className="wellness-grid">
          <div className="wellness-card goals-card">
            <div className="card-header">
              <div className="card-icon">
                <i className="fas fa-bullseye"></i>
              </div>
              <h3>Today's Goals</h3>
            </div>
            <div className="card-body">
              {(error || customError) && (
                <p className="error-message" role="alert">
                  {error || customError}
                </p>
              )}
              <div className="goals-list" id="goalsList">
                {goals.map((goal) => (
                  <div
                    className={`goal-item ${goal.custom ? 'custom-goal' : 'default-goal'}`}
                    key={goal.id}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        flex: 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        className="goal-checkbox"
                        checked={Boolean(completed[goal.id])}
                        disabled={!ready}
                        onChange={(event) =>
                          setCompleted((previous) => ({
                            ...previous,
                            [goal.id]: event.target.checked,
                          }))
                        }
                      />
                      <span className="goal-text">{goal.text}</span>
                    </label>
                    {goal.custom && (
                      <button
                        type="button"
                        className="delete-goal"
                        aria-label={`Delete ${goal.text}`}
                        onClick={() => removeGoal(goal.id)}
                      >
                        <i className="fas fa-times" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="add-goal-section">
                <div className="add-goal-input-group">
                  <input
                    type="text"
                    id="customGoalInput"
                    maxLength={200}
                    value={customText}
                    onChange={(event) => setCustomText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addGoal();
                      }
                    }}
                    className="custom-goal-input"
                    placeholder="Add your custom goal..."
                  />
                  <button
                    className="add-goal-btn"
                    id="addGoalBtn"
                    type="button"
                    aria-label="Add goal"
                    disabled={!ready || !customReady || !customText.trim()}
                    onClick={addGoal}
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              </div>
              <div className="goals-progress">
                <div className="progress-track">
                  <div
                    className="progress-bar-fill"
                    id="goalsProgress"
                    style={{
                      width: `${goals.length ? (count / goals.length) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
                <p className="progress-label">
                  <span id="goalsCount">{count}</span>/
                  <span id="totalGoals">{goals.length}</span> completed
                </p>
              </div>
            </div>
          </div>

          <div className="wellness-card">
            <div className="card-header">
              <div className="card-icon">
                <i className="fas fa-lightbulb"></i>
              </div>
              <h3>Tips for Success</h3>
            </div>
            <div className="card-body">
              <ul className="breathing-steps">
                <li>Start small - choose 2-3 goals to begin</li>
                <li>Be consistent - track your progress daily</li>
                <li>Celebrate wins - acknowledge your achievements</li>
                <li>Adjust as needed - modify goals to fit your lifestyle</li>
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
