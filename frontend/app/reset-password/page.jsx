'use client';
import { useBlockingLoading } from '@/components/shared/GlobalLoading';
import { useEffect, useRef, useState } from 'react';
import { recovery } from '@/lib/recovery';
import { Navbar, Footer } from '@/components/shared';
export default function ResetPassword() {
  const started = useRef(false);
  const changed = useRef(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('Validating recovery link...');
  const [busy, setBusy] = useState(false);
  const [validating, setValidating] = useState(true);
  useBlockingLoading(busy || validating);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const validate = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') || (!params.get('code') && !params.get('token_hash')))
        throw new Error(
          'This recovery link is invalid or expired. Request a new link.'
        );
      let result;
      if (params.get('token_hash'))
        result = await recovery.auth.verifyOtp({
          token_hash: params.get('token_hash'),
          type: 'recovery',
        });
      else {
        result = await recovery.auth.exchangeCodeForSession(params.get('code'));
        if (result.data?.redirectType !== 'recovery')
          throw new Error('A password recovery link is required.');
      }
      window.history.replaceState({}, '', '/reset-password');
      if (result.error || !result.data?.session)
        throw new Error(
          'This recovery link is invalid or expired. Request a new link.'
        );
      const verified = await recovery.auth.getUser();
      if (verified.error || !verified.data.user)
        throw new Error('Unable to validate recovery session. Request a new link.');
      setValid(true);
      setMessage('Enter your new password.');
    };
    validate().catch(async (err) => {
      setMessage(err.message);
      await recovery.auth.signOut({ scope: 'local' });
    }).finally(() => setValidating(false));
  }, []);
  const submit = async (event) => {
    event.preventDefault();
    if (!valid || busy) return;
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      if (!changed.current) {
        const { error } = await recovery.auth.updateUser({ password });
        if (error) throw error;
        changed.current = true;
      }
      const session = await recovery.auth.getSession();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/auth/revoke-sessions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token || ''}`,
          },
        }
      );
      if (!response.ok)
        throw new Error(
          'Password updated, but existing API sessions could not be revoked. Please retry or contact support.'
        );
      await recovery.auth.signOut();
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setValid(false);
      setMessage('Password updated. Redirecting to login...');
      window.location.replace('/login?reset=success');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Navbar currentPage="/reset-password" variant="public" />
      <main className="main-content">
        <div className="container">
          <div className="register-container">
            <div className="register-card">
              <div className="register-header">
                <div className="register-icon">
                  <i className="fas fa-key" />
                </div>
                <h2>RESET PASSWORD</h2>
                <p role="status">{message}</p>
              </div>
              <form className="signup-form" onSubmit={submit}>
                <div className="form-field">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={!valid || busy}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    disabled={!valid || busy}
                  />
                </div>
                <button className="signup-btn" disabled={!valid || busy}>
                  Update Password
                </button>
                <div className="legal-text">
                  <a href="/forgot-password">Request a new recovery link</a>
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
