'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { useModals } from '@/components/shared/GlobalModals';

export default function ForgotPassword() {
  const pathname = usePathname();
  const { settingsOpen, setSettingsOpen, loginOpen, setLoginOpen } = useModals();
  const [username, setUsername] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [displayPassword, setDisplayPassword] = useState('');

  const handleLoginClick = () => {
    setLoginOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would call an API to verify the user and get their password
    // For now, we'll simulate with a mock password
    const mockPassword = 'VoiceED' + Math.random().toString(36).substring(7);
    setDisplayPassword(mockPassword);
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setDisplayPassword('');
  };

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 26 }, (_, i) => 2025 - i);

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
                <p>Enter your username to reset your password</p>
              </div>

              <form id="forgotPasswordForm" className="signup-form" onSubmit={handleSubmit}>
                <div className="form-field">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Birthday</label>
                  <div className="birthday-row">
                    <select
                      id="birthMonth"
                      value={birthMonth}
                      onChange={(e) => setBirthMonth(e.target.value)}
                      required
                    >
                      <option value="">Month</option>
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <select
                      id="birthDay"
                      value={birthDay}
                      onChange={(e) => setBirthDay(e.target.value)}
                      required
                    >
                      <option value="">Day</option>
                      {days.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <select
                      id="birthYear"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      required
                    >
                      <option value="">Year</option>
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="signup-btn">Show Password</button>

                <div className="legal-text">
                  <p>Remember your password? <a href="/login">Back to Login</a></p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Password Display Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close-button" onClick={closePasswordModal}>&times;</span>
            <h2>Your Password</h2>
            <div className="password-display">
              <p>Your password is:</p>
              <div className="password-text" id="displayPassword">{displayPassword}</div>
            </div>
            <button className="login-button" onClick={() => { window.location.href = '/login'; closePasswordModal(); }}>
              Go to Login
            </button>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}