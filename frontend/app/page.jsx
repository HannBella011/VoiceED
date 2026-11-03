'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { useModals } from '@/components/shared/GlobalModals';
import { useAuthContext } from '@/context/AuthContext';

export default function HomePage() {
  const pathname = usePathname();
  const { loginOpen, setLoginOpen, userMenuOpen, setUserMenuOpen, settingsOpen, setSettingsOpen } = useModals();
  const { currentUser, isLoggedIn } = useAuthContext();

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleLoginClick = () => {
    if (isLoggedIn && currentUser) {
      setUserMenuOpen(true);
    } else {
      setLoginOpen(true);
    }
  };

  const handleGetStarted = () => {
    setLoginOpen(true);
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
  };

  const handleProfileClick = () => {
    window.location.href = '/profile';
    setUserMenuOpen(false);
  };

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="public"
        onSettingsClick={handleSettingsClick}
        onLoginClick={handleLoginClick}
      />

      <main className="dashboard-main">
        <div className="container">
          {/* Hero Section - match base HTML: NO card wrapper, just dashboard-welcome */}
          <div className="dashboard-welcome">
            <h2>Welcome back, Student!</h2>
            <p>Your safety hub for voices, wellness, and collaboration—built for schools, open to all!</p>
            <button className="cta-button" id="getStartedBtn" onClick={handleGetStarted}>
              Get Started
            </button>
          </div>

          {/* Service Cards Grid - match base HTML: dashboard-grid with dashboard-card (semi-transparent) */}
          <div className="dashboard-grid">
            <div
              className="dashboard-card"
              onClick={() => window.location.href = '/report'}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>ReportED</h3>
              <p className="stat-label">
                A safe, anonymous space where students submit crime reports, raise safety concerns, and ensure their voices are heard.
              </p>
            </div>

            <div
              className="dashboard-card"
              onClick={() => window.location.href = '/wellness-ed'}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-icon">
                <i className="fas fa-heart"></i>
              </div>
              <h3>WellnessED</h3>
              <p className="stat-label">
                Practical tips on mental health, stress management, and motivation to help students balance academics and personal wellbeing.
              </p>
            </div>

            <div
              className="dashboard-card"
              onClick={() => window.location.href = '/inspire-ed'}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-icon">
                <i className="fas fa-lightbulb"></i>
              </div>
              <h3>InspireED</h3>
              <p className="stat-label">
                Motivational stories, student achievements, and encouraging quotes designed to inspire persistence and hope among learners.
              </p>
            </div>

            <div
              className="dashboard-card"
              onClick={() => window.location.href = '/share-ed'}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-icon">
                <i className="fas fa-share-alt"></i>
              </div>
              <h3>ShareED</h3>
              <p className="stat-label">
                A simple hub where students can upload, download, and share notes, reviewer sheets, and study materials with peers.
              </p>
            </div>
          </div>

          {/* User Profile Section (shown when logged in) */}
          {isLoggedIn && (
            <div id="userProfileSection" className="user-profile-section">
              <div className="profile-card">
                <div className="profile-header">
                  <div className="profile-avatar">
                    <i className="fas fa-user"></i>
                  </div>
                  <div className="profile-info">
                    <h3 id="profileUsername">{currentUser?.username || 'Student'}</h3>
                    <p id="profileEmail">{currentUser?.username || 'student'}@voiceed.com</p>
                  </div>
                </div>
                <div className="profile-stats">
                  <div className="stat-item">
                    <span className="stat-number" id="loginCount">1</span>
                    <span className="stat-label">Logins</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number" id="lastLogin">Today</span>
                    <span className="stat-label">Last Login</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number" id="accountAge">New</span>
                    <span className="stat-label">Account Age</span>
                  </div>
                </div>
                <div className="profile-actions">
                  <button className="profile-btn" id="editProfileBtn" onClick={handleProfileClick}>
                    <i className="fas fa-edit"></i> Edit Profile
                  </button>
                  <button className="profile-btn" id="settingsBtn2" onClick={handleSettingsClick}>
                    <i className="fas fa-cog"></i> Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}