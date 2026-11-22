// Admin Reports List - VoiceED
// Admin dashboard for managing all reports

'use client';

import { useBlockingLoading } from '@/components/shared/GlobalLoading';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ReportCard } from '@/components/features/report';
import { adminListReports, getAdminStats, getAvailableAssignees } from '@/services';
import { useAuth } from '@/hooks';
import styles from '../admin.module.css';
import ReportWorkloads from '@/components/features/report/ReportWorkloads';

export default function AdminReportsPage() {
  const pathname = usePathname();
  const { isLoggedIn, currentUser, logout, isLoading: authLoading } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [workloadRevision, setWorkloadRevision] = useState(0);
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
  const [search, setSearch] = useState('');
  const requestSequence = useRef(0);
  const allowed =
    !authLoading && isLoggedIn && ['admin', 'super_admin'].includes(currentUser?.role);
  useBlockingLoading(allowed && isLoading && !stats);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('status');
    if (
      [
        'submitted',
        'under_review',
        'assigned',
        'in_progress',
        'awaiting_additional_info',
        'resolved',
        'closed',
      ].includes(value)
    )
      setFilters((previous) => ({ ...previous, status: value, page: 1 }));
  }, []);
  useEffect(() => {
    const identity = new URLSearchParams(window.location.search).get('assignee_id');
    if (identity)
      setFilters((previous) => ({ ...previous, assignee_id: identity, page: 1 }));
  }, []);
  useEffect(() => {
    if (search.trim() === (filters.search || '')) return;
    const timer = setTimeout(
      () =>
        setFilters((previous) => ({
          ...previous,
          search: search.trim() || undefined,
          page: 1,
        })),
      300
    );
    return () => clearTimeout(timer);
  }, [search, filters.search]);

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
    if (!allowed) return;
    const sequence = ++requestSequence.current;
    setIsLoading(true);
    setError(null);
    try {
      const [reportsData, statsData, assigneesData] = await Promise.all([
        adminListReports(filters),
        getAdminStats(),
        getAvailableAssignees(),
      ]);
      if (sequence !== requestSequence.current) return;
      setReports(reportsData.items);
      setTotal(reportsData.total);
      setTotalPages(reportsData.total_pages);
      setStats(statsData);
      setAssignees(assigneesData);
    } catch (err) {
      if (sequence === requestSequence.current)
        setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      requestSequence.current++;
    };
  }, [
    allowed,
    currentUser?.id,
    filters.page,
    filters.status,
    filters.category,
    filters.is_anonymous,
    filters.search,
    filters.assignee_id,
  ]);

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
  if (!authLoading && !allowed) {
    return (
      <>
        <Navbar
          currentPage={pathname}
          variant="dashboard"
          onUserMenuClick={handleUserMenuClick}
          onSettingsClick={handleSettingsClick}
        />
        <main className={`dashboard-main ${styles.page}`}>
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
          onProfileClick={() => (window.location.href = '/profile')}
          onLogoutClick={handleLogout}
        />
      </>
    );
  }

  if (authLoading || (isLoading && !stats)) {
    return (
      <>
        <Navbar
          currentPage={pathname}
          variant="dashboard"
          onUserMenuClick={handleUserMenuClick}
          onSettingsClick={handleSettingsClick}
        />
        <main className={`dashboard-main ${styles.page}`}>
          <div className="container">
            <div className="dashboard-loading">
              <p role="status">
                {authLoading ? 'Checking administrator access…' : 'Loading reports…'}
              </p>
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

      <main className={`dashboard-main ${styles.page}`}>
        <div className="container">
          {/* Admin Header */}
          <div className={styles.header}>
            <div className="dashboard-header-left">
              <h1>Reports Dashboard</h1>
              <p className="dashboard-subtitle">
                Manage and review all submitted reports
              </p>
            </div>
          </div>

          {currentUser.role === 'super_admin' ? (
            <>
              <section aria-label="Report statistics">
                <h2>Report Overview</h2>
                <div className={styles.stats}>
                  {[
                    ['total_reports', 'Total Reports', ''],
                    ['pending_reports', 'Submitted', 'submitted'],
                    ['under_review_reports', 'Under Review', 'under_review'],
                    ['assigned_reports', 'Assigned', 'assigned'],
                    ['in_progress_reports', 'In Progress', 'in_progress'],
                    [
                      'awaiting_additional_info_reports',
                      'Awaiting Additional Info',
                      'awaiting_additional_info',
                    ],
                    ['resolved_reports', 'Resolved', 'resolved'],
                    ['closed_reports', 'Closed', 'closed'],
                  ].map(([key, label, status]) => (
                    <a
                      key={key}
                      className="stat-card"
                      href={`/admin/reports${status ? `?status=${status}` : ''}`}
                    >
                      <span className="stat-value">{stats?.[key] ?? '\u2014'}</span>
                      <span className="stat-label">{label}</span>
                    </a>
                  ))}
                </div>
              </section>
              <ReportWorkloads
                currentUser={currentUser}
                revision={workloadRevision}
                oversight
              />
            </>
          ) : (
            <ReportWorkloads currentUser={currentUser} revision={workloadRevision} />
          )}

          {/* Filters */}
          <div className={`${styles.filters} ${styles.filterBar}`}>
            <div className="filter-group">
              <label htmlFor="assigneeFilter" className="filter-label">
                Assigned administrator
              </label>
              <select
                id="assigneeFilter"
                value={filters.assignee_id || ''}
                onChange={(event) =>
                  handleFilterChange('assignee_id', event.target.value || undefined)
                }
              >
                <option value="">All administrators</option>
                {filters.assignee_id &&
                  !assignees.some(
                    (user) => String(user.id) === filters.assignee_id
                  ) && (
                    <option value={filters.assignee_id}>Selected administrator</option>
                  )}
                {assignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="adminReportSearch" className="filter-label">
                Search reports
              </label>
              <input
                id="adminReportSearch"
                className="search-input"
                maxLength={200}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Title, description or tracking code"
              />
            </div>
            <div className="filter-group">
              <label htmlFor="statusFilter" className="filter-label">
                Status
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
            <div className="filter-group">
              <label htmlFor="categoryFilter" className="filter-label">
                Category
              </label>
              <select
                id="categoryFilter"
                className="filter-select"
                value={filters.category || ''}
                onChange={(e) =>
                  handleFilterChange('category', e.target.value || undefined)
                }
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="anonymityFilter" className="filter-label">
                Type
              </label>
              <select
                id="anonymityFilter"
                className="filter-select"
                value={
                  filters.is_anonymous === undefined ? '' : String(filters.is_anonymous)
                }
                onChange={(e) =>
                  handleFilterChange(
                    'is_anonymous',
                    e.target.value === '' ? undefined : e.target.value === 'true'
                  )
                }
              >
                {anonymityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterActions}>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={isLoading}
                onClick={() => {
                  setWorkloadRevision((value) => value + 1);
                  fetchData();
                }}
              >
                Refresh
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--sm filter-reset"
                onClick={() => {
                  setSearch('');
                  setFilters({ page: 1, limit: 20 });
                }}
              >
                <i className="fas fa-undo"></i> Clear filters
              </button>
            </div>
          </div>

          {/* Reports List */}
          <div className="dashboard-reports admin-reports-list">
            {isLoading && <p role="status">Loading reports…</p>}
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
                  {reports.map((report) => (
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
          <div className={styles.pagination} aria-label="Report pages">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={isLoading || filters.page === 1}
              onClick={() => handlePageChange(filters.page - 1)}
            >
              Previous
            </button>
            <span>
              Page {filters.page} of {Math.max(1, totalPages)} · {total} reports
            </span>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={isLoading || filters.page >= totalPages}
              onClick={() => handlePageChange(filters.page + 1)}
            >
              Next
            </button>
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
