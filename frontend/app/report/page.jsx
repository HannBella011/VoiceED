// Report Page - VoiceED
// Matches base/ReportED.html exactly

'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { useAuth } from '@/hooks';
import { useModals } from '@/components/shared/GlobalModals';
import { submitReportAuthenticated, submitReportAnonymous } from '@/services';

// Text constants to avoid JSX parsing issues with </
const heroText = 'A secure channel for reporting campus safety issues, incidents, and student concerns without fear of retaliation.';
const helpText = '"If you or someone else is in immediate danger, please contact emergency services directly."';
const receivedText = 'Your report is securely routed to the VoiceED review team.';
const reviewedText = 'We assess the situation and coordinate with the appropriate campus authorities or counselors.';
const actionText = 'Appropriate interventions are made to ensure a safe learning environment.';
const mapText = 'Access comprehensive emergency hotlines and support organizations for immediate assistance.';
const dataText = 'Your safety is our priority. All reports are encrypted, and if you choose to remain anonymous, your identity will never be disclosed or tracked.';

export default function ReportPage() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const { settingsOpen, setSettingsOpen, userMenuOpen, setUserMenuOpen } = useModals();
  
  // Form state - matching base ReportED.html
  const [anonymous, setAnonymous] = useState(false);
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [incidentCategory, setIncidentCategory] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [rightNow, setRightNow] = useState(false);
  const [incidentLocation, setIncidentLocation] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  // Handle anonymity toggle
  const handleAnonymousToggle = (checked) => {
    setAnonymous(checked);
    if (checked) {
      setReporterName('');
      setReporterEmail('');
    }
  };

  // Handle right now toggle
  const handleRightNowToggle = (checked) => {
    setRightNow(checked);
    if (checked) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setIncidentDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    } else {
      setIncidentDate('');
    }
  };

  // File upload handling
  const handleFiles = (files) => {
    if (files.length > 0) {
      Array.from(files).forEach(file => {
        const existingNames = selectedFiles.map(f => f.name);
        if (!existingNames.includes(file.name)) {
          setSelectedFiles(prev => [...prev, file]);
        }
      });
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e) => {
    handleFiles(e.target.files);
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    // Validation
    if (!incidentCategory) {
      setError('Please select an incident category');
      return;
    }
    if (!incidentDate) {
      setError('Please select a date and time');
      return;
    }
    if (!incidentLocation.trim()) {
      setError('Please enter a location');
      return;
    }
    if (!incidentDescription.trim()) {
      setError('Please enter a description');
      return;
    }
    if (!anonymous && (!reporterName.trim() || !reporterEmail.trim())) {
      setError('Please enter your name and email');
      return;
    }

    setSubmitting(true);

    try {
      const formData = {
        anonymous,
        name: reporterName,
        email: reporterEmail,
        category: incidentCategory,
        date: incidentDate,
        location: incidentLocation,
        description: incidentDescription,
        files: selectedFiles.map(f => f.name),
      };

      if (isLoggedIn && !anonymous) {
        await submitReportAuthenticated(formData);
      } else {
        await submitReportAnonymous(formData);
      }

      setSuccess(true);
      setSubmitting(false);
      
      // Reset form
      setAnonymous(false);
      setReporterName('');
      setReporterEmail('');
      setIncidentCategory('');
      setIncidentDate('');
      setRightNow(false);
      setIncidentLocation('');
      setIncidentDescription('');
      setSelectedFiles([]);
      
      // Show success message
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError(err.message || 'Failed to submit report');
      setSubmitting(false);
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
            <p>{heroText}</p>
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
                <p className="card-description">{helpText}</p>
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
                  <a href="https://www.google.com/maps/search/hospitals+near+me" target="_blank" rel="noopener noreferrer" className="emergency-btn">
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
                <p className="card-description">{receivedText}</p>
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
                <p className="card-description">{reviewedText}</p>
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
                <p className="card-description">{actionText}</p>
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
                <p className="card-description">{mapText}</p>
                <div className="map-container">
                  <iframe
                    src="https://www.google.com/maps?q=Iligan+City+police+station&output=embed"
                    width="100%"
                    height="400"
                    style={{ border: 0, borderRadius: '12px' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
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
                    <a href="https://www.google.com/maps/search/hospitals+near+me" target="_blank" rel="noopener noreferrer" className="resource-link-box">
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
                {error && <div className="error-message" role="alert">{error}</div>}
                {success && <div className="success-message" role="alert">Thank you for your report. Your submission has been received securely. The VoiceED team will review it promptly.</div>}
                <form id="reportForm" className="report-form" onSubmit={handleSubmit}>
                  {/* Anonymity Toggle */}
                  <div className="form-group anonymity-group">
                    <label className="anonymity-toggle">
                      <input
                        type="checkbox"
                        id="anonymousToggle"
                        name="anonymous"
                        checked={anonymous}
                        onChange={(e) => handleAnonymousToggle(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-text">Keep my identity anonymous</span>
                    </label>
                    <p className="anonymity-note">If checked, your name and email will not be shared with anyone.</p>
                  </div>

                  {/* Name and Email (hidden if anonymous) */}
                  <div className="form-group identity-group" id="identityGroup" style={{ display: anonymous ? 'none' : 'block' }}>
                    <label htmlFor="reporterName">Your Name</label>
                    <input
                      type="text"
                      id="reporterName"
                      className="report-input"
                      placeholder="Enter your name"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                    />
                  </div>

                  <div className="form-group identity-group" id="emailGroup" style={{ display: anonymous ? 'none' : 'block' }}>
                    <label htmlFor="reporterEmail">Your Email</label>
                    <input
                      type="email"
                      id="reporterEmail"
                      className="report-input"
                      placeholder="Enter your email"
                      value={reporterEmail}
                      onChange={(e) => setReporterEmail(e.target.value)}
                    />
                  </div>

                  {/* Incident Category */}
                  <div className="form-group">
                    <label htmlFor="incidentCategory">Incident Category</label>
                    <select
                      id="incidentCategory"
                      className="report-input"
                      value={incidentCategory}
                      onChange={(e) => setIncidentCategory(e.target.value)}
                      required
                    >
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
                    <input
                      type="datetime-local"
                      id="incidentDate"
                      className="report-input"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      disabled={rightNow}
                    />
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        id="rightNowToggle"
                        checked={rightNow}
                        onChange={(e) => handleRightNowToggle(e.target.checked)}
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
                      value={incidentLocation}
                      onChange={(e) => setIncidentLocation(e.target.value)}
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
                      value={incidentDescription}
                      onChange={(e) => setIncidentDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  {/* Evidence Upload */}
                  <div className="form-group">
                    <label htmlFor="evidenceUpload">Evidence (Optional)</label>
                    <div
                      className="file-upload-area"
                      id="dropZone"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('evidenceUpload')?.click()}
                    >
                      <input
                        type="file"
                        id="evidenceUpload"
                        className="file-input"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                        onChange={handleFileInputChange}
                      />
                      <div className="file-upload-label">
                        <i className="fas fa-cloud-upload-alt"></i>
                        <p>Drag and drop files here or click to browse</p>
                        <span className="file-types">Supports: Images, Videos, PDF, Word, Excel, PowerPoint, Text files</span>
                      </div>
                    </div>
                  </div>
                  <div id="selectedFiles" className="selected-files">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="selected-file">
                        <i className="fas fa-file"></i>
                        <span>{file.name}</span>
                        <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                        <button
                          className="remove-file"
                          onClick={(e) => { e.preventDefault(); removeFile(index); }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Submit Button */}
                  <div className="form-submit">
                    <button type="submit" className="submit-btn" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>

                  <p className="data-handling-statement">
                    <i className="fas fa-shield-alt"></i>
                    {dataText}
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}


function ReportPageContent() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const { settingsOpen, setSettingsOpen, userMenuOpen, setUserMenuOpen } = useModals();
  
  // Form state - matching base ReportED.html
  const [anonymous, setAnonymous] = useState(false);
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [incidentCategory, setIncidentCategory] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [rightNow, setRightNow] = useState(false);
  const [incidentLocation, setIncidentLocation] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  // Handle anonymity toggle
  

  // Handle right now toggle
  

  // File upload handling
  

  

  

  

  

  

  // Form submission
  

  // Handle anonymity toggle
  

  // Handle right now toggle
  

  // File upload handling
  const handleFilesFn = (files) => {
    if (files.length > 0) {
      Array.from(files).forEach(file => {
        const existingNames = selectedFiles.map(f => f.name);
        if (!existingNames.includes(file.name)) {
          setSelectedFiles(prev => [...prev, file]);
        }
      });
    }
  };

  

  

  

  

  // Form submission
  

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
            <p>{heroText}</p>
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
                <p className="card-description">{helpText}</p>
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
                  <a href="https://www.google.com/maps/search/hospitals+near+me" target="_blank" rel="noopener noreferrer" className="emergency-btn">
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
                <p className="card-description">{receivedText}</p>
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
                <p className="card-description">{reviewedText}</p>
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
                <p className="card-description">{actionText}</p>
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
                <p className="card-description">{mapText}</p>
                <div className="map-container">
                  <iframe
                    src="https://www.google.com/maps?q=Iligan+City+police+station&output=embed"
                    width="100%"
                    height="400"
                    style={{ border: 0, borderRadius: '12px' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
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
                    <a href="https://www.google.com/maps/search/hospitals+near+me" target="_blank" rel="noopener noreferrer" className="resource-link-box">
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
                {error && <div className="error-message" role="alert">{error}</div>}
                {success && <div className="success-message" role="alert">Thank you for your report. Your submission has been received securely. The VoiceED team will review it promptly.</div>}
                <form id="reportForm" className="report-form" onSubmit={handleSubmit}>
                  {/* Anonymity Toggle */}
                  <div className="form-group anonymity-group">
                    <label className="anonymity-toggle">
                      <input
                        type="checkbox"
                        id="anonymousToggle"
                        name="anonymous"
                        checked={anonymous}
                        onChange={(e) => handleAnonymousToggle(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-text">Keep my identity anonymous</span>
                    </label>
                    <p className="anonymity-note">If checked, your name and email will not be shared with anyone.</p>
                  </div>

                  {/* Name and Email (hidden if anonymous) */}
                  <div className="form-group identity-group" id="identityGroup" style={{ display: anonymous ? 'none' : 'block' }}>
                    <label htmlFor="reporterName">Your Name</label>
                    <input
                      type="text"
                      id="reporterName"
                      className="report-input"
                      placeholder="Enter your name"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                    />
                  </div>

                  <div className="form-group identity-group" id="emailGroup" style={{ display: anonymous ? 'none' : 'block' }}>
                    <label htmlFor="reporterEmail">Your Email</label>
                    <input
                      type="email"
                      id="reporterEmail"
                      className="report-input"
                      placeholder="Enter your email"
                      value={reporterEmail}
                      onChange={(e) => setReporterEmail(e.target.value)}
                    />
                  </div>

                  {/* Incident Category */}
                  <div className="form-group">
                    <label htmlFor="incidentCategory">Incident Category</label>
                    <select
                      id="incidentCategory"
                      className="report-input"
                      value={incidentCategory}
                      onChange={(e) => setIncidentCategory(e.target.value)}
                      required
                    >
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
                    <input
                      type="datetime-local"
                      id="incidentDate"
                      className="report-input"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      disabled={rightNow}
                    />
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        id="rightNowToggle"
                        checked={rightNow}
                        onChange={(e) => handleRightNowToggle(e.target.checked)}
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
                      value={incidentLocation}
                      onChange={(e) => setIncidentLocation(e.target.value)}
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
                      value={incidentDescription}
                      onChange={(e) => setIncidentDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  {/* Evidence Upload */}
                  <div className="form-group">
                    <label htmlFor="evidenceUpload">Evidence (Optional)</label>
                    <div
                      className="file-upload-area"
                      id="dropZone"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('evidenceUpload')?.click()}
                    >
                      <input
                        type="file"
                        id="evidenceUpload"
                        className="file-input"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                        onChange={handleFileInputChange}
                      />
                      <div className="file-upload-label">
                        <i className="fas fa-cloud-upload-alt"></i>
                        <p>Drag and drop files here or click to browse</p>
                        <span className="file-types">Supports: Images, Videos, PDF, Word, Excel, PowerPoint, Text files</span>
                      </div>
                    </div>
                  </div>
                  <div id="selectedFiles" className="selected-files">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="selected-file">
                        <i className="fas fa-file"></i>
                        <span>{file.name}</span>
                        <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                        <button
                          className="remove-file"
                          onClick={(e) => { e.preventDefault(); removeFile(index); }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Submit Button */}
                  <div className="form-submit">
                    <button type="submit" className="submit-btn" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>

                  <p className="data-handling-statement">
                    <i className="fas fa-shield-alt"></i>
                    {dataText}
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}


