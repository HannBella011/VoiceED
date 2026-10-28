'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, UserMenuModal } from '@/components/shared';

export default function ShareEd() {
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
            <h2>ShareED</h2>
            <p>A simple hub where students can upload, download, and share notes, reviewer sheets, and study materials with peers.</p>
          </div>

          {/* Resource Search & Quick Access Area */}
          <div className="search-quick-access-section">
            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-search"></i>
                </div>
                <h3>Resource Search & Quick Access</h3>
              </div>
              <div className="card-body">
                <p className="card-description">Learn together, grow together—access community-contributed study materials and reviewer sheets.</p>

                {/* Search Bar */}
                <div className="search-bar-container">
                  <input type="text" id="resourceSearch" className="search-input" placeholder="Search by keyword, topic, or course code..." />
                  <button className="search-btn">
                    <i className="fas fa-search"></i>
                  </button>
                </div>

                {/* Quick Filters */}
                <div className="filter-container">
                  <div className="filter-group">
                    <label htmlFor="subjectFilter">Subject/Course</label>
                    <select id="subjectFilter" className="filter-select">
                      <option value="">All Subjects</option>
                      <option value="cs">Computer Science</option>
                      <option value="math">Mathematics</option>
                      <option value="humanities">Humanities</option>
                      <option value="ge">General Education</option>
                      <option value="engineering">Engineering</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label htmlFor="resourceTypeFilter">Resource Type</label>
                    <select id="resourceTypeFilter" className="filter-select">
                      <option value="">All Types</option>
                      <option value="lecture">Lecture Notes</option>
                      <option value="reviewer">Reviewer Sheet</option>
                      <option value="exam">Exam Prep</option>
                      <option value="summary">Summary</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label htmlFor="fileFormatFilter">File Format</label>
                    <select id="fileFormatFilter" className="filter-select">
                      <option value="">All Formats</option>
                      <option value="pdf">PDF</option>
                      <option value="docx">DOCX</option>
                      <option value="image">Images</option>
                      <option value="link">Links</option>
                    </select>
                  </div>
                </div>

                {/* Resources Carousel */}
                <div className="resources-carousel">
                  <div className="resources-grid" id="resourcesGrid">
                    {/* Resource 1 */}
                    <div className="resource-card">
                      <div className="resource-preview">
                        <i className="fas fa-file-pdf"></i>
                      </div>
                      <div className="resource-info">
                        <h5 className="resource-title">CCC121 Midterm Reviewer - Data Structures</h5>
                        <p className="resource-uploader">Uploaded by: Anonymous Student</p>
                        <div className="resource-meta">
                          <span className="resource-size">2.4 MB</span>
                          <span className="resource-downloads"><i className="fas fa-download"></i> 156</span>
                          <span className="resource-rating"><i className="fas fa-star"></i> 4.8</span>
                        </div>
                        <div className="resource-actions">
                          <button className="download-btn"><i className="fas fa-download"></i> Download</button>
                          <button className="preview-btn"><i className="fas fa-eye"></i> Preview</button>
                          <button className="upvote-btn"><i className="fas fa-thumbs-up"></i> 45</button>
                        </div>
                      </div>
                    </div>
                    {/* Resource 2 */}
                    <div className="resource-card">
                      <div className="resource-preview">
                        <i className="fas fa-file-word"></i>
                      </div>
                      <div className="resource-info">
                        <h5 className="resource-title">Programming Fundamentals Lecture Notes</h5>
                        <p className="resource-uploader">Uploaded by: John Doe</p>
                        <div className="resource-meta">
                          <span className="resource-size">1.8 MB</span>
                          <span className="resource-downloads"><i className="fas fa-download"></i> 89</span>
                          <span className="resource-rating"><i className="fas fa-star"></i> 4.5</span>
                        </div>
                        <div className="resource-actions">
                          <button className="download-btn"><i className="fas fa-download"></i> Download</button>
                          <button className="preview-btn"><i className="fas fa-eye"></i> Preview</button>
                          <button className="upvote-btn"><i className="fas fa-thumbs-up"></i> 32</button>
                        </div>
                      </div>
                    </div>
                    {/* Resource 3 */}
                    <div className="resource-card">
                      <div className="resource-preview">
                        <i className="fas fa-file-pdf"></i>
                      </div>
                      <div className="resource-info">
                        <h5 className="resource-title">Calculus II Final Exam Reviewer</h5>
                        <p className="resource-uploader">Uploaded by: Anonymous Student</p>
                        <div className="resource-meta">
                          <span className="resource-size">3.1 MB</span>
                          <span className="resource-downloads"><i className="fas fa-download"></i> 234</span>
                          <span className="resource-rating"><i className="fas fa-star"></i> 4.9</span>
                        </div>
                        <div className="resource-actions">
                          <button className="download-btn"><i className="fas fa-download"></i> Download</button>
                          <button className="preview-btn"><i className="fas fa-eye"></i> Preview</button>
                          <button className="upvote-btn"><i className="fas fa-thumbs-up"></i> 78</button>
                        </div>
                      </div>
                    </div>
                    {/* Resource 4 */}
                    <div className="resource-card">
                      <div className="resource-preview">
                        <i className="fas fa-file-image"></i>
                      </div>
                      <div className="resource-info">
                        <h5 className="resource-title">Literature Analysis Summary</h5>
                        <p className="resource-uploader">Uploaded by: Jane Smith</p>
                        <div className="resource-meta">
                          <span className="resource-size">1.2 MB</span>
                          <span className="resource-downloads"><i className="fas fa-download"></i> 67</span>
                          <span className="resource-rating"><i className="fas fa-star"></i> 4.3</span>
                        </div>
                        <div className="resource-actions">
                          <button className="download-btn"><i className="fas fa-download"></i> Download</button>
                          <button className="preview-btn"><i className="fas fa-eye"></i> Preview</button>
                          <button className="upvote-btn"><i className="fas fa-thumbs-up"></i> 21</button>
                        </div>
                      </div>
                    </div>
                    {/* Resource 5 */}
                    <div className="resource-card">
                      <div className="resource-preview">
                        <i className="fas fa-file-pdf"></i>
                      </div>
                      <div className="resource-info">
                        <h5 className="resource-title">GE101 Study Guide - Critical Thinking</h5>
                        <p className="resource-uploader">Uploaded by: Anonymous Student</p>
                        <div className="resource-meta">
                          <span className="resource-size">2.0 MB</span>
                          <span className="resource-downloads"><i className="fas fa-download"></i> 145</span>
                          <span className="resource-rating"><i className="fas fa-star"></i> 4.7</span>
                        </div>
                        <div className="resource-actions">
                          <button className="download-btn"><i className="fas fa-download"></i> Download</button>
                          <button className="preview-btn"><i className="fas fa-eye"></i> Preview</button>
                          <button className="upvote-btn"><i className="fas fa-thumbs-up"></i> 56</button>
                        </div>
                      </div>
                    </div>
                    {/* Resource 6 */}
                    <div className="resource-card">
                      <div className="resource-preview">
                        <i className="fas fa-file-powerpoint"></i>
                      </div>
                      <div className="resource-info">
                        <h5 className="resource-title">Physics Mechanics Presentation</h5>
                        <p className="resource-uploader">Uploaded by: Mike Johnson</p>
                        <div className="resource-meta">
                          <span className="resource-size">4.5 MB</span>
                          <span className="resource-downloads"><i className="fas fa-download"></i> 189</span>
                          <span className="resource-rating"><i className="fas fa-star"></i> 4.6</span>
                        </div>
                        <div className="resource-actions">
                          <button className="download-btn"><i className="fas fa-download"></i> Download</button>
                          <button className="preview-btn"><i className="fas fa-eye"></i> Preview</button>
                          <button className="upvote-btn"><i className="fas fa-thumbs-up"></i> 67</button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Navigation Buttons */}
                  <div className="carousel-navigation">
                    <button className="carousel-btn prev-btn" id="prevBtn">
                      <i className="fas fa-chevron-left"></i> Previous
                    </button>
                    <button className="carousel-btn next-btn" id="nextBtn">
                      Next <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upload System */}
          <div className="upload-section">
            <div className="wellness-card">
              <div className="card-header">
                <div className="card-icon">
                  <i className="fas fa-upload"></i>
                </div>
                <h3>Upload Study Material</h3>
              </div>
              <div className="card-body">
                <form id="uploadForm" className="upload-form">
                  {/* Resource Details */}
                  <div className="form-group">
                    <label htmlFor="resourceTitle">Title</label>
                    <input type="text" id="resourceTitle" className="upload-input" placeholder="e.g., CCC121 Midterm Reviewer - Data Structures" required={true} />
                  </div>

                  <div className="form-group">
                    <label htmlFor="subjectCode">Subject / Course Code</label>
                    <input type="text" id="subjectCode" className="upload-input" placeholder="e.g., CCC121" required={true} />
                  </div>

                  <div className="form-group">
                    <label htmlFor="resourceCategory">Resource Category</label>
                    <select id="resourceCategory" className="upload-input" required={true}>
                      <option value="">Select category...</option>
                      <option value="lecture">Lecture Notes</option>
                      <option value="reviewer">Reviewer Sheet</option>
                      <option value="quiz">Practice Quiz</option>
                      <option value="reference">Reference Book</option>
                    </select>
                  </div>

                  {/* File Input */}
                  <div className="form-group">
                    <label htmlFor="fileUpload">File Upload</label>
                    <div className="file-upload-area" id="uploadDropZone">
                      <input type="file" id="fileUpload" className="file-input" multiple={true} accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" />
                      <div className="file-upload-label">
                        <i className="fas fa-cloud-upload-alt"></i>
                        <p>Drag and drop files here or click to browse</p>
                        <span className="file-types">Supports: PDF, DOC, DOCX, PPT, PPTX, Images</span>
                      </div>
                    </div>
                  </div>
                  <div id="selectedUploadFiles" className="selected-files"></div>

                  {/* Anonymity Toggle */}
                  <div className="form-group anonymity-group">
                    <label className="anonymity-toggle">
                      <input type="checkbox" id="uploadAnonymous" name="uploadAnonymous" />
                      <span className="toggle-slider"></span>
                      <span className="toggle-text">Upload as Anonymous Student</span>
                    </label>
                    <p className="anonymity-note">If checked, your identity will be hidden from other students.</p>
                  </div>

                  {/* Submit Button */}
                  <div className="form-submit">
                    <button type="submit" className="submit-btn">
                      <i className="fas fa-upload"></i>
                      Upload Resource
                    </button>
                  </div>

                  {/* Data Policy Statement */}
                  <p className="data-handling-statement">
                    <i className="fas fa-shield-alt"></i>
                    Academic integrity and community safety come first. All uploaded files are scanned for safety, and shared materials must respect academic guidelines. Identity privacy is preserved whenever anonymous sharing is selected.
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