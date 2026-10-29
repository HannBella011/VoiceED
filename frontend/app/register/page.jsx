'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, LoginModal } from '@/components/shared';
import { useAuthContext } from '@/context/AuthContext';

export default function Register() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuthContext();

  const handleLoginClick = () => {
    setLoginOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const gender = formData.get('gender') as string;
    const birthMonth = formData.get('birthMonth') as string;
    const birthDay = formData.get('birthDay') as string;
    const birthYear = formData.get('birthYear') as string;
    const termsAccepted = formData.get('termsAccepted') === 'on';

    try {
      await register({
        username,
        email,
        password,
        confirmPassword,
        gender: gender || undefined,
        birthday: birthMonth && birthDay && birthYear ? { month: birthMonth, day: birthDay, year: birthYear } : undefined,
        termsAccepted,
      });
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
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
                  <i className="fas fa-user-plus"></i>
                </div>
                <h2>SIGN UP AND MAKE YOUR VOICE HEARD!</h2>
              </div>

              <form id="registerForm" className="signup-form" onSubmit={handleRegister}>
                {error && <div className="error-message" style={{ color: '#ff6b6b', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
                
                {/* Birthday Field */}
                <div className="form-field">
                  <label>Birthday</label>
                  <div className="birthday-row">
                    <select id="birthMonth" name="birthMonth" required={true}>
                      <option value="">Month</option>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                    <select id="birthDay" name="birthDay" required={true}>
                      <option value="">Day</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                      <option value="9">9</option>
                      <option value="10">10</option>
                      <option value="11">11</option>
                      <option value="12">12</option>
                      <option value="13">13</option>
                      <option value="14">14</option>
                      <option value="15">15</option>
                      <option value="16">16</option>
                      <option value="17">17</option>
                      <option value="18">18</option>
                      <option value="19">19</option>
                      <option value="20">20</option>
                      <option value="21">21</option>
                      <option value="22">22</option>
                      <option value="23">23</option>
                      <option value="24">24</option>
                      <option value="25">25</option>
                      <option value="26">26</option>
                      <option value="27">27</option>
                      <option value="28">28</option>
                      <option value="29">29</option>
                      <option value="30">30</option>
                      <option value="31">31</option>
                    </select>
                    <select id="birthYear" name="birthYear" required={true}>
                      <option value="">Year</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                      <option value="2021">2021</option>
                      <option value="2020">2020</option>
                      <option value="2019">2019</option>
                      <option value="2018">2018</option>
                      <option value="2017">2017</option>
                      <option value="2016">2016</option>
                      <option value="2015">2015</option>
                      <option value="2014">2014</option>
                      <option value="2013">2013</option>
                      <option value="2012">2012</option>
                      <option value="2011">2011</option>
                      <option value="2010">2010</option>
                      <option value="2009">2009</option>
                      <option value="2008">2008</option>
                      <option value="2007">2007</option>
                      <option value="2006">2006</option>
                      <option value="2005">2005</option>
                      <option value="2004">2004</option>
                      <option value="2003">2003</option>
                      <option value="2002">2002</option>
                      <option value="2001">2001</option>
                      <option value="2000">2000</option>
                    </select>
                  </div>
                </div>

                {/* Username Field */}
                <div className="form-field">
                  <label htmlFor="username">Username</label>
                  <input type="text" id="username" name="username" placeholder="Choose a unique username (3-20 characters)" required={true} />
                  <small style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.85rem", marginTop: "0.25rem", display: "block" }}>
                    Use 3-20 characters, letters and numbers only. No real names or personal info.
                  </small>
                </div>

                {/* Email Field */}
                <div className="form-field">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" placeholder="Enter your email address" required={true} />
                </div>

                {/* Password Field */}
                <div className="form-field">
                  <label htmlFor="password">Password</label>
                  <input type="password" id="password" name="password" placeholder="At least 6 characters" required={true} minLength="6" />
                </div>

                {/* Confirm Password Field */}
                <div className="form-field">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm your password" required={true} minLength="6" />
                </div>

                {/* Gender Field */}
                <div className="form-field">
                  <label>Gender (optional)</label>
                  <div className="gender-row">
                    <label className="gender-btn">
                      <input type="radio" name="gender" value="female" />
                      <span className="gender-icon">♀</span>
                    </label>
                    <label className="gender-btn">
                      <input type="radio" name="gender" value="male" />
                      <span className="gender-icon">♂</span>
                    </label>
                    <label className="gender-btn">
                      <input type="radio" name="gender" value="lgbtq+" />
                      <span className="gender-icon">⚧</span>
                    </label>
                  </div>
                </div>

                {/* Terms */}
                <div className="form-field">
                  <label className="checkbox-label">
                    <input type="checkbox" name="termsAccepted" required={true} />
                    <span>I agree to the Terms of Service and Privacy Policy</span>
                  </label>
                </div>

                <button type="submit" className="signup-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating Account...' : 'Sign Up'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => window.location.href = '/register'}
        onSwitchToForgotPassword={() => window.location.href = '/forgot-password'}
      />
    </>
  );
}