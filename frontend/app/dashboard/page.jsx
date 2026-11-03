'use client';

import { usePathname } from 'next/navigation';
import { Navbar, Footer } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';
import { useModals } from '@/components/shared/GlobalModals';

function DashboardContent() {
  const pathname = usePathname();
  const { settingsOpen, setSettingsOpen, userMenuOpen, setUserMenuOpen } = useModals();

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
          {/* Left Sidebar */}
          <aside className="dashboard-sidebar">
            <div className="sidebar-section">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button className="action-btn">
                  <i className="fas fa-envelope"></i>
                  <span>Send Message</span>
                </button>
                <button className="action-btn">
                  <i className="fas fa-flag"></i>
                  <span>Report Issue</span>
                </button>
                <button className="action-btn">
                  <i className="fas fa-book"></i>
                  <span>Resources</span>
                </button>
                <button className="action-btn">
                  <i className="fas fa-life-ring"></i>
                  <span>Get Support</span>
                </button>
              </div>
            </div>

            <div className="sidebar-section">
              <h3>Upcoming Events</h3>
              <div className="events-list">
                <div className="event-card">
                  <div className="event-date">
                    <span className="day">15</span>
                    <span className="month">MAR</span>
                  </div>
                  <div className="event-info">
                    <h4>Safety Workshop</h4>
                    <p>Learn about online safety and digital citizenship</p>
                  </div>
                </div>
                <div className="event-card">
                  <div className="event-date">
                    <span className="day">22</span>
                    <span className="month">MAR</span>
                  </div>
                  <div className="event-info">
                    <h4>Wellness Wednesday</h4>
                    <p>Join us for mindfulness and stress management</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="dashboard-content">
            {/* Welcome Section */}
            <section className="welcome-section">
              <div className="welcome-text">
                <h2>Welcome back, _____!</h2>
                <p>Thanks for signing in—VoiceED is ready to be your hub for safety, wellness, and collaboration, where every student's voice matters.</p>
                <blockquote>
                  <p>"Education is not the filling of a pail, but the lighting of a fire."</p>
                  <footer>- William Butler Yeats</footer>
                </blockquote>
              </div>
            </section>

            {/* Content Grid */}
            <div className="content-grid">
              {/* Recent Activity */}
              <section className="activity-section">
                <div className="section-header">
                  <h3>Recent Activity</h3>
                  <a href="#" className="view-all">View All</a>
                </div>
                <div className="activity-list">
                  <div className="activity-item">
                    <div className="activity-icon">
                      <i className="fas fa-sign-in-alt"></i>
                    </div>
                    <div className="activity-details">
                      <p>Logged in to your account</p>
                      <span className="activity-time">Just now</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon">
                      <i className="fas fa-user-plus"></i>
                    </div>
                    <div className="activity-details">
                      <p>Account created successfully</p>
                      <span className="activity-time">Today</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <div className="activity-icon">
                      <i className="fas fa-shield-alt"></i>
                    </div>
                    <div className="activity-details">
                      <p>Profile secured with VoiceED</p>
                      <span className="activity-time">Today</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Progress Chart */}
              <section className="progress-section">
                <h3>Learning Progress</h3>
                <div className="progress-cards">
                  <div className="progress-card">
                    <div className="progress-header">
                      <span className="progress-label">Profile Completion</span>
                      <span className="progress-value">75%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  <div className="progress-card">
                    <div className="progress-header">
                      <span className="progress-label">Safety Training</span>
                      <span className="progress-value">60%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                  <div className="progress-card">
                    <div className="progress-header">
                      <span className="progress-label">Wellness Activities</span>
                      <span className="progress-value">85%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="dashboard-sidebar-right">
            <div className="sidebar-section">
              <h3>Quick Links</h3>
              <ul className="quick-links">
                <li><a href="#"><i className="fas fa-book"></i> Learning Resources</a></li>
                <li><a href="#"><i className="fas fa-comments"></i> Community Forum</a></li>
                <li><a href="#"><i className="fas fa-question-circle"></i> Help Center</a></li>
                <li><a href="#"><i className="fas fa-download"></i> Downloads</a></li>
              </ul>
            </div>

            <div className="sidebar-section">
              <h3>Profile</h3>
              <div className="profile-actions">
                <button className="action-btn outline">
                  <i className="fas fa-edit"></i>
                  <span>Edit Profile</span>
                </button>
                <button className="action-btn outline">
                  <i className="fas fa-cog"></i>
                  <span>Settings</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
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