'use client';

import { useBlockingLoading } from '@/components/shared/GlobalLoading';
import { useState, useEffect } from 'react';
import { accountRequest } from '@/services/account';
import { localDate } from '@/lib/wellness';
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
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);
  const [revision, setRevision] = useState(0);
  const summary = result?.owner === currentUser?.id ? result?.data : null;
  const error = failure?.owner === currentUser?.id ? failure?.message : '';
  useBlockingLoading(Boolean(currentUser?.id && !summary && !error));
  useEffect(() => {
    let active = true;
    setResult(null); setFailure(null);
    if (!currentUser?.id) return;
    accountRequest(`/dashboard?day=${localDate()}`).then(data => { if(active) setResult({ owner: currentUser.id, data }); }).catch(err => { if(active) setFailure({ owner: currentUser.id, message: err.message || 'Unable to load your dashboard.' }); });
    return () => { active = false; };
  }, [currentUser?.id, revision]);
  const statistics = [
    ['materials', 'Total Resources Shared', 'fas fa-book', '/share-ed?mine=1'],
    ['stories', 'Total Stories Published', 'fas fa-pen', '/inspire-ed?mine=1&post_type=story'],
    ['quotes', 'Total Quotes Published', 'fas fa-quote-left', '/inspire-ed?mine=1&post_type=quote'],
    ['reactions_received', 'Total Reactions Received', 'fas fa-heart', '/inspire-ed?mine=1'],
    ['comments_received', 'Total Comments Received', 'fas fa-comment', '/inspire-ed?mine=1'],
    ['reports_submitted', 'Total Reports Submitted', 'fas fa-flag', '/dashboard/reports'],
  ];
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
                            <p>No upcoming events available.</p>
                        </div>
                    </div>
                </div>

                <div className="main-content">

                    <div className="welcome-section">
                        <div className="welcome-content">
                            <h1>Welcome back, <span id="dashboardUsername">{currentUser?.username || "Student"}</span>!</h1>
                            <p>Thanks for signing in—VoiceED is ready to be your hub for safety, wellness, and collaboration, where every student's voice matters.</p>
                            <div className="quote-box"><p>{summary ? `${summary.reports_submitted} reports | ${summary.materials} materials shared | ${summary.inspire_posts} InspireED posts` : error ? 'Your summary is unavailable.' : 'Loading your summary...'}</p></div>
                        </div>
                    </div>

                    {error && <p role="alert">{error} <button type="button" className="view-all" onClick={() => setRevision(value => value + 1)}>Retry</button></p>}
                    <section aria-label="Your shared content" aria-busy={!summary && !error}>
                        <h2 className="content-summary-heading">Your Content</h2>
                        <div className="stats-grid">
                            {statistics.map(([key, label, icon, href]) => <a className="stat-card" href={href} key={key}>
                                <div className="stat-icon" aria-hidden="true"><i className={icon} /></div>
                                <div className="stat-info"><h3>{label}</h3><span className="stat-number">{summary ? summary[key] : '\u2014'}</span></div>
                            </a>)}
                        </div>
                    </section>
                    <div className="content-grid">

                        <div className="content-card">
                            <div className="card-header">
                                <h3>Recent Activity</h3>
                                <a href="/dashboard/reports" className="view-all">View All</a>
                            </div>
                            <div className="activity-feed">
                                {!summary ? <p>{error ? 'Activity is unavailable.' : 'Loading activity...'}</p> : summary.activity.length === 0 ? <p>No activity yet.</p> : summary.activity.map(item => <div className="activity-item" key={item.id}><div className="activity-icon"><i className="fas fa-history" /></div><div className="activity-content"><p className="activity-text">{item.action}</p><time className="activity-time">{new Date(item.created_at).toLocaleString()}</time></div></div>)}
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
                                        <span className="progress-percentage">{summary ? `${summary.profile_completion}%` : '?'}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${summary?.profile_completion || 0}%` }}></div>
                                    </div>
                                </div>
                                <div className="progress-item">
                                    <div className="progress-info">
                                        <span className="progress-title">Safety Training</span>
                                        <span className="progress-percentage">No training data</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: '0%' }}></div>
                                    </div>
                                </div>
                                <div className="progress-item">
                                    <div className="progress-info">
                                        <span className="progress-title">Daily Wellness Goals</span>
                                        <span className="progress-percentage">{summary ? `${summary.wellness_progress}%` : '?'}</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${summary?.wellness_progress || 0}%` }}></div>
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
