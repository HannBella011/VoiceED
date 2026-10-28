'use client';

import { useEffect } from 'react';

export function LoginModal({ isOpen, onClose, onSwitchToRegister, onSwitchToForgotPassword }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div id="loginModal" className={`modal ${isOpen ? 'show' : ''}`}>
      <div className="modal-content">
        <span className="close-button" onClick={onClose}>×</span>
        <h2>Login</h2>
        <form id="loginForm">
          <div className="input-group">
            <input type="text" id="username" placeholder="Username" required={true} />
            <i className="fas fa-user"></i>
          </div>
          <div className="input-group">
            <input type="password" id="password" placeholder="Password" required={true} />
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
          <button type="submit" className="login-button">Login</button>
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