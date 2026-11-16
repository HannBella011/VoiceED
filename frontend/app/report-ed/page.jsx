'use client';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { useModals } from '@/components/shared/GlobalModals';
import { useAuthContext } from '@/context/AuthContext';
import { ReportSubmission } from '@/components/features/report/ReportSubmission';
import styles from './report.module.css';

export function ReportEDContent() {
  const pathname = usePathname();
  const { setSettingsOpen } = useModals();
  const { currentUser, isLoading } = useAuthContext();
  const [headerHeight, setHeaderHeight] = useState(128);
  useEffect(() => {
    const header = document.querySelector('.header');
    if (!header) return;
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  const handleMapSearch = (event) => {
    event.preventDefault();
    const term = event.currentTarget.searchTerm.value.trim();
    if (term)
      window.open(
        `https://www.google.com/maps/search/${encodeURIComponent(term + ' near me')}`,
        '_blank',
        'noopener,noreferrer'
      );
  };
  return (
    <>
      <Navbar currentPage={pathname} onSettingsClick={() => setSettingsOpen(true)} />
      <main
        className={`wellness-main ${styles.page}`}
        style={{ '--report-header-height': `${headerHeight}px` }}
      >
        <div className="container">
          <div className="wellness-hero">
            <h2>ReportED</h2>
            <p>
              A secure channel for reporting campus safety issues, incidents, and
              student concerns without fear of retaliation.
            </p>
          </div>
          <ReportSubmission key={isLoading ? 'loading' : currentUser?.id || 'guest'} />
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
                <p className="card-description">
                  "If you or someone else is in immediate danger, please contact
                  emergency services directly."
                </p>
                <div className="emergency-links">
                  <button
                    className="emergency-btn"
                    onClick={() => (window.location.href = 'tel:911')}
                  >
                    <i className="fas fa-phone"></i>
                    <span>Emergency Services</span>
                    <span className="emergency-number">911</span>
                  </button>
                  <button
                    className="emergency-btn"
                    onClick={() => (window.location.href = 'tel:1553')}
                  >
                    <i className="fas fa-heartbeat"></i>
                    <span>Mental Health Crisis</span>
                    <span className="emergency-number">1553</span>
                  </button>
                  <a
                    href="https://www.google.com/maps/search/hospitals+near+me"
                    target="_blank"
                    className="emergency-btn"
                  >
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
                <p className="card-description">
                  Your report is securely routed to the VoiceED review team.
                </p>
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
                <p className="card-description">
                  We assess the situation and coordinate with the appropriate campus
                  authorities or counselors.
                </p>
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
                <p className="card-description">
                  Appropriate interventions are made to ensure a safe learning
                  environment.
                </p>
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
                <p className="card-description">
                  Access comprehensive emergency hotlines and support organizations for
                  immediate assistance.
                </p>
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
                        <span className="resource-name">
                          National Emergency Hotline
                        </span>
                        <span className="resource-hotline">911</span>
                      </div>
                    </a>
                    <a href="tel:85256028" className="resource-link-box">
                      <i className="fas fa-shield-alt"></i>
                      <div className="resource-info">
                        <span className="resource-name">
                          NBI - Cybercrime & Threats
                        </span>
                        <span className="resource-hotline">(02) 8525-6028</span>
                      </div>
                    </a>
                    <a href="tel:9197777377" className="resource-link-box">
                      <i className="fas fa-female"></i>
                      <div className="resource-info">
                        <span className="resource-name">
                          PNP WCPC (Women & Children)
                        </span>
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
                        <span className="resource-name">
                          Makabata Helpline (Children)
                        </span>
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
                    <a
                      href="https://www.google.com/maps/search/hospitals+near+me"
                      target="_blank"
                      className="resource-link-box"
                    >
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
        </div>
      </main>
      <Footer />
    </>
  );
}
export default ReportEDContent;
