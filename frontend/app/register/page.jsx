'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { useModals } from '@/components/shared/GlobalModals';

export default function RegisterPage() {
  const pathname = usePathname();
  const { settingsOpen, setSettingsOpen } = useModals();
  const [formData, setFormData] = useState({
    birthMonth: '',
    birthDay: '',
    birthYear: '',
    username: '',
    password: '',
    gender: ''
  });
  const [showNotification, setShowNotification] = useState({ visible: false, message: '', type: 'success' });

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const { birthMonth, birthDay, birthYear, username, password, gender } = formData;

    if (!birthMonth || !birthDay || !birthYear) {
      showNotify('Please select your complete birthday', 'error');
      return;
    }

    if (!username || username.length < 3 || username.length > 20) {
      showNotify('Username must be between 3-20 characters', 'error');
      return;
    }

    if (!password || password.length < 8) {
      showNotify('Password must be at least 8 characters', 'error');
      return;
    }

    // Check if username already exists
    const users = JSON.parse(localStorage.getItem('shielded_users') || '[]');
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      showNotify('Username already exists. Please choose another one.', 'error');
      return;
    }

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      username: username,
      password: password, // In production, this should be properly hashed
      birthday: birthMonth + '/' + birthDay + '/' + birthYear,
      gender: gender,
      createdAt: new Date().toISOString()
    };

    // Save user to localStorage
    users.push(newUser);
    localStorage.setItem('shielded_users', JSON.stringify(users));

    // Show success notification
    showNotify('Account created successfully! Welcome to VoiceED, ' + username + '! Please login to continue.', 'success');

    // Reset form
    setFormData({
      birthMonth: '',
      birthDay: '',
      birthYear: '',
      username: '',
      password: '',
      gender: ''
    });

    // Redirect to login after 3 seconds
    setTimeout(() => {
      window.location.href = '/login';
    }, 3000);
  };

  const showNotify = (message, type) => {
    setShowNotification({ visible: true, message, type });
    setTimeout(() => {
      setShowNotification({ visible: false, message: '', type: 'success' });
    }, 5000);
  };

  const months = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const years = Array.from({ length: 26 }, (_, i) => 2025 - i);

  const genderOptions = [
    { value: 'female', icon: '♀' },
    { value: 'male', icon: '♂' },
    { value: 'lgbtq+', icon: '⚧' }
  ];

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="public"
        onLoginClick={() => window.location.href = '/login'}
        onSettingsClick={handleSettingsClick}
      />

      <main className="main-content">
        <div className="container">
          <div className="register-container">
            <div className="register-card">
              <div className="register-header">
                <div className="register-icon">
                  <i className="fas fa-user-plus"></i>
                </div>
                <h2>SIGN UP AND MAKE YOUR VOICE HEARD!</h2>
              </div>

              <form id="registerForm" className="signup-form" onSubmit={handleSubmit}>
                {/* Birthday Field */}
                <div className="form-field">
                  <label>Birthday</label>
                  <div className="birthday-row">
                    <select
                      id="birthMonth"
                      value={formData.birthMonth}
                      onChange={(e) => handleChange('birthMonth', e.target.value)}
                      required
                    >
                      <option value="">Month</option>
                      {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <select
                      id="birthDay"
                      value={formData.birthDay}
                      onChange={(e) => handleChange('birthDay', e.target.value)}
                      required
                    >
                      <option value="">Day</option>
                      {days.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <select
                      id="birthYear"
                      value={formData.birthYear}
                      onChange={(e) => handleChange('birthYear', e.target.value)}
                      required
                    >
                      <option value="">Year</option>
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Username Field */}
                <div className="form-field">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    placeholder="Choose a unique username (3-20 characters)"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    required
                  />
                  <small style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                    Use 3-20 characters, letters and numbers only. No real names or personal info.
                  </small>
                </div>

                {/* Password Field */}
                <div className="form-field">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                {/* Gender Field */}
                <div className="form-field">
                  <label>Gender (optional)</label>
                  <div className="gender-row">
                    {genderOptions.map(opt => (
                      <label key={opt.value} className="gender-btn">
                        <input
                          type="radio"
                          name="gender"
                          value={opt.value}
                          checked={formData.gender === opt.value}
                          onChange={() => handleChange('gender', opt.value)}
                        />
                        <span className="gender-icon">{opt.icon}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="legal-text">
                  <p>By signing up, you agree to the Terms of Service and Privacy Policy</p>
                </div>

                <button type="submit" className="signup-btn">Sign Up</button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Notification Toast */}
      {showNotification.visible && (
        <div className={'notification notification-' + showNotification.type + ' show'}>
          <div className="notification-toast">
            <div className="notification-header">
              <div className="notification-icon-wrapper">
                <div className="toast-icon">
                  <i className={'fas ' + (showNotification.type === 'success' ? 'fa-check-circle' : 'fa-info-circle')}></i>
                </div>
              </div>
              <div className="notification-title-section">
                <div className="toast-title">{showNotification.type === 'success' ? 'Success!' : 'Information'}</div>
              </div>
              <div className="toast-close" onClick={() => setShowNotification({ visible: false, message: '', type: 'success' })}>
                <i className="fas fa-times"></i>
              </div>
            </div>
            <div className="notification-body">
              <div className="toast-message">{showNotification.message}</div>
            </div>
            <div className="notification-progress"></div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}