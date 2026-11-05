'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { useAuth } from '@/hooks';
import { useModals } from '@/components/shared/GlobalModals';

export default function WellnessJournal() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const { settingsOpen, setSettingsOpen, userMenuOpen, setUserMenuOpen, loginRequiredOpen, setLoginRequiredOpen } = useModals();

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleNavigation = (href) => {
    if (isLoggedIn) {
      window.location.href = href;
    } else {
      setLoginRequiredOpen(true);
    }
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
            <h2>Wellness Journal</h2>
            <p>Write and reflect on your thoughts, feelings, and daily experiences.</p>
          </div>

          <div className="wellness-card">
            <div className="card-header">
              <div className="card-icon">
                <i className="fas fa-info-circle"></i>
              </div>
              <h3>Coming Soon</h3>
            </div>
            <div className="card-body">
              <p className="card-description">This feature is currently under development. Please check back later.</p>
              <button className="card-btn" onClick={() => handleNavigation('/wellness-ed')}>Back to WellnessED <i className="fas fa-arrow-right"></i></button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}