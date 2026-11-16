'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { login } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const message = new URLSearchParams(window.location.search).get('error');
    if (message) setError(message);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      const { supabase } = await import('@/lib/supabaseClient');

      // Preserve intended destination after OAuth
      const next = sessionStorage.getItem('shielded_return_url') || '/dashboard';
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Google login failed. Please try again.'
      );
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);

      const returnUrl = sessionStorage.getItem('shielded_return_url');
      if (returnUrl) {
        sessionStorage.removeItem('shielded_return_url');
        router.replace(
          returnUrl.startsWith('/') &&
            !returnUrl.startsWith('//') &&
            !returnUrl.includes('\\')
            ? returnUrl
            : '/dashboard'
        );
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="login-page">
        {/* Centered Login Card Only - No Left Branding */}
        <div className="login-centered-container">
          <div className="login-card">
            <div className="login-card-header">
              <h2>Welcome Back</h2>
              <p>Sign in to access your VoiceED account</p>
            </div>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <form id="loginForm" onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="email" className="input-label">
                  Email
                </label>
                <div className="input-wrapper">
                  <i className="fas fa-user input-icon-left" aria-hidden="true"></i>
                  <input
                    type="email"
                    id="email"
                    placeholder="Enter your email address"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="password" className="input-label">
                  Password
                </label>
                <div className="input-wrapper">
                  <i className="fas fa-lock input-icon-left" aria-hidden="true"></i>
                  <input
                    type="password"
                    id="password"
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" /> Remember me
                </label>
                <Link href="/forgot-password" className="forgot-link">
                  Forgot Password?
                </Link>
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                    Logging in...
                  </>
                ) : (
                  'Log In'
                )}
              </button>

              <div className="divider">
                <span>or continue with</span>
              </div>

              <button
                type="button"
                className="google-button"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <img
                  src="/google.svg"
                  alt="Google"
                  className="google-icon"
                  aria-hidden="true"
                />
                <span>Continue with Google</span>
              </button>
            </form>

            <p className="register-text">
              Don&apos;t have an account? <Link href="/register">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
