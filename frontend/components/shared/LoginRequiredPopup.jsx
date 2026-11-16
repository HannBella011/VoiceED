// LoginRequiredPopup - VoiceED
// Small non-intrusive popup for authentication required

'use client';

import { useState, useEffect } from 'react';

export function LoginRequiredPopup({
  isOpen,
  onClose,
  message = 'You must be logged in to access this feature.',
  onGoToLogin,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  return (
    <div
      className="login-required-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
    >
      <div className="login-required-popup" onClick={(e) => e.stopPropagation()}>
        <div className="login-required-header">
          <i className="fas fa-lock" aria-hidden="true" />
          <h3 id="login-required-title">Login Required</h3>
        </div>
        <p className="login-required-message">{message}</p>
        <div className="login-required-actions">
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--primary btn--sm"
            onClick={() => {
              onClose();
              onGoToLogin();
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginRequiredPopup;
