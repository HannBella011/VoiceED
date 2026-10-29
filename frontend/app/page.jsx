'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Navbar, Footer, SettingsModal, LoginModal, UserMenuModal, Card } from '@/components/shared';
import { useParticles } from '@/hooks/useParticles';
import { useAuthContext } from '@/context/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { useNotifications } from '@/hooks/useNotifications';
import { useProtectedNavigation } from '@/lib/routeProtection';

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { navigateToService } = useProtectedNavigation();

  // Initialize hooks
  useParticles();
  const { currentUser, isLoggedIn, loginStats, logout } = useAuthContext();
  const { loadSettings, saveSettings } = useSettings();
  const { notifications, show, hide } = useNotifications();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const dashboardCards = [
    {
      icon: <i className="fas fa-shield-alt"></i>,
      title: 'ReportED',
      description: 'A safe, anonymous space where students submit crime reports, raise safety concerns, and ensure their voices are heard.',
      onClick: () => navigateToService('/report-ed'),
    },
    {
      icon: <i className="fas fa-heart"></i>,
      title: 'WellnessED',
      description: 'Practical tips on mental health, stress management, and motivation to help students balance academics and personal wellbeing.',
      onClick: () => navigateToService('/wellness-ed'),
    },
    {
      icon: <i className="fas fa-lightbulb"></i>,
      title: 'InspireED',
      description: 'Motivational stories, student achievements, and encouraging quotes designed to inspire persistence and hope among learners.',
      onClick: () => navigateToService('/inspire-ed'),
    },
    {
      icon: <i className="fas fa-share-alt"></i>,
      title: 'ShareED',
      description: 'A simple hub where students can upload, download, and share notes, reviewer sheets, and study materials with peers.',
      onClick: () => navigateToService('/share-ed'),
    },
  ];

  const handleGetStarted = useCallback(() => {
    navigateToService('/dashboard');
  }, [navigateToService]);

  const handleLoginClick = useCallback(() => {
    if (isLoggedIn && currentUser) {
      setUserMenuOpen(true);
    } else {
      setLoginOpen(true);
    }
  }, [isLoggedIn, currentUser]);

  const handleSettingsClick = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    show('You have been logged out successfully', 'success');
  }, [logout, show]);

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="public"
        onLoginClick={handleLoginClick}
        onSettingsClick={handleSettingsClick}
      />

      <main className="dashboard-main">
        <div className="container">
          <div className="dashboard-welcome">
            <h2>Welcome back, Student!</h2>
            <p>Your safety hub for voices, wellness, and collaboration—built for schools, open to all!</p>
            <button className="cta-button" id="getStartedBtn" onClick={handleGetStarted}>
              Get Started
            </button>
          </div>

          <div className="dashboard-grid">
            {dashboardCards.map((card, index) => (
              <Card
                key={index}
                variant="dashboard"
                icon={card.icon}
                title={card.title}
                description={card.description}
                onClick={card.onClick}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>

          {/* User Profile Section (shown when logged in) */}
          <div id="userProfileSection" className="user-profile-section" style={{ display: isLoggedIn ? 'block' : 'none' }}>
            <div className="profile-card">
              <div className="profile-header">
                <div className="profile-avatar">
                  <i className="fas fa-user"></i>
                </div>
                <div className="profile-info">
                  <h3 id="profileUsername">{currentUser?.username || 'Student'}</h3>
                  <p id="profileEmail">{currentUser?.username}@voiceed.com</p>
                </div>
              </div>
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-number" id="loginCount">
                    {currentUser ? loginStats[currentUser.username] || 1 : 1}
                  </span>
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
                <button className="profile-btn" id="editProfileBtn">
                  <i className="fas fa-edit"></i> Edit Profile
                </button>
                <button className="profile-btn" id="settingsBtn2" onClick={handleSettingsClick}>
                  <i className="fas fa-cog"></i> Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => router.push('/register')}
        onSwitchToForgotPassword={() => router.push('/forgot-password')}
      />
      <UserMenuModal
        isOpen={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        onProfileClick={() => navigateToService('/profile')}
        onLogoutClick={handleLogout}
      />

      {/* Notifications */}
      {notifications.map((notification) => (
        <div key={notification.id} className={`notification notification-${notification.type} show`}>
          <div className="notification-toast">
            <div className="notification-header">
              <div className="notification-icon-wrapper">
                <div className="toast-icon">
                  <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
                </div>
              </div>
              <div className="notification-title-section">
                <div className="toast-title">{notification.title}</div>
              </div>
              <div className="toast-close" onClick={() => hide(notification.id)}>
                <i className="fas fa-times"></i>
              </div>
            </div>
            <div className="notification-body">
              <div className="toast-message">{notification.bodyMessage || notification.message}</div>
            </div>
            <div className="notification-progress"></div>
          </div>
        </div>
      ))}
    </>
  );
}