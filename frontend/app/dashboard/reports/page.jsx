// User Dashboard Reports - VoiceED
// List of reports submitted by the authenticated user

'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ReportCard } from '@/components/features/report';
import { getMyReports } from '@/services';
import { useAuth } from '@/hooks';

export default function DashboardReportsPage() {
  const pathname = usePathname();
  const { isLoggedIn, currentUser, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: undefined,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

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

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyReports(filters);
      setReports(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filters.page, filters.status]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleViewReport = (report) => {
    window.location.href = '/track/' + report.tracking_code;
  };

  const handleNewReport = () => {
    window.location.href = '/report';
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
              <p>Loading your reports...</p>
            </div>
          </div>
        </main>
        <Footer />
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <UserMenuModal
          isOpen={userMenuOpen}
          onClose={() => setUserMenuOpen(false)}
          onProfileClick={() => (window.location.href = '/profile')}
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
          {/* Dashboard Header */}
          <div className="dashboard-header">
            <div className="dashboard-header-left">
              <h1>My Reports</h1>
              <p className="dashboard-subtitle">
                Track and manage all your submitted reports
              </p>
            </div>
            <div className="dashboard-header-right">
              <a href="/report" className="btn btn--primary">
                <i className="fas fa-plus"></i> Submit New Report
              </a>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="dashboard-stats">
            <div className="stat-card">
              <span className="stat-value">{total}</span>
              <span className="stat-label">Total Reports</span>
            </div>
            <div className="stat-card warning">
              <span className="stat-value">
                {
                  reports.filter(
                    (r) => r.status === 'submitted' || r.status === 'under_review'
                  ).length
                }
              </span>
              <span className="stat-label">Pending Review</span>
            </div>
            <div className="stat-card info">
              <span className="stat-value">
                {
                  reports.filter(
                    (r) => r.status === 'in_progress' || r.status === 'assigned'
                  ).length
                }
              </span>
              <span className="stat-label">In Progress</span>
            </div>
            <div className="stat-card success">
              <span className="stat-value">
                {
                  reports.filter(
                    (r) => r.status === 'resolved' || r.status === 'closed'
                  ).length
                }
              </span>
              <span className="stat-label">Resolved</span>
            </div>
          </div>

          {/* Filters */}
          <div className="dashboard-filters">
            <div className="filter-group">
              <label htmlFor="statusFilter" className="filter-label">
                Filter by Status
              </label>
              <select
                id="statusFilter"
                className="filter-select"
                value={filters.status || ''}
                onChange={(e) =>
                  handleFilterChange('status', e.target.value || undefined)
                }
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reports List */}
          <div className="dashboard-reports">
            {error && (
              <div className="error-banner" role="alert">
                <i className="fas fa-exclamation-triangle"></i>
                {error}
                <button className="btn btn--ghost btn--sm" onClick={fetchReports}>
                  Retry
                </button>
              </div>
            )}

            {reports.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-file-alt"></i>
                <h3>No Reports Yet</h3>
                <p>You haven't submitted any reports yet.</p>
                <a href="/report" className="btn btn--primary">
                  <i className="fas fa-plus"></i> Submit Your First Report
                </a>
              </div>
            ) : (
              <>
                <div className="reports-list">
                  {reports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      variant="user"
                      onClick={() => handleViewReport(report)}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => handlePageChange((filters.page || 1) - 1)}
                      disabled={(filters.page || 1) === 1}
                    >
                      <i className="fas fa-chevron-left"></i> Previous
                    </button>
                    <span className="pagination-info">
                      Page {filters.page || 1} of {totalPages} ({total} total)
                    </span>
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => handlePageChange((filters.page || 1) + 1)}
                      disabled={(filters.page || 1) === totalPages}
                    >
                      Next <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
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
        onProfileClick={() => (window.location.href = '/profile')}
        onLogoutClick={handleLogout}
      />
    </>
  );
}
