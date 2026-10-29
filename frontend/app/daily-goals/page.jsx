'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function DailyGoalsContent() {
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
                <div className="goals-list" id="goalsList">
                  <label className="goal-item default-goal">
                    <input type="checkbox" className="goal-checkbox" data-goal="sleep" />
                    <span className="goal-text">7-8 hours sleep</span>
                  </label>
                  <label className="goal-item default-goal">
                    <input type="checkbox" className="goal-checkbox" data-goal="water" />
                    <span className="goal-text">8 glasses water</span>
                  </label>
                  <label className="goal-item default-goal">
                    <input type="checkbox" className="goal-checkbox" data-goal="exercise" />
                    <span className="goal-text">30 min exercise</span>
                  </label>
                  <label className="goal-item default-goal">
                    <input type="checkbox" className="goal-checkbox" data-goal="breaks" />
                    <span className="goal-text">Study breaks</span>
                  </label>
                </div>
                <div className="add-goal-section">
                  <div className="add-goal-input-group">
                    <input type="text" id="customGoalInput" className="custom-goal-input" placeholder="Add your custom goal..." />
                    <button className="add-goal-btn" id="addGoalBtn"><i className="fas fa-plus"></i></button>
                  </div>
                </div>
                <div className="goals-progress">
                  <div className="progress-track">
                    <div className="progress-bar-fill" id="goalsProgress"></div>
                  </div>
                  <p className="progress-label"><span id="goalsCount">0</span>/<span id="totalGoals">4</span> completed</p>
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

export default function DailyGoals() {
  return (
    <ProtectedRoute fallback={null}>
      <DailyGoalsContent />
    </ProtectedRoute>
  );
}