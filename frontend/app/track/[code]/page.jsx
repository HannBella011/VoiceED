// Public Tracking Page - VoiceED
// Track a report by tracking code (no auth required)

'use client';

import { usePathname, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { ReportCard } from '@/components/features/report';
import { ReportTimeline } from '@/components/features/report';
import { trackReport } from '@/services';
import { useModals } from '@/components/shared/GlobalModals';

export default function TrackingPage() {
  const pathname = usePathname();
  const params = useParams();
  const { settingsOpen, setSettingsOpen } = useModals();
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        let access = fragment.get('access');
        try {
          access ||= sessionStorage.getItem(`voiceed:report-access:${params.code}`);
          if (fragment.has('access')) {
            sessionStorage.setItem(`voiceed:report-access:${params.code}`, access);
            window.history.replaceState(
              window.history.state,
              '',
              window.location.pathname + window.location.search
            );
          }
        } catch {
          // Private browsing can block storage; the fragment still authorizes this request.
        }
        const data = await trackReport(params.code, access);
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [params.code]);

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  if (isLoading) {
    return (
      <>
        <Navbar
          currentPage={pathname}
          variant="public"
          onSettingsClick={handleSettingsClick}
        />
        <main className="tracking-main">
          <div className="container">
            <div className="tracking-loading">
              <div className="spinner"></div>
              <p>Loading report...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !report) {
    return (
      <>
        <Navbar
          currentPage={pathname}
          variant="public"
          onSettingsClick={handleSettingsClick}
        />
        <main className="tracking-main">
          <div className="container">
            <div className="tracking-error">
              <i className="fas fa-exclamation-triangle"></i>
              <h2>Report Not Found</h2>
              <p>
                {error || 'The tracking code you entered does not match any report.'}
              </p>
              <a href="/report" className="btn btn--primary">
                <i className="fas fa-plus"></i> Submit a New Report
              </a>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const formatStatus = (status) => {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStatusColor = (status) => {
    const colors = {
      submitted: '#3498db',
      under_review: '#f39c12',
      assigned: '#9b59b6',
      in_progress: '#2980b9',
      awaiting_additional_info: '#e67e22',
      resolved: '#27ae60',
      closed: '#7f8c8d',
    };
    return colors[status] || '#7f8c8d';
  };

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="public"
        onSettingsClick={handleSettingsClick}
      />

      <main className="tracking-main">
        <div className="container">
          {/* Report Header */}
          <div className="tracking-header">
            <div className="tracking-header-content">
              <h1>Report Tracking</h1>
              <div className="tracking-code-display">
                <span className="code-label">Tracking Code:</span>
                <code>{report.tracking_code}</code>
                <button
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(report.tracking_code)}
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
            </div>

            <div className="tracking-status">
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(report.status) }}
              >
                {formatStatus(report.status)}
              </span>
            </div>
          </div>

          {report.access_required && (
            <p role="status">
              This code shows limited status only. Open the private tracking link saved
              after submission for detailed updates and shared evidence. Account owners
              and authorized staff can also view their reports while signed in.
            </p>
          )}
          {/* Report Summary Card */}
          <ReportCard report={report} variant="tracking" />

          {/* Timeline */}
          <div className="tracking-timeline-section">
            <h3>Progress Timeline</h3>
            <ReportTimeline
              timeline={report.timeline || []}
              currentStatus={report.status}
            />
          </div>

          {/* Help */}
          <div className="tracking-help-section">
            <h3>Need Help?</h3>
            <p>
              If you have questions about this report, contact the VoiceED support team.
            </p>
            <a href="/contacts" className="btn btn--secondary">
              <i className="fas fa-envelope"></i> Contact Support
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
