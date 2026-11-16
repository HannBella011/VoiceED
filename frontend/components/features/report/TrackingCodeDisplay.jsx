// TrackingCodeDisplay - VoiceED
// Component to display tracking code after successful submission

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function TrackingCodeDisplay({ report, isAnonymous, reporterEmail }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showTrackingPage, setShowTrackingPage] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(report.tracking_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = report.tracking_code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoToTracking = () => {
    router.push(`/track/${report.tracking_code}`);
  };

  const handleSubmitAnother = () => {
    router.push('/report');
  };

  return (
    <div className="tracking-code-display">
      {/* Success Header */}
      <div className="success-header">
        <div className="success-icon">
          <i className="fas fa-check-circle"></i>
        </div>
        <h2>Report Submitted Successfully</h2>
        <p className="success-message">
          Your report has been received and is now being reviewed by our team.
        </p>
      </div>

      {/* Tracking Code Card */}
      <div className="tracking-code-card">
        <div className="tracking-code-header">
          <h3>Your Tracking Code</h3>
          <p className="tracking-code-subtitle">
            Save this code to track your report status
          </p>
        </div>

        <div className="tracking-code-value">
          <code>{report.tracking_code}</code>
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={copyToClipboard}
            aria-label={copied ? 'Copied!' : 'Copy tracking code'}
          >
            {copied ? (
              <>
                <i className="fas fa-check"></i> Copied!
              </>
            ) : (
              <>
                <i className="fas fa-copy"></i> Copy
              </>
            )}
          </button>
        </div>

        <div className="tracking-code-meta">
          <div className="meta-item">
            <span className="meta-label">Report ID</span>
            <span className="meta-value">#{report.id}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Submitted</span>
            <span className="meta-value">
              {new Date(report.created_at).toLocaleString()}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Status</span>
            <span className={`meta-value status-badge status-${report.status}`}>
              {report.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          </div>
        </div>

        {/* Anonymous Warning */}
        {isAnonymous && !reporterEmail && (
          <div className="anonymous-warning-banner">
            <i className="fas fa-exclamation-triangle"></i>
            <div>
              <strong>Important:</strong> You did not provide an email address.
              <strong>This tracking code cannot be recovered if lost.</strong>
              Please save it in a secure place.
            </div>
          </div>
        )}

        {/* Email Provided Notice */}
        {isAnonymous && reporterEmail && (
          <div className="email-notice-banner">
            <i className="fas fa-envelope"></i>
            <div>
              Your tracking code has been sent to <strong>{reporterEmail}</strong>. You
              will receive status updates at this email.
            </div>
          </div>
        )}

        {/* Authenticated Notice */}
        {!isAnonymous && (
          <div className="authenticated-notice-banner">
            <i className="fas fa-user-check"></i>
            <div>
              This report is linked to your account. You can view it anytime in your
              <a href="/dashboard/reports">dashboard</a>.
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="tracking-actions">
        <button className="btn btn--primary btn--large" onClick={handleGoToTracking}>
          <i className="fas fa-search"></i> Track My Report
        </button>

        <button className="btn btn--secondary btn--large" onClick={handleSubmitAnother}>
          <i className="fas fa-plus"></i> Submit Another Report
        </button>
      </div>

      {/* Help Text */}
      <div className="tracking-help">
        <h4>What happens next?</h4>
        <ul>
          <li>
            <i className="fas fa-clock"></i> Your report enters the review queue
          </li>
          <li>
            <i className="fas fa-user-shield"></i> Our team assesses the situation
          </li>
          <li>
            <i className="fas fa-bell"></i> You'll receive updates via email (if
            provided)
          </li>
          <li>
            <i className="fas fa-check-circle"></i> Track progress anytime with your
            code
          </li>
        </ul>
      </div>
    </div>
  );
}

export default TrackingCodeDisplay;
