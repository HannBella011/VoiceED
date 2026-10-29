'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useLoginRedirect } from '@/lib/routeProtection';

export function LoginModal({ isOpen, onClose, onSwitchToRegister, onSwitchToForgotPassword }) {
  const { login, isLoggedIn } = useAuthContext();
  const { redirectAfterLogin } = useLoginRedirect();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset form when modal opens
      setUsername('');
      setPassword('');
      setError('');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await login(username, password);
      onClose?.();
      redirectAfterLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="loginModal" className={`modal ${isOpen ? 'show' : ''}`}>
      <div className="modal-content">
        <span className="close-button" onClick={onClose}>×</span>
        <h2>Login</h2>
        <form id="loginForm" onSubmit={handleSubmit}>
          {error && <div className="error-message" role="alert">{error}</div>}
          <div className="input-group">
            <input
              type="text"
              id="username"
              placeholder="Username"
              required={true}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              autoComplete="username"
            />
            <i className="fas fa-user"></i>
          </div>
          <div className="input-group">
            <input
              type="password"
              id="password"
              placeholder="Password"
              required={true}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
            <i className="fas fa-lock"></i>
          </div>
          <div className="options">
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToForgotPassword?.(); onClose(); }}>
              Forgot Password?
            </a>
          </div>
          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
          <p className="register-text">
            Don't have an account?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToRegister?.(); onClose(); }}>
              Register
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginModal;