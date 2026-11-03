// Admin Report Detail - VoiceED
// Detailed view of a report for administrators

'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { AdminReportDetail } from '@/components/features/report';
import { adminGetReport, getAvailableAssignees } from '@/services';
import { useAuth } from '@/hooks';

export default function AdminReportDetailPage({ params }) {
  const pathname = usePathname();
  const { isLoggedIn, currentUser, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [report, setReport] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

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
      const [reportData, assigneesData] = await Promise.all([
        adminGetReport(Number(params.id)),
        getAvailableAssignees(),
      ]);
      setReport(reportData);
      setAssignees(assigneesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const handleStatusUpdate = async (reportId, status, remarks) => {
    setUpdating(true);
    try {
      // The actual update happens in AdminReportDetail component
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async (reportId, assigneeId) => {
    setUpdating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setUpdating(false);
    }
  };

  // Check admin access
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator' && currentUser.role !== 'super_admin')) {
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
              <p>Loading report details...</p>
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

  if (error || !report) {
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
            <div className="error-state">
              <i className="fas fa-exclamation-triangle"></i>
              <h2>Report Not Found</h2>
              <p>{error || 'The report you are looking for does not exist.'}</p>
              <a href="/admin/reports" className="btn btn--primary">
                <i className="fas fa-arrow-left"></i> Back to Reports
              </a>
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
          {/* Back Button */}
          <div className="detail-header">
            <a href="/admin/reports" className="btn btn--ghost">
              <i className="fas fa-arrow-left"></i> Back to Reports
            </a>
          </div>

          <AdminReportDetail
            report={report}
            currentUser={currentUser}
            onStatusUpdate={handleStatusUpdate}
            onAssign={handleAssign}
            availableAssignees={assignees}
            isLoading={updating}
          />
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