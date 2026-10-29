'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function ProfileContent() {
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

      <main className="profile-main">
        <div className="container">
          <div className="profile-header">
            <h2>My Profile</h2>
            <p>View and manage your personal information</p>
          </div>

          <div className="profile-container">
            {/* Profile Card */}
            <div className="profile-card">
              <div className="profile-avatar-section">
                <div className="profile-avatar">
                  <img src="/pfp.jpg" alt="User Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                </div>
                <div className="profile-info">
                  <h3 id="profileUsername">Student</h3>
                  <p id="profileEmail">student@voiceed.com</p>
                  <p id="profileMember">Member since <span id="memberSince">Today</span></p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="info-section">
              <h3>Personal Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Username</label>
                  <p id="infoUsername">-</p>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <p id="infoEmail">-</p>
                </div>
                <div className="info-item">
                  <label>Birthday</label>
                  <p id="infoBirthday">-</p>
                </div>
                <div className="info-item">
                  <label>Gender</label>
                  <p id="infoGender">-</p>
                </div>
                <div className="info-item">
                  <label>Account Status</label>
                  <p className="status-active">Active</p>
                </div>
                <div className="info-item">
                  <label>Member Since</label>
                  <p id="infoMemberSince">-</p>
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="stats-section">
              <h3>Account Statistics</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-sign-in-alt"></i>
                  </div>
                  <div className="stat-info">
                    <h4 id="statLoginCount">0</h4>
                    <p>Total Logins</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div className="stat-info">
                    <h4 id="statLastLogin">Today</h4>
                    <p>Last Login</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-calendar"></i>
                  </div>
                  <div className="stat-info">
                    <h4 id="statAccountAge">New</h4>
                    <p>Account Age</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <div className="stat-info">
                    <h4>Verified</h4>
                    <p>Account Status</p>
                  </div>
                </div>
              </div>
            </div>
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

export default function Profile() {
  return (
    <ProtectedRoute fallback={null}>
      <ProfileContent />
    </ProtectedRoute>
  );
}