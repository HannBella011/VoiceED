'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Navbar, Footer } from '@/components/shared';
import { useAuth } from '@/hooks';
import { useModals } from '@/components/shared/GlobalModals';
import { accountRequest } from '@/services/account';
import styles from '../../../admin.module.css';

export default function ReporterProfilePage() {
  const { id } = useParams();
  const pathname = usePathname();
  const { currentUser, isLoggedIn, isLoading } = useAuth();
  const { setSettingsOpen, setUserMenuOpen } = useModals();
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const allowed =
    !isLoading && isLoggedIn && ['admin', 'super_admin'].includes(currentUser?.role);
  const owner = `${currentUser?.id}:${currentUser?.role}:${id}`;
  const visible = result?.owner === owner ? result : null;
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setResult(null);
    accountRequest(`/reports/admin/reports/${encodeURIComponent(id)}/reporter`)
      .then((profile) => {
        if (active) setResult({ owner, profile });
      })
      .catch((error) => {
        if (active) setResult({ owner, error: error.message });
      });
    return () => {
      active = false;
    };
  }, [allowed, owner, id, revision]);
  const profile = visible?.profile;
  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="dashboard"
        onSettingsClick={() => setSettingsOpen(true)}
        onUserMenuClick={() => setUserMenuOpen(true)}
      />
      <main className={`dashboard-main ${styles.page}`}>
        <div className="container">
          <div className="detail-header">
            <a className="btn btn--secondary" href={`/admin/reports/${id}`}>
              ← Back to Report
            </a>
          </div>
          <div className={styles.header}>
            <div>
              <h1>Reporter Profile</h1>
              <p>Current account information for this report’s linked reporter.</p>
            </div>
          </div>
          {isLoading ? (
            <p role="status">Checking administrator access…</p>
          ) : !allowed ? (
            <div className="access-denied">
              <h2>Access Denied</h2>
              <p>Administrator access is required.</p>
            </div>
          ) : visible?.error ? (
            <p role="alert">
              {visible.error}{' '}
              <button
                className="btn btn--secondary"
                onClick={() => setRevision((value) => value + 1)}
              >
                Retry
              </button>
            </p>
          ) : !profile ? (
            <p role="status">Loading reporter profile…</p>
          ) : (
            <section className="wellness-card">
              <div className="card-body">
                <h2>{profile.full_name || profile.username}</h2>
                <dl className={styles.reporterFields}>
                  {Object.entries({
                    'Display name': profile.username,
                    Email: profile.email,
                    'School ID': profile.school_id,
                    Birthday: profile.birthday,
                    'User ID': profile.id,
                    'Student verification': profile.is_verified
                      ? 'Verified'
                      : 'Not verified',
                    'Member since': profile.created_at
                      ? new Date(profile.created_at).toLocaleDateString()
                      : null,
                  }).map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || 'Not provided'}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
