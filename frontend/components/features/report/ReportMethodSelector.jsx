// ReportMethodSelector - VoiceED
// Component for choosing between authenticated and anonymous reporting

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';

export function ReportMethodSelector({ onMethodSelect }) {
  const router = useRouter();
  const { isLoggedIn, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthenticatedClick = async () => {
    if (!isLoggedIn) {
      setIsLoading(true);
      // Redirect to login with return URL
      router.push(`/login?redirect=/report/submit&method=authenticated`);
      return;
    }
    onMethodSelect('authenticated');
  };

  const handleAnonymousClick = () => {
    onMethodSelect('anonymous');
  };

  return (
    <div className="report-method-selector">
      <div className="method-selector-header">
        <h2>How would you like to submit your report?</h2>
        <p className="method-selector-subtitle">
          Choose the option that best fits your needs. Both methods use the same secure
          form.
        </p>
      </div>

      <div className="method-cards">
        {/* Authenticated Option */}
        <div className="method-card method-card--authenticated">
          <div className="method-card-icon">
            <i className="fas fa-user-shield"></i>
          </div>
          <h3>Submit as Logged-in User</h3>
          <p className="method-card-description">
            Your report will be linked to your VoiceED account. You can track all your
            reports from your dashboard and receive email updates.
          </p>

          <ul className="method-features">
            <li>
              <i className="fas fa-check"></i> View all submitted reports in your
              dashboard
            </li>
            <li>
              <i className="fas fa-check"></i> Automatic email notifications
            </li>
            <li>
              <i className="fas fa-check"></i> Reports linked to your account history
            </li>
            <li>
              <i className="fas fa-check"></i> Administrators can contact you if needed
            </li>
          </ul>

          <button
            className={`method-card-btn ${isLoggedIn ? '' : 'btn--secondary'}`}
            onClick={handleAuthenticatedClick}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Redirecting to login...
              </>
            ) : isLoggedIn ? (
              'Continue as Logged-in User'
            ) : (
              'Login to Continue'
            )}
          </button>

          {!isLoggedIn && (
            <p className="method-card-note">
              <i className="fas fa-info-circle"></i>
              You will be redirected to login, then returned here.
            </p>
          )}
        </div>

        {/* Anonymous Option */}
        <div className="method-card method-card--anonymous">
          <div className="method-card-icon">
            <i className="fas fa-user-secret"></i>
          </div>
          <h3>Submit Anonymously</h3>
          <p className="method-card-description">
            No account required. Your identity will never be stored or shared with
            administrators. Optionally provide an email for updates.
          </p>

          <ul className="method-features">
            <li>
              <i className="fas fa-check"></i> No account or login required
            </li>
            <li>
              <i className="fas fa-check"></i> No personally identifying information
              stored
            </li>
            <li>
              <i className="fas fa-check"></i> Complete anonymity guaranteed
            </li>
            <li>
              <i className="fas fa-check"></i> Optional email for tracking updates
            </li>
          </ul>

          <div className="anonymous-warning">
            <i className="fas fa-exclamation-triangle"></i>
            <span>
              <strong>Important:</strong> If you don't provide an email, save your
              tracking code immediately after submission. It cannot be recovered if
              lost.
            </span>
          </div>

          <button className="method-card-btn" onClick={handleAnonymousClick}>
            Submit Anonymously
          </button>
        </div>
      </div>

      <div className="method-selector-footer">
        <p>
          <i className="fas fa-lock"></i>
          All reports are encrypted and handled according to our strict privacy policy.
        </p>
      </div>
    </div>
  );
}

export default ReportMethodSelector;
