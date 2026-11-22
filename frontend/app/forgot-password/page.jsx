'use client';

import { useBlockingLoading } from '@/components/shared/GlobalLoading';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { requestRecovery } from '@/lib/recovery';
import { useModals } from '@/components/shared/GlobalModals';

export default function ForgotPassword() {
  const pathname = usePathname();
  const { setSettingsOpen } = useModals();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useBlockingLoading(busy);
  const handleLoginClick = () => {
    window.location.href = '/login';
  };
  const handleSettingsClick = () => setSettingsOpen(true);
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      setMessage(await requestRecovery(email));
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="public"
        onLoginClick={handleLoginClick}
        onSettingsClick={handleSettingsClick}
      />

      <main className="main-content">
        <div className="container">
          <div className="register-container">
            <div className="register-card">
              <div className="register-header">
                <div className="register-icon">
                  <i className="fas fa-key"></i>
                </div>
                <h2>FORGOT PASSWORD</h2>
                <p>Enter your email to reset your password</p>
              </div>

              <form
                id="forgotPasswordForm"
                className="signup-form"
                onSubmit={handleSubmit}
              >
                {message && <p role="status">{message}</p>}
                <div className="form-field">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    autoComplete="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="signup-btn" disabled={busy}>
                  {busy ? 'Sending...' : 'Send Reset Link'}
                </button>

                <div className="legal-text">
                  <p>
                    Remember your password? <a href="/login">Back to Login</a>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
