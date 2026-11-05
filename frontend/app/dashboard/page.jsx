'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Navbar, Footer } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';
import { useModals } from '@/components/shared/GlobalModals';
import { useAuthContext } from '@/context/AuthContext';
import styles from './canonical.module.css';

function DashboardContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAuthContext();
  const { setSettingsOpen, setUserMenuOpen } = useModals();
  return (
    <>
      <Navbar currentPage={pathname} variant="dashboard"
        onUserMenuClick={() => setUserMenuOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)} />
      <div className={styles.canonical}>
<main className="dashboard-main">
        <div className="dashboard-container">

            <div className="dashboard-wrapper">

                <div className="left-sidebar">
                    <div className="quick-actions-card">
                        <h3>Quick Actions</h3>
                        <div className="quick-actions">
                            <button className="action-btn" id="messageBtn" onClick={() => router.push("/message")}>
                                <i className="fas fa-envelope"></i>
                                <span>Send Message</span>
                            </button>
                            <button className="action-btn" id="reportBtn" onClick={() => router.push("/report-ed")}>
                                <i className="fas fa-flag"></i>
                                <span>Report Issue</span>
                            </button>
                            <button className="action-btn" id="resourceBtn" onClick={() => router.push("/share-ed")}>
                                <i className="fas fa-book"></i>
                                <span>Resources</span>
                            </button>
                            <button className="action-btn" id="supportBtn" onClick={() => router.push("/contacts")}>
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

                <div className="main-content">

                    <div className="welcome-section">
                        <div className="welcome-content">
                            <h1>Welcome back, <span id="dashboardUsername">{currentUser?.username || "Student"}</span>!</h1>
                            <p>Thanks for signing in—VoiceED is ready to be your hub for safety, wellness, and collaboration, where every student's voice matters.</p>
                            <div className="quote-box">
                                <p><em>"Education is not the filling of a pail, but the lighting of a fire."</em></p>
                                <span>- William Butler Yeats</span>
                            </div>
                        </div>
                    </div>

                    <div className="content-grid">

                        <div className="content-card">
                            <div className="card-header">
                                <h3>Recent Activity</h3>
                                <a href="/dashboard/reports" className="view-all">View All</a>
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
                                        <div className="progress-fill" style={{ width: '75%' }}></div>
                                    </div>
                                </div>
                                <div className="progress-item">
                                    <div className="progress-info">
                                        <span className="progress-title">Safety Training</span>
                                        <span className="progress-percentage">60%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: '60%' }}></div>
                                    </div>
                                </div>
                                <div className="progress-item">
                                    <div className="progress-info">
                                        <span className="progress-title">Wellness Activities</span>
                                        <span className="progress-percentage">85%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: '85%' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                                            </div>
                </div>

                <div className="right-sidebar">

                    <div className="sidebar-widget">
                        <h3>Quick Links</h3>
                        <div className="links-list">
                            <a href="/share-ed" className="link-item">
                                <i className="fas fa-graduation-cap"></i>
                                <span>Learning Resources</span>
                            </a>
                            <a href="/inspire-ed" className="link-item">
                                <i className="fas fa-users"></i>
                                <span>Community Forum</span>
                            </a>
                            <a href="/contacts" className="link-item">
                                <i className="fas fa-question-circle"></i>
                                <span>Help Center</span>
                            </a>
                            <a href="/share-ed" className="link-item">
                                <i className="fas fa-download"></i>
                                <span>Downloads</span>
                            </a>
                        </div>
                    </div>

                    <div className="sidebar-widget">
                        <h3>Profile</h3>
                        <div className="profile-actions">
                            <button className="profile-btn" id="editProfileBtn" onClick={() => router.push("/profile")}>
                                <i className="fas fa-edit"></i>
                                <span>Edit Profile</span>
                            </button>
                            <button className="profile-btn" id="settingsBtn" onClick={() => setSettingsOpen(true)}>
                                <i className="fas fa-cog"></i>
                                <span>Settings</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
      </div>
      <Footer />
    </>
  );
}

export default function Dashboard() {
  return <ProtectedRoute><DashboardContent /></ProtectedRoute>;
}
