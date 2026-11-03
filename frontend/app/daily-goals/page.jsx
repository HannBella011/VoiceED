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

          <section className="goals-section">
            <div className="section-header">
              <h3>Today's Goals</h3>
            </div>
            <div className="goals-grid">
              <div className="goal-card">
                <div className="goal-icon">
                  <i className="fas fa-moon"></i>
                </div>
                <div className="goal-content">
                  <h4>7-8 hours sleep</h4>
                </div>
              </div>
              <div className="goal-card">
                <div className="goal-icon">
                  <i className="fas fa-tint"></i>
                </div>
                <div className="goal-content">
                  <h4>8 glasses water</h4>
                </div>
              </div>
              <div className="goal-card">
                <div className="goal-icon">
                  <i className="fas fa-running"></i>
                </div>
                <div className="goal-content">
                  <h4>30 min exercise</h4>
                </div>
              </div>
              <div className="goal-card">
                <div className="goal-icon">
                  <i className="fas fa-book"></i>
                </div>
                <div className="goal-content">
                  <h4>Study breaks</h4>
                </div>
              </div>
            </div>
            <div className="goals-progress">
              <span>0/4 completed</span>
            </div>
          </section>

          <section className="tips-section">
            <div className="section-header">
              <h3>Tips for Success</h3>
            </div>
            <div className="tips-list">
              <p>Start small - choose 2-3 goals to begin</p>
              <p>Be consistent - track your progress daily</p>
              <p>Celebrate wins - acknowledge your achievements</p>
              <p>Adjust as needed - modify goals to fit your lifestyle</p>
            </div>
          </section>

          <a href="/wellness-ed" className="btn btn--secondary">
            <i className="fas fa-arrow-left"></i> Back to WellnessED
          </a>
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
