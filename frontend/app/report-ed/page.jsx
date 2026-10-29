'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { ProtectedRoute } from '@/lib/routeProtection';

function ReportEdContent() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="wellness"
        onUserMenuClick={handleUserMenuClick}
        onSettingsClick={handleSettingsClick}
      />

      <main className="wellness-main">
        <div className="container">
          <div className="wellness-hero">
            <h2>ReportED</h2>
            <p>A secure channel for reporting campus safety issues, incidents, and student concerns without fear of retaliation.</p>
          </div>

          {/* Immediate Help Section */}
          <div className="immediate-help-section">
            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <h3>Immediate Help Area</h3>
              </div>
              <div className="card-body">
                <p className="card-description">"If you or someone else is in immediate danger, please contact emergency services directly."</p>
                <div className="emergency-links">
                  <a href="tel:911" className="emergency-btn">
                    <i className="fas fa-phone"></i>
                    <span>Emergency Services</span>
                    <span className="emergency-number">911</span>
                  </a>
                  <a href="tel:1553" className="emergency-btn">
                    <i className="fas fa-heartbeat"></i>
                    <span>Mental Health Crisis</span>
                    <span className="emergency-number">1553</span>
                  </a>
                  <a href="https://www.google.com/maps/search/hospitals+near+me" target="_blank" className="emergency-btn">
                    <i className="fas fa-hospital"></i>
                    <span>Find Hospital</span>
                    <span className="emergency-number">Near Me</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Process Section */}
          <div className="wellness-grid">
            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-inbox"></i>
                </div>
                <h3>1. Received</h3>
              </div>
              <div className="card-body">
                <p className="card-description">Your report is securely routed to the VoiceED review team.</p>
              </div>
            </div>
            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-search"></i>
                </div>
                <h3>2. Reviewed</h3>
              </div>
              <div className="card-body">
                <p className="card-description">We assess the situation and coordinate with the appropriate campus authorities or counselors.</p>
              </div>
            </div>
            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <h3>3. Action</h3>
              </div>
              <div className="card-body">
                <p className="card-description">Appropriate interventions are made to ensure a safe learning environment.</p>
              </div>
            </div>
          </div>

          {/* Help Resources Map Section */}
          <div className="help-map-section">
            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-map-marked-alt"></i>
                </div>
                <h3>Find Help Near You</h3>
              </div>
              <div className="card-body">
                <p className="card-description">Access comprehensive emergency hotlines and support organizations for immediate assistance.</p>
                <div className="map-container">
                  <iframe
                    src="https://www.google.com/maps?q=Iligan+City+police+station&output=embed"
                    width="100%"
                    height="400"
                    style={{ border: 0, borderRadius: 12 }}
                    allowfullscreen=""
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade">
                  </iframe>
                </div>
                <div className="map-search">
                  <input type="text" id="mapSearch" className="report-input" placeholder="Search for police station, DSWD, or help center..." />
                  <button className="search-map-btn" id="searchMapBtn">
                    <i className="fas fa-search"></i>
                    Search
                  </button>
                </div>
                <div className="help-resources">
                  <h4>Emergency Hotlines & Support Organizations</h4>
                  <div className="resource-links-grid">
                    <a href="tel:911" className="resource-link-box">
                      <i className="fas fa-phone-alt"></i>
                      <div className="resource-info">
                        <span className="resource-name">National Emergency Hotline</span>
                        <span className="resource-hotline">911</span>
                      </div>
                    </a>
                    <a href="tel:85256028" className="resource-link-box">
                      <i className="fas fa-shield-alt"></i>
                      <div className="resource-info">
                        <span className="resource-name">NBI - Cybercrime & Threats</span>
                        <span className="resource-hotline">(02) 8525-6028</span>
                      </div>
                    </a>
                    <a href="tel:9197777377" className="resource-link-box">
                      <i className="fas fa-female"></i>
                      <div className="resource-info">
                        <span className="resource-name">PNP WCPC (Women & Children)</span>
                        <span className="resource-hotline">0919-777-7377</span>
                      </div>
                    </a>
                    <a href="tel:9178671907" className="resource-link-box">
                      <i className="fas fa-hands-helping"></i>
                      <div className="resource-info">
                        <span className="resource-name">PCW Referral System</span>
                        <span className="resource-hotline">0917-867-1907</span>
                      </div>
                    </a>
                    <a href="tel:1383" className="resource-link-box">
                      <i className="fas fa-child"></i>
                      <div className="resource-info">
                        <span className="resource-name">Makabata Helpline (Children)</span>
                        <span className="resource-hotline">1383</span>
                      </div>
                    </a>
                    <a href="tel:89318101" className="resource-link-box">
                      <i className="fas fa-hands-helping"></i>
                      <div className="resource-info">
                        <span className="resource-name">DSWD Crisis Intervention</span>
                        <span className="resource-hotline">(02) 8931-8101</span>
                      </div>
                    </a>
                    <a href="tel:9959218461" className="resource-link-box">
                      <i className="fas fa-graduation-cap"></i>
                      <div className="resource-info">
                        <span className="resource-name">DepEd Child Protection</span>
                        <span className="resource-hotline">0995-921-8461</span>
                      </div>
                    </a>
                    <a href="tel:82448467" className="resource-link-box">
                      <i className="fas fa-user"></i>
                      <div className="resource-info">
                        <span className="resource-name">NCSC (Senior Citizens)</span>
                        <span className="resource-hotline">(02) 8244-8467</span>
                      </div>
                    </a>
                    <a href="tel:1553" className="resource-link-box">
                      <i className="fas fa-brain"></i>
                      <div className="resource-info">
                        <span className="resource-name">NCMH Mental Health Crisis</span>
                        <span className="resource-hotline">1553</span>
                      </div>
                    </a>
                    <a href="https://www.google.com/maps/search/hospitals+near+me" target="_blank" className="resource-link-box">
                      <i className="fas fa-hospital"></i>
                      <div className="resource-info">
                        <span className="resource-name">Find Hospitals Near You</span>
                        <span className="resource-hotline">Map Search</span>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Reporting Form Section */}
          <div className="report-form-section">
            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <h3>Submit a Report</h3>
              </div>
              <div className="card-body">
                <form id="reportForm" className="report-form">
                  {/* Anonymity Toggle */}
                  <div className="form-group anonymity-group">
                    <label className="anonymity-toggle">
                      <input type="checkbox" id="anonymousToggle" name="anonymous" />
                      <span className="toggle-slider"></span>
                      <span className="toggle-text">Keep my identity anonymous</span>
                    </label>
                    <p className="anonymity-note">If checked, your name and email will not be shared with anyone.</p>
                  </div>

                  {/* Name and Email (hidden if anonymous) */}
                  <div className="form-group identity-group" id="identityGroup">
                    <label htmlFor="reporterName">Your Name</label>
                    <input type="text" id="reporterName" className="report-input" placeholder="Enter your name" />
                  </div>

                  <div className="form-group identity-group" id="emailGroup">
                    <label htmlFor="reporterEmail">Your Email</label>
                    <input type="email" id="reporterEmail" className="report-input" placeholder="Enter your email" />
                  </div>

                  {/* Incident Category */}
                  <div className="form-group">
                    <label htmlFor="incidentCategory">Incident Category</label>
                    <select id="incidentCategory" className="report-input" required={true}>
                      <option value="">Select category...</option>
                      <option value="academic">Academic Concern</option>
                      <option value="harassment">Harassment or Bullying</option>
                      <option value="safety">Facility/Safety Hazard</option>
                      <option value="discrimination">Discrimination</option>
                      <option value="mental-health">Mental Health Concern</option>
                      <option value="violence">Violence or Threat</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Date & Time */}
                  <div className="form-group">
                    <label htmlFor="incidentDate">Date & Time of Incident</label>
                    <input type="datetime-local" id="incidentDate" className="report-input" />
                    <label className="checkbox-label">
                      <input type="checkbox" id="rightNowToggle" />
                      <span>Right Now (current time)</span>
                    </label>
                  </div>

                  {/* Location */}
                  <div className="form-group">
                    <label htmlFor="incidentLocation">Location</label>
                    <input type="text" id="incidentLocation" className="report-input" placeholder="Where did this happen?" required={true} />
                  </div>

                  {/* Description */}
                  <div className="form-group">
                    <label htmlFor="incidentDescription">Description</label>
                    <textarea id="incidentDescription" className="report-input report-textarea" rows={6} placeholder="Please describe what happened in detail..." required={true}></textarea>
                  </div>

                  {/* Evidence Upload */}
                  <div className="form-group">
                    <label htmlFor="evidenceUpload">Evidence (Optional)</label>
                    <div className="file-upload-area" id="dropZone">
                      <input type="file" id="evidenceUpload" className="file-input" multiple={true} accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx" />
                      <div className="file-upload-label">
                        <i className="fas fa-cloud-upload-alt"></i>
                        <p>Drag and drop files here or click to browse</p>
                        <span className="file-types">Supports: Images, Videos, PDF, Word, Excel, PowerPoint, Text files</span>
                      </div>
                    </div>
                  </div>
                  <div id="selectedFiles" className="selected-files"></div>

                  {/* Submit Button */}
                  <div className="form-submit">
                    <button type="submit" className="submit-btn">
                      <i className="fas fa-paper-plane"></i>
                      Submit Report
                    </button>
                  </div>

                  <p className="data-handling-statement">
                    <i className="fas fa-shield-alt"></i>
                    Your safety is our priority. All reports are encrypted, and if you choose to remain anonymous, your identity will never be disclosed or tracked.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UserMenuModal
        isOpen={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        onProfileClick={() => window.location.href = '/profile'}
        onLogoutClick={() => {
          localStorage.removeItem('shielded_current_user');
        }}
      />
    </>
  );
}

export default function ReportEd() {
  return (
    <ProtectedRoute fallback={null}>
      <ReportEdContent />
    </ProtectedRoute>
  );
}