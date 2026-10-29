'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function DashboardContent() {
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
        variant="dashboard"
        onUserMenuClick={handleUserMenuClick}
        onSettingsClick={handleSettingsClick}
      />

      <main className="dashboard-main">
        <div className="dashboard-container">
          {/* Main Dashboard Layout */}
          <div className="dashboard-wrapper">
            {/* Left Sidebar */}
            <div className="left-sidebar">
              <div className="quick-actions-card">
                <h3>Quick Actions</h3>
                <div className="quick-actions">
                  <button className="action-btn" id="messageBtn">
                    <i className="fas fa-envelope"></i>
                    <span>Send Message</span>
                  </button>
                  <button className="action-btn" id="reportBtn">
                    <i className="fas fa-flag"></i>
                    <span>Report Issue</span>
                  </button>
                  <button className="action-btn" id="resourceBtn">
                    <i className="fas fa-book"></i>
                    <span>Resources</span>
                  </button>
                  <button className="action-btn" id="supportBtn">
                    <i className="fas fa-life-ring"></i>
                    <span>Get Support</span>
                  </button>
                </div>
              </div>
              <div className="upcoming-events-card">
                <h3>Upcoming Events</h3>
                <div className="events-list">
                  <div className="event-item">
                    <div className="event-date">
                      <span className="date">15</span>
                      <span className="month">MAR</span>
                    </div>
                    <div className="event-info">
                      <h4>Safety Workshop</h4>
                      <p>Learn about online safety and digital citizenship</p>
                    </div>
                  </div>
                  <div className="event-item">
                    <div className="event-date">
                      <span className="date">22</span>
                      <span className="month">MAR</span>
                    </div>
                    <div className="event-info">
                      <h4>Wellness Wednesday</h4>
                      <p>Join us for mindfulness and stress management</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="main-content">
              {/* Welcome Section */}
              <div className="welcome-section">
                <div className="welcome-content">
                  <h1>Welcome back, <span id="dashboardUsername">_____</span>!</h1>
                  <p>Thanks for signing in—VoiceED is ready to be your hub for safety, wellness, and collaboration, where every student's voice matters.</p>
                  <div className="quote-box">
                    <p><em>"Education is not the filling of a pail, but the lighting of a fire."</em></p>
                    <span>- William Butler Yeats</span>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className="content-grid">
                {/* Recent Activity */}
                <div className="content-card">
                  <div className="card-header">
                    <h3>Recent Activity</h3>
                    <a href="#" className="view-all">View All</a>
                  </div>
                  <div className="activity-feed">
                    <div className="activity-item">
                      <div className="activity-icon">
                        <i className="fas fa-sign-in-alt"></i>
                      </div>
                      <div className="activity-content">
                        <p className="activity-text">Logged in to your account</p>
                        <span className="activity-time">Just now</span>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-icon">
                        <i className="fas fa-user-plus"></i>
                      </div>
                      <div className="activity-content">
                        <p className="activity-text">Account created successfully</p>
                        <span className="activity-time">Today</span>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-icon">
                        <i className="fas fa-shield-alt"></i>
                      </div>
                      <div className="activity-content">
                        <p className="activity-text">Profile secured with VoiceED</p>
                        <span className="activity-time">Today</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Chart */}
                <div className="content-card">
                  <div className="card-header">
                    <h3>Learning Progress</h3>
                  </div>
                  <div className="progress-chart">
                    <div className="progress-item">
                      <div className="progress-info">
                        <span className="progress-title">Profile Completion</span>
                        <span className="progress-percentage">75%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: "75%" }}></div>
                      </div>
                    </div>
                    <div className="progress-item">
                      <div className="progress-info">
                        <span className="progress-title">Safety Training</span>
                        <span className="progress-percentage">60%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: "60%" }}></div>
                      </div>
                    </div>
                    <div className="progress-item">
                      <div className="progress-info">
                        <span className="progress-title">Wellness Activities</span>
                        <span className="progress-percentage">85%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: "85%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="right-sidebar">
              {/* Quick Links */}
              <div className="sidebar-widget">
                <h3>Quick Links</h3>
                <div className="links-list">
                  <a href="#" className="link-item">
                    <i className="fas fa-graduation-cap"></i>
                    <span>Learning Resources</span>
                  </a>
                  <a href="#" className="link-item">
                    <i className="fas fa-users"></i>
                    <span>Community Forum</span>
                  </a>
                  <a href="#" className="link-item">
                    <i className="fas fa-question-circle"></i>
                    <span>Help Center</span>
                  </a>
                  <a href="#" className="link-item">
                    <i className="fas fa-download"></i>
                    <span>Downloads</span>
                  </a>
                </div>
              </div>

              {/* Profile Actions */}
              <div className="sidebar-widget">
                <h3>Profile</h3>
                <div className="profile-actions">
                  <button className="profile-btn" id="editProfileBtn">
                    <i className="fas fa-edit"></i>
                    <span>Edit Profile</span>
                  </button>
                  <button className="profile-btn" id="settingsBtn" onClick={handleSettingsClick}>
                    <i className="fas fa-cog"></i>
                    <span>Settings</span>
                  </button>
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

export default function Dashboard() {
  return (
    <ProtectedRoute fallback={null}>
      <DashboardContent />
    </ProtectedRoute>
  );
}