'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { useAuth } from '@/hooks';
import { useModals } from '@/components/shared/GlobalModals';

export default function LoginPage() {
  const pathname = usePathname();
  const { settingsOpen, setSettingsOpen } = useModals();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="public"
        onLoginClick={() => {}} // No-op on login page
        onSettingsClick={handleSettingsClick}
      />

      <main className="main-content">
        <div className="container">
          <div className="register-container">
            <div className="register-card">
              <div className="register-header">
                <div className="register-icon">
                  <i className="fas fa-sign-in-alt"></i>
                </div>
                <h2>WELCOME BACK!</h2>
                <p>Sign in to access VoiceED services</p>
              </div>
              <form onSubmit={handleSubmit} className="register-form">
                {error && <div className="error-message">{error}</div>}
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <i className="fas fa-user"></i>
                </div>
                <div className="input-group">
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <i className="fas fa-lock"></i>
                </div>
                <div className="options">
                  <label>
                    <input type="checkbox" /> Remember me
                  </label>
                  <a href="/forgot-password">Forgot Password?</a>
                </div>
                <button type="submit" className="register-button" disabled={loading}>
                  {loading ? 'Signing in...' : 'Login'}
                </button>
                <p className="register-text">Don't have an account? <a href="/register">Register</a></p>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}