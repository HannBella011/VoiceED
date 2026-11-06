'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Navbar, Footer } from '@/components/shared';
import { useModals } from '@/components/shared/GlobalModals';
import { useAuthContext } from '@/context/AuthContext';

// Force Turbopack recompile - v2
export default function ContactsPage() {
  const pathname = usePathname();
  const { settingsOpen, setSettingsOpen, setLoginRequiredOpen, userMenuOpen, setUserMenuOpen } = useModals();
  const { currentUser, isLoggedIn } = useAuthContext();

  const handleLoginClick = () => {
    if (isLoggedIn && currentUser) {
      setUserMenuOpen(true);
    } else {
      setLoginRequiredOpen(true);
    }
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const [submitState, setSubmitState] = useState('');
  const [sending, setSending] = useState(false);
  const handleSubmit = async e => {
    e.preventDefault(); if (sending) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    setSending(true); setSubmitState('');
    try {
      const token = localStorage.getItem('access_token');
      const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/messages/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'Unable to send message');
      setSubmitState('Thank you! Your message has been sent.'); form.reset();
    } catch(err) { setSubmitState(err.message); }
    finally { setSending(false); }
  };

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="public"
        onLoginClick={handleLoginClick}
        onSettingsClick={handleSettingsClick}
      />

      <main className="services-main">
        <div className="container">
          <div className="services-welcome">
            <h2>Contact Us</h2>
            <p>Get in touch with VoiceED team for support, partnerships, or any questions about our platform and services.</p>
          </div>

          <div className="services-container">
                <div className="service-box">
                  <div className="service-header">
                    <div className="service-icon"><i className="fas fa-envelope"></i></div>
                    <h3>Contact Us</h3>
                  </div>
                  <div className="service-details">
                    <p>Send us a message and we'll get back to you as soon as possible. Whether you're a student, educator, or potential partner, we're here to help.</p>
                    {submitState && <p role="status">{submitState}</p>}
                <form className="contact-form" id="contactForm" onSubmit={handleSubmit}>
                      <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input type="text" id="name" name="name" placeholder="Enter your full name" required />
                      </div>
                      <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input type="email" id="email" name="email" placeholder="Enter your email address" required />
                      </div>
                      <div className="form-group">
                        <label htmlFor="subject">Subject</label>
                        <input type="text" id="subject" name="subject" placeholder="What is this regarding?" required />
                      </div>
                      <div className="form-group">
                        <label htmlFor="message">Message</label>
                        <textarea id="message" name="message" placeholder="Tell us more about your inquiry..." rows="5" required></textarea>
                      </div>
                      <button disabled={sending} type="submit" className="cta-button">Send Message</button>
                    </form>
                  </div>
                </div>

            {/* Emergency Support */}
            <div className="service-box">
              <div className="service-header">
                <div className="service-icon">
                  <i className="fas fa-phone-alt"></i>
                </div>
                <h3>Emergency Support</h3>
              </div>
              <div className="service-details">
                <p>For urgent matters requiring immediate attention, reach out through our emergency channels.</p>
                <p>Note: We do not provide specific emergency numbers here, as they vary by country and location. Please use your local emergency hotline for immediate assistance.</p>

                {/* Sub-container 1: Specialized Global Hotlines for Students */}
                <div className="emergency-sub-container">
                  <div className="emergency-header">
                    <div className="emergency-icon"><i className="fas fa-globe"></i></div>
                    <h4>Specialized Global Hotlines for Students</h4>
                  </div>
                  <div className="emergency-content">
                    <ul>
                      <li><strong>Find a Helpline (International Directory)</strong> – Connects students worldwide to local crisis hotlines for abuse, crime, and emotional support.</li>
                      <li><strong>TeenHelp Hotlines</strong> – Covers substance use, peer pressure, bullying, and abuse, accessible 24/7.</li>
                      <li><strong>UNODC Youth Initiative</strong>  – Empowers students globally to report drug-related issues, crime prevention, and peer-led safety programs.</li>
                      <li><strong>UNODC Global Programs</strong> – Supports youth in crime prevention, anti-drug campaigns, and safe community building.</li>
                    </ul>
                  </div>
                </div>

                {/* Sub-container 2: Student-Specific Safety Channels */}
                <div className="emergency-sub-container">
                  <div className="emergency-header">
                    <div className="emergency-icon"><i className="fas fa-shield-alt"></i></div>
                    <h4>Student-Specific Safety Channels</h4>
                  </div>
                  <div className="emergency-content">
                    <ul>
                      <li><strong>Campus Security Hotlines</strong> – Most universities maintain dedicated student safety hotlines for reporting drugs, crime, or harassment.</li>
                      <li><strong>Anonymous Reporting Tools</strong> – Platforms like VoiceED allow students to report issues without fear of exposure.</li>
                      <li><strong>Youth NGOs & Peer Networks</strong>– Many student organizations partner with local police and UNODC to run awareness campaigns and provide confidential peer support.</li>
                    </ul>
                  </div>
                </div>

                {/* Horizontal container for last two sub-containers */}
                <div className="emergency-horizontal-container">
                  {/* Sub-container 3: Risks & Action Steps */}
                  <div className="emergency-sub-container">
                    <div className="emergency-header">
                      <div className="emergency-icon"><i className="fas fa-exclamation-triangle"></i></div>
                      <h4>Risks & Action Steps</h4>
                    </div>
                    <div className="emergency-content">
                      <ul>
                        <li><strong>Immediate Danger:</strong> Call local emergency services (911/999)</li>
                        <li><strong>Mental Health Crisis:</strong> Contact crisis hotlines immediately</li>
                        <li><strong>Cyberbullying:</strong> Document evidence, report, seek support</li>
                        <li><strong>Physical Threat:</strong> Move to safe location, contact authorities</li>
                        <li><strong>Substance Abuse:</strong> Seek medical help, call recovery hotlines</li>
                        <li><strong>Academic Pressure:</strong> Reach out to counselors, use stress resources</li>
                      </ul>
                    </div>
                  </div>

                  {/* Sub-container 4: Actionable Advice for Students */}
                  <div className="emergency-sub-container">
                    <div className="emergency-header">
                      <div className="emergency-icon"><i className="fas fa-lightbulb"></i></div>
                      <h4>Actionable Advice for Students</h4>
                    </div>
                    <div className="emergency-content">
                      <ul>
                        <li><strong>1. Memorize your local emergency number</strong></li>
                        <li><strong>2. Use Find a Helpline for international crisis support when abroad</strong></li>
                        <li><strong>3. Engage with UNODC Youth Initiative for drug prevention and crime safety programs</strong></li>
                        <li><strong>4. Leverage campus security & anonymous reporting tools for immediate student-focused protection</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}