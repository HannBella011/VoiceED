'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function ProfileContent() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const loadUser = () => {
    const stored = localStorage.getItem('shielded_current_user');
    if (stored) {
      try {
        const userData = JSON.parse(stored);
        setUser(userData);
      } catch (e) {
        setUser(null);
      }
    }
  };

  const formatAccountAge = (createdAt) => {
    if (!createdAt) return 'New';
    const createdDate = new Date(createdAt);
    const today = new Date();
    const daysSinceCreation = Math.floor((today - createdDate) / (1000 * 60 * 60 * 24));

    if (daysSinceCreation === 0) return 'New';
    else if (daysSinceCreation === 1) return '1 day';
    else if (daysSinceCreation < 30) return daysSinceCreation + ' days';
    else if (daysSinceCreation < 365) {
      const months = Math.floor(daysSinceCreation / 30);
      return months + ' month' + (months > 1 ? 's' : '');
    } else {
      const years = Math.floor(daysSinceCreation / 365);
      return years + ' year' + (years > 1 ? 's' : '');
    }
  };

  const getLoginCount = (username) => {
    const loginStats = JSON.parse(localStorage.getItem('shielded_login_stats') || '{}');
    return loginStats[username] || 0;
  };

  useEffect(() => {
    loadUser();
  }, []);

  if (!user) {
    return (
      <>
        <Navbar
          currentPage={pathname}
          variant="dashboard"
          onUserMenuClick={handleUserMenuClick}
          onSettingsClick={handleSettingsClick}
        />
        <main className="profile-main">
          <div className="container">
            <div className="profile-loading">
              <div className="spinner"></div>
              <p>Loading profile...</p>
            </div>
          </div>
        </main>
        <Footer />
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

  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Today';
  const birthday = user.birthday || '-';
  const gender = user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : '-';
  const loginCount = getLoginCount(user.username);
  const accountAge = formatAccountAge(user.createdAt);

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="dashboard"
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
                  <img src="/pfp.jpg" alt="User Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                </div>
                <div className="profile-info">
                  <h3 id="profileUsername">{user.username}</h3>
                  <p id="profileEmail">{user.username}@voiceed.com</p>
                  <p id="profileMember">Member since <span id="memberSince">{memberSince}</span></p>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="info-section">
              <h3>Personal Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Username</label>
                  <p id="infoUsername">{user.username}</p>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <p id="infoEmail">{user.username}@voiceed.com</p>
                </div>
                <div className="info-item">
                  <label>Birthday</label>
                  <p id="infoBirthday">{birthday}</p>
                </div>
                <div className="info-item">
                  <label>Gender</label>
                  <p id="infoGender">{gender}</p>
                </div>
                <div className="info-item">
                  <label>Account Status</label>
                  <p className="status-active">Active</p>
                </div>
                <div className="info-item">
                  <label>Member Since</label>
                  <p id="infoMemberSince">{memberSince}</p>
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
                    <h4 id="statLoginCount">{loginCount}</h4>
                    <p>Total Logins</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div className="stat-info">
                    <h4 id="statLastLogin">{user.loginTime ? new Date(user.loginTime).toLocaleDateString() : 'Today'}</h4>
                    <p>Last Login</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <i className="fas fa-calendar"></i>
                  </div>
                  <div className="stat-info">
                    <h4 id="statAccountAge">{accountAge}</h4>
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
