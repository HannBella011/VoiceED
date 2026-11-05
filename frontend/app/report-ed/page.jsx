'use client';

import { usePathname } from 'next/navigation';
import { useState, useRef } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';
import { submitReportAuthenticated, submitReportAnonymous } from '@/services/reports';
import { ProtectedRoute } from '@/lib/routeProtection';

export function ReportEDContent() {
  const pathname = usePathname();
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [rightNow, setRightNow] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '',
    date: '',
    location: '',
    description: ''
  });

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAnonymousChange = (checked) => {
    setIsAnonymous(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, name: '', email: '' }));
    }
  };

  const handleRightNowChange = (checked) => {
    setRightNow(checked);
    if (checked) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setFormData(prev => ({ ...prev, date: `${year}-${month}-${day}T${hours}:${minutes}` }));
    } else {
      setFormData(prev => ({ ...prev, date: '' }));
    }
  };

  const handleFilesChange = (files) => {
    const newFiles = Array.from(files);
    setSelectedFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      const uniqueFiles = newFiles.filter(f => !existingNames.has(f.name));
      return [...prev, ...uniqueFiles];
    });
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTrackingCode('');
    setSubmitting(true);
    try {
      const reportData = {
        title: `${formData.category.replaceAll('_', ' ')} incident`,
        description: formData.description,
        category: formData.category,
        incident_date: formData.date ? new Date(formData.date).toISOString() : undefined,
        location: formData.location,
      };
      const result = isAnonymous
        ? await submitReportAnonymous(reportData, selectedFiles)
        : await submitReportAuthenticated(reportData, selectedFiles);
      setTrackingCode(result.tracking_code);
      setFormData({ name: '', email: '', category: '', date: '', location: '', description: '' });
      setIsAnonymous(false);
      setRightNow(false);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit your report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMapSearch = (e) => {
    e.preventDefault();
    const searchTerm = e.target.searchTerm.value.trim();
    if (searchTerm) {
      const encodedSearch = encodeURIComponent(searchTerm + ' near me');
      window.open(`https://www.google.com/maps/search/${encodedSearch}`, '_blank');
    } else {
      alert('Please enter a location or organization to search for.');
    }
  };

  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="dashboard"
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
                  <button className="emergency-btn" onClick={() => window.location.href = 'tel:911'}>
                    <i className="fas fa-phone"></i>
                    <span>Emergency Services</span>
                    <span className="emergency-number">911</span>
                  </button>
                  <button className="emergency-btn" onClick={() => window.location.href = 'tel:1553'}>
                    <i className="fas fa-heartbeat"></i>
                    <span>Mental Health Crisis</span>
                    <span className="emergency-number">1553</span>
                  </button>
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
                    style={{ border: 0, borderRadius: '12px' }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
                {error && <p className="error-message" role="alert">{error}</p>}
                {trackingCode && <p className="success-message" role="status">Report submitted. Tracking code: <a href={`/track/${trackingCode}`}>{trackingCode}</a></p>}
                <form className="map-search" onSubmit={handleMapSearch}>
                  <input
                    type="text"
                    name="searchTerm"
                    id="mapSearch"
                    className="report-input"
                    placeholder="Search for police station, DSWD, or help center..."
                  />
                  <button type="submit" className="search-map-btn" id="searchMapBtn">
                    <i className="fas fa-search"></i>
                    Search
                  </button>
                </form>
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
                <form id="reportForm" className="report-form" onSubmit={handleSubmit}>
                  {/* Anonymity Toggle */}
                  <div className="form-group anonymity-group">
                    <label className="anonymity-toggle">
                      <input
                        type="checkbox"
                        id="anonymousToggle"
                        name="anonymous"
                        checked={isAnonymous}
                        onChange={(e) => handleAnonymousChange(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-text">Keep my identity anonymous</span>
                    </label>
                    <p className="anonymity-note">If checked, your name and email will not be shared with anyone.</p>
                  </div>

                  {/* Name and Email (hidden if anonymous) */}
                  {!isAnonymous && (
                    <>
                      <div className="form-group identity-group" id="identityGroup">
                        <label htmlFor="reporterName">Your Name</label>
                        <input
                          type="text"
                          id="reporterName"
                          className="report-input"
                          placeholder="Enter your name"
                          value={formData.name}
                          onChange={(e) => handleChange('name', e.target.value)}
                        />
                      </div>

                      <div className="form-group identity-group" id="emailGroup">
                        <label htmlFor="reporterEmail">Your Email</label>
                        <input
                          type="email"
                          id="reporterEmail"
                          className="report-input"
                          placeholder="Enter your email"
                          value={formData.email}
                          onChange={(e) => handleChange('email', e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* Incident Category */}
                  <div className="form-group">
                    <label htmlFor="incidentCategory">Incident Category</label>
                    <select
                      id="incidentCategory"
                      className="report-input"
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      required
                    >
                      <option value="">Select category...</option>
                      <option value="academic">Academic Concern</option>
                      <option value="harassment">Harassment or Bullying</option>
                      <option value="safety">Facility/Safety Hazard</option>
                      <option value="discrimination">Discrimination</option>
                      <option value="mental_health">Mental Health Concern</option>
                      <option value="violence">Violence or Threat</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Date & Time */}
                  <div className="form-group">
                    <label htmlFor="incidentDate">Date & Time of Incident</label>
                    <input
                      type="datetime-local"
                      id="incidentDate"
                      className="report-input"
                      value={formData.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                      disabled={rightNow}
                    />
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        id="rightNowToggle"
                        checked={rightNow}
                        onChange={(e) => handleRightNowChange(e.target.checked)}
                      />
                      <span>Right Now (current time)</span>
                    </label>
                  </div>

                  {/* Location */}
                  <div className="form-group">
                    <label htmlFor="incidentLocation">Location</label>
                    <input
                      type="text"
                      id="incidentLocation"
                      className="report-input"
                      placeholder="Where did this happen?"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="form-group">
                    <label htmlFor="incidentDescription">Description</label>
                    <textarea
                      id="incidentDescription"
                      className="report-input report-textarea"
                      rows={6}
                      placeholder="Please describe what happened in detail..."
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      required
                    ></textarea>
                  </div>

                  {/* Evidence Upload */}
                  <div className="form-group">
                    <label htmlFor="evidenceUpload">Evidence (Optional)</label>
                    <div
                      className="file-upload-area"
                      id="dropZone"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files.length > 0) {
                          handleFilesChange(e.dataTransfer.files);
                        }
                      }}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        id="evidenceUpload"
                        className="file-input"
                        multiple
                        accept=".png,.jpg,.jpeg,.pdf"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => e.target.files && handleFilesChange(e.target.files)}
                        style={{ display: 'none' }}
                      />
                      <div className="file-upload-label">
                        <i className="fas fa-cloud-upload-alt"></i>
                        <p>Drag and drop files here or click to browse</p>
                        <span className="file-types">Supports: PNG, JPEG and PDF, up to 25 MB per file</span>
                      </div>
                    </div>
                  </div>
                  <div id="selectedFiles" className="selected-files">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="selected-file">
                        <i className="fas fa-file"></i>
                        <span>{file.name}</span>
                        <span className="file-size">({formatFileSize(file.size)})</span>
                        <button
                          type="button" className="remove-file"
                          onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Submit Button */}
                  <div className="form-submit">
                    <button type="submit" className="submit-btn" disabled={submitting}>
                      <i className="fas fa-paper-plane"></i>
                      {submitting ? 'Submitting...' : 'Submit Report'}
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

export default function ReportED() {
  return (
    <ProtectedRoute fallback={null}>
      <ReportEDContent />
    </ProtectedRoute>
  );
}
