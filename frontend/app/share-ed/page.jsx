'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { useAuth } from '@/hooks';
import { useModals } from '@/components/shared/GlobalModals';

function ShareEdContent() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();
  const { settingsOpen, setSettingsOpen, userMenuOpen, setUserMenuOpen, loginRequiredOpen, setLoginRequiredOpen } = useModals();

  const handleUserMenuClick = () => {
    setUserMenuOpen(true);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleNavigation = (href) => {
    if (isLoggedIn) {
      window.location.href = href;
    } else {
      setLoginRequiredOpen(true);
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

      <main className="services-main">
        <div className="container">
          <div className="services-welcome">
            <h2>ShareED</h2>
            <p>A simple hub where students can upload, download, and share notes, reviewer sheets, and study materials with peers.</p>
          </div>

          <section className="resource-search-section">
            <div className="section-header">
              <h3>Resource Search & Quick Access</h3>
            </div>
            <p className="section-description">Learn together, grow together—access community-contributed study materials and reviewer sheets.</p>

            <div className="search-bar-container">
              <div className="search-input-wrapper">
                <i className="fas fa-search search-icon"></i>
                <input type="text" className="search-input" placeholder="Search for notes, reviewers, or study materials..." />
              </div>
            </div>

            <div className="filter-group">
              <div className="filter-row">
                <div className="filter-item">
                  <label>Subject/Course</label>
                  <select className="filter-select">
                    <option>All Subjects</option>
                    <option>Computer Science</option>
                    <option>Mathematics</option>
                    <option>Humanities</option>
                    <option>General Education</option>
                    <option>Engineering</option>
                    <option>Business</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label>Resource Type</label>
                  <select className="filter-select">
                    <option>All Types</option>
                    <option>Lecture Notes</option>
                    <option>Reviewer Sheet</option>
                    <option>Exam Prep</option>
                    <option>Summary</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label>File Format</label>
                  <select className="filter-select">
                    <option>All Formats</option>
                    <option>PDF</option>
                    <option>DOCX</option>
                    <option>Images</option>
                    <option>Links</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="resources-carousel">
              <div className="resource-card">
                <div className="resource-thumbnail">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div className="resource-info">
                  <h4>CCC121 Midterm Reviewer - Data Structures</h4>
                  <p className="resource-uploader">Uploaded by: Anonymous Student</p>
                  <div className="resource-meta">
                    <span className="resource-size">2.4 MB</span>
                    <span className="resource-downloads"><i className="fas fa-download"></i> 156</span>
                    <span className="resource-rating"><i className="fas fa-star"></i> 4.8</span>
                  </div>
                </div>
                <div className="resource-actions">
                  <button className="btn btn--primary btn--sm">Download</button>
                  <button className="btn btn--secondary btn--sm">Preview</button>
                  <span className="resource-comments"><i className="fas fa-comment"></i> 45</span>
                </div>
              </div>

              <div className="resource-card">
                <div className="resource-thumbnail">
                  <i className="fas fa-file-alt"></i>
                </div>
                <div className="resource-info">
                  <h4>Programming Fundamentals Lecture Notes</h4>
                  <p className="resource-uploader">Uploaded by: John Doe</p>
                  <div className="resource-meta">
                    <span className="resource-size">1.8 MB</span>
                    <span className="resource-downloads"><i className="fas fa-download"></i> 89</span>
                    <span className="resource-rating"><i className="fas fa-star"></i> 4.5</span>
                  </div>
                </div>
                <div className="resource-actions">
                  <button className="btn btn--primary btn--sm">Download</button>
                  <button className="btn btn--secondary btn--sm">Preview</button>
                  <span className="resource-comments"><i className="fas fa-comment"></i> 32</span>
                </div>
              </div>

              <div className="resource-card">
                <div className="resource-thumbnail">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div className="resource-info">
                  <h4>Calculus II Final Exam Reviewer</h4>
                  <p className="resource-uploader">Uploaded by: Anonymous Student</p>
                  <div className="resource-meta">
                    <span className="resource-size">3.1 MB</span>
                    <span className="resource-downloads"><i className="fas fa-download"></i> 234</span>
                    <span className="resource-rating"><i className="fas fa-star"></i> 4.9</span>
                  </div>
                </div>
                <div className="resource-actions">
                  <button className="btn btn--primary btn--sm">Download</button>
                  <button className="btn btn--secondary btn--sm">Preview</button>
                  <span className="resource-comments"><i className="fas fa-comment"></i> 78</span>
                </div>
              </div>

              <div className="resource-card">
                <div className="resource-thumbnail">
                  <i className="fas fa-file-alt"></i>
                </div>
                <div className="resource-info">
                  <h4>Literature Analysis Summary</h4>
                  <p className="resource-uploader">Uploaded by: Jane Smith</p>
                  <div className="resource-meta">
                    <span className="resource-size">1.2 MB</span>
                    <span className="resource-downloads"><i className="fas fa-download"></i> 67</span>
                    <span className="resource-rating"><i className="fas fa-star"></i> 4.3</span>
                  </div>
                </div>
                <div className="resource-actions">
                  <button className="btn btn--primary btn--sm">Download</button>
                  <button className="btn btn--secondary btn--sm">Preview</button>
                  <span className="resource-comments"><i className="fas fa-comment"></i> 21</span>
                </div>
              </div>

              <div className="resource-card">
                <div className="resource-thumbnail">
                  <i className="fas fa-file-alt"></i>
                </div>
                <div className="resource-info">
                  <h4>GE101 Study Guide - Critical Thinking</h4>
                  <p className="resource-uploader">Uploaded by: Anonymous Student</p>
                  <div className="resource-meta">
                    <span className="resource-size">2.0 MB</span>
                    <span className="resource-downloads"><i className="fas fa-download"></i> 145</span>
                    <span className="resource-rating"><i className="fas fa-star"></i> 4.7</span>
                  </div>
                </div>
                <div className="resource-actions">
                  <button className="btn btn--primary btn--sm">Download</button>
                  <button className="btn btn--secondary btn--sm">Preview</button>
                  <span className="resource-comments"><i className="fas fa-comment"></i> 56</span>
                </div>
              </div>

              <div className="resource-card">
                <div className="resource-thumbnail">
                  <i className="fas fa-file-powerpoint"></i>
                </div>
                <div className="resource-info">
                  <h4>Physics Mechanics Presentation</h4>
                  <p className="resource-uploader">Uploaded by: Mike Johnson</p>
                  <div className="resource-meta">
                    <span className="resource-size">4.5 MB</span>
                    <span className="resource-downloads"><i className="fas fa-download"></i> 189</span>
                    <span className="resource-rating"><i className="fas fa-star"></i> 4.6</span>
                  </div>
                </div>
                <div className="resource-actions">
                  <button className="btn btn--primary btn--sm">Download</button>
                  <button className="btn btn--secondary btn--sm">Preview</button>
                  <span className="resource-comments"><i className="fas fa-comment"></i> 67</span>
                </div>
              </div>

              <div className="carousel-nav">
                <button className="carousel-btn" disabled>
                  <i className="fas fa-chevron-left"></i> Previous
                </button>
                <button className="carousel-btn">
                  Next <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </section>

          <section className="upload-section">
            <div className="upload-header">
              <h3>Upload Study Material</h3>
              <p>Share your knowledge with the community</p>
            </div>

            <form className="upload-form" onSubmit={(e) => e.preventDefault()}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="resourceTitle">Title</label>
                  <input type="text" id="resourceTitle" className="form-input" placeholder="e.g., CCC121 Midterm Reviewer - Data Structures" required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="resourceSubject">Subject / Course Code</label>
                  <input type="text" id="resourceSubject" className="form-input" placeholder="e.g., CCC121, MATH101, ENG102" required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="resourceCategory">Resource Category</label>
                  <select id="resourceCategory" className="form-input" required>
                    <option value="">Select category...</option>
                    <option value="lecture-notes">Lecture Notes</option>
                    <option value="reviewer-sheet">Reviewer Sheet</option>
                    <option value="practice-quiz">Practice Quiz</option>
                    <option value="reference-book">Reference Book</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>File Upload</label>
                <div className="file-upload-area">
                  <input type="file" id="resourceFile" className="file-input" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg" style={{ display: 'none' }} />
                  <div className="file-upload-label">
                    <i className="fas fa-cloud-upload-alt"></i>
                    <p>Drag and drop files here or click to browse</p>
                    <span className="file-types">Supports: PDF, DOC, DOCX, PPT, PPTX, Images</span>
                  </div>
                </div>
              </div>

              <div className="form-group anonymity-group">
                <label className="anonymity-toggle">
                  <input type="checkbox" id="anonymousUpload" name="anonymous" />
                  <span className="toggle-slider"></span>
                  <span className="toggle-text">Upload as Student</span>
                </label>
                <p className="anonymity-note">If checked, your identity will be hidden from other students.</p>
              </div>

              <div className="form-submit">
                <button type="submit" className="btn btn--primary submit-btn">
                  <i className="fas fa-upload"></i> Upload Resource
                </button>
              </div>

              <div className="data-policy-statement">
                <i className="fas fa-shield-alt"></i>
                <span>
                  Academic integrity and community safety come first. All uploaded files are scanned for safety, and shared materials must respect academic guidelines. Identity privacy is preserved whenever anonymous sharing is selected.
                </span>
              </div>
            </form>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default function ShareEd() {
  return <ShareEdContent />;
}