// Admin Reports List - VoiceED
// Admin dashboard for managing all reports

'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ReportCard } from '@/components/features/report';
import { adminListReports, getAdminStats, getAvailableAssignees } from '@/services';
import { useAuth } from '@/hooks';

export default function AdminReportsPage() {
  const pathname = usePathname();
  const { isLoggedIn, currentUser, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: undefined,
    category: undefined,
    is_anonymous: undefined,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [assignees, setAssignees] = useState([]);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [reportsData, statsData, assigneesData] = await Promise.all([
        adminListReports(filters),
        getAdminStats(),
        getAvailableAssignees(),
      ]);
      setReports(reportsData.items);
      setTotal(reportsData.total);
      setTotalPages(reportsData.total_pages);
      setStats(statsData);
      setAssignees(assigneesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.page, filters.status, filters.category, filters.is_anonymous]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleViewReport = (report) => {
    window.location.href = '/admin/reports/' + report.id;
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'awaiting_additional_info', label: 'Awaiting Additional Info' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'academic', label: 'Academic Concern' },
    { value: 'harassment', label: 'Harassment or Bullying' },
    { value: 'safety', label: 'Facility/Safety Hazard' },
    { value: 'discrimination', label: 'Discrimination' },
    { value: 'mental_health', label: 'Mental Health Concern' },
    { value: 'violence', label: 'Violence or Threat' },
    { value: 'other', label: 'Other' },
  ];

  const anonymityOptions = [
    { value: '', label: 'All Reports' },
    { value: 'true', label: 'Anonymous Only' },
    { value: 'false', label: 'Authenticated Only' },
  ];

  // Check admin access
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return (
      <>
        <Navbar
          currentPage={pathname}
          variant="dashboard"
          onUserMenuClick={handleUserMenuClick}
          onSettingsClick={handleSettingsClick}
        />
        <main className="dashboard-main">
          <div className="container">
            <div className="access-denied">
              <i className="fas fa-lock"></i>
              <h2>Access Denied</h2>
              <p>You need administrator privileges to access this page.</p>
            </div>
          </div>
        </main>
        <Footer />
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <UserMenuModal
          isOpen={userMenuOpen}
          onClose={() => setUserMenuOpen(false)}
          onProfileClick={() => window.location.href = '/profile'}
          onLogoutClick={handleLogout}
        />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Navbar
          currentPage={pathname}
          variant="dashboard"
          onUserMenuClick={handleUserMenuClick}
          onSettingsClick={handleSettingsClick}
        />
        <main className="dashboard-main">
          <div className="container">
            <div className="dashboard-loading">
              <div className="spinner"></div>
              <p>Loading admin dashboard...</p>
            </div>
          </div>
        </main>
        <Footer />
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <UserMenuModal
          isOpen={userMenuOpen}
          onClose={() => setUserMenuOpen(false)}
          onProfileClick={() => window.location.href = '/profile'}
          onLogoutClick={handleLogout}
        />
      </>
    );
  }

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="dashboard"
        onUserMenuClick={handleUserMenuClick}
        onSettingsClick={handleSettingsClick}
      />

      <main className="dashboard-main">
        <div className="container">
          {/* Admin Header */}
          <div className="dashboard-header">
            <div className="dashboard-header-left">
              <h1>Admin Dashboard</h1>
              <p className="dashboard-subtitle">
                Manage and review all submitted reports
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="dashboard-stats admin-stats">
              <div className="stat-card">
                <span className="stat-value">{stats.total_reports}</span>
                <span className="stat-label">Total Reports</span>
              </div>
              <div className="stat-card warning">
                <span className="stat-value">{stats.pending_reports + stats.under_review_reports}</span>
                <span className="stat-label">Pending Review</span>
              </div>
              <div className="stat-card info">
                <span className="stat-value">{stats.in_progress_reports}</span>
                <span className="stat-label">In Progress</span>
              </div>
              <div className="stat-card success">
                <span className="stat-value">{stats.resolved_reports}</span>
                <span className="stat-label">Resolved</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.anonymous_reports}</span>
                <span className="stat-label">Anonymous</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.authenticated_reports}</span>
                <span className="stat-label">Authenticated</span>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="dashboard-filters admin-filters">
            <div className="filter-group">
              <label htmlFor="statusFilter" className="filter-label">Status</label>
              <select
                id="statusFilter"
                className="filter-select"
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="categoryFilter" className="filter-label">Category</label>
              <select
                id="categoryFilter"
                className="filter-select"
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
              >
                {categoryOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="anonymityFilter" className="filter-label">Type</label>
              <select
                id="anonymityFilter"
                className="filter-select"
                value={filters.is_anonymous === undefined ? '' : String(filters.is_anonymous)}
                onChange={(e) => handleFilterChange('is_anonymous', e.target.value === '' ? undefined : e.target.value === 'true')}
              >
                {anonymityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button 
              className="btn btn--secondary btn--sm filter-reset"
              onClick={() => setFilters({ page: 1, limit: 20 })}
            >
              <i className="fas fa-undo"></i> Reset
            </button>
          </div>

          {/* Reports List */}
          <div className="dashboard-reports admin-reports-list">
            {error && (
              <div className="error-banner" role="alert">
                <i className="fas fa-exclamation-triangle"></i>
                {error}
                <button className="btn btn--ghost btn--sm" onClick={fetchData}>
                  Retry
                </button>
              </div>
            )}

            {reports.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-file-alt"></i>
                <h3>No Reports Found</h3>
                <p>No reports match the current filters.</p>
              </div>
            ) : (
              <>
                <div className="reports-list">
                  {reports.map(report => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      variant="admin"
                      onClick={() => handleViewReport(report)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UserMenuModal
        isOpen={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        onProfileClick={() => window.location.href = '/profile'}
        onLogoutClick={handleLogout}
      />
    </>
  );
}
