// Report Selection Page - VoiceED
// Entry point for report submission - choose authenticated or anonymous

'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { ReportMethodSelector } from '@/components/features/report';
import { ReportForm } from '@/components/features/report';
import { TrackingCodeDisplay } from '@/components/features/report';
import { ProtectedRoute } from '@/lib/routeProtection';
import { useAuth } from '@/hooks';
import { useModals } from '@/components/shared/GlobalModals';
import { submitReportAuthenticated, submitReportAnonymous } from '@/services';

function ReportPageContent() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const { settingsOpen, setSettingsOpen, userMenuOpen, setUserMenuOpen } = useModals();
  const [showMethodSelector, setShowMethodSelector] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [submittedReport, setSubmittedReport] = useState(null);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleMethodSelect = (method) => {
    setSelectedMethod(method);
    setShowMethodSelector(false);
  };

  const handleBackToSelector = () => {
    setSelectedMethod(null);
    setShowMethodSelector(true);
  };

  const handleSubmitSuccess = (report) => {
    // Convert to full Report object for TrackingCodeDisplay
    setSubmittedReport({
      ...report,
      description: '',
      category: 'other',
      status: 'submitted',
      is_anonymous: selectedMethod === 'anonymous',
      location: undefined,
      incident_date: undefined,
      user_id: undefined,
      assignee_id: undefined,
      assignee_name: undefined,
      reporter_email: undefined,
      created_at: new Date().toISOString(),
      updated_at: undefined,
      resolved_at: undefined,
      closed_at: undefined,
      attachments: [],
      timeline: [],
    });
  };

  const handleSubmitAnother = () => {
    setSubmittedReport(null);
    setShowMethodSelector(true);
  };

  const handleGoToTracking = (trackingCode) => {
    window.location.href = '/track/' + trackingCode;
  };

  if (submittedReport) {
    return (
      <>
        <Navbar
          currentPage={pathname}
          variant="public"
          onUserMenuClick={handleUserMenuClick}
          onSettingsClick={handleSettingsClick}
        />
        <main className="report-success-main">
          <div className="container">
            <TrackingCodeDisplay
              trackingCode={submittedReport.tracking_code}
              onGoToTracking={handleGoToTracking}
              onSubmitAnother={handleSubmitAnother}
            />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!showMethodSelector && selectedMethod) {
    const isAuthenticated = selectedMethod === 'authenticated';

    return (
      <>
        <Navbar
          currentPage={pathname}
          variant="public"
          onUserMenuClick={handleUserMenuClick}
          onSettingsClick={handleSettingsClick}
        />
        <main className="report-form-main">
          <div className="container">
            <div className="report-form-header">
              <button
                className="btn btn--ghost btn--sm"
                onClick={handleBackToSelector}
              >
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <h2>{isAuthenticated ? 'Authenticated Report Submission' : 'Anonymous Report Submission'}</h2>
              <p>{isAuthenticated ? 'Your report will be linked to your account' : 'No account required - Complete anonymity guaranteed'}</p>
            </div>
            <ReportForm
              isAuthenticated={isAuthenticated}
              onSubmitSuccess={handleSubmitSuccess}
              onBack={handleBackToSelector}
            />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="public"
        onUserMenuClick={handleUserMenuClick}
        onSettingsClick={handleSettingsClick}
      />
      <main className="report-main">
        <div className="container">
          <div className="report-hero">
            <h2>Submit a Report</h2>
            <p>
              VoiceED provides a secure channel for reporting campus safety issues,
              incidents, and student concerns without fear of retaliation.
            </p>
          </div>
          <ReportMethodSelector onSelect={handleMethodSelect} />
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function ReportPage() {
  return (
    <ProtectedRoute fallback={null}>
      <ReportPageContent />
    </ProtectedRoute>
  );
}