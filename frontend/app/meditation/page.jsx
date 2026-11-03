'use client';

import { usePathname } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function MeditationContent() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [meditationSeconds, setMeditationSeconds] = useState(600); // 10 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const updateDisplay = useCallback((seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handlePresetClick = (minutes) => {
    if (isRunning) return;
    const seconds = minutes * 60;
    setMeditationSeconds(seconds);
  };

  const startMeditation = () => {
    if (isRunning) return;
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      setMeditationSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          alert('Meditation session complete!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseMeditation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
  };

  const resetMeditation = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsRunning(false);
    setMeditationSeconds(600);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const timerDisplay = updateDisplay(meditationSeconds);

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
                <div className="timer-display" id="meditationTimerDisplay">{timerDisplay}</div>
                <div className="timer-presets">
                  <button className="preset-btn" data-time="5" onClick={() => handlePresetClick(5)}>5</button>
                  <button className="preset-btn" data-time="10" onClick={() => handlePresetClick(10)}>10</button>
                  <button className="preset-btn" data-time="15" onClick={() => handlePresetClick(15)}>15</button>
                  <button className="preset-btn" data-time="20" onClick={() => handlePresetClick(20)}>20</button>
                </div>
                <div className="timer-controls">
                  {!isRunning && (
                    <button className="wellness-btn primary-btn" id="startMeditation" onClick={startMeditation}>
                      Start
                    </button>
                  )}
                  {isRunning && (
                    <button className="wellness-btn secondary-btn" id="pauseMeditation" onClick={pauseMeditation}>
                      Pause
                    </button>
                  )}
                  <button className="wellness-btn outline-btn" id="resetMeditation" onClick={resetMeditation}>
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

export default function Meditation() {
  return (
    <ProtectedRoute fallback={null}>
      <MeditationContent />
    </ProtectedRoute>
  );
}
