"use client";

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { useAuth } from '@/hooks';
import { useModals } from '@/components/shared/GlobalModals';
import { shareService } from '@/services/share';

const PAGE_SIZE = 6;
const fileFormat = material => material.file_url.split('?')[0].split('.').pop().toLowerCase();
const resourceType = material => material.file_type.startsWith('image/') ? 'image'
  : /powerpoint|presentation/.test(material.file_type) ? 'presentation' : 'document';

export default function ShareEd() {
  const pathname = usePathname();
  const { isLoggedIn, isLoading } = useAuth();
  const { setSettingsOpen, setUserMenuOpen, setLoginRequiredOpen } = useModals();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('');
  const [format, setFormat] = useState('');
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    if (isLoading) return () => controller.abort();
    if (!isLoggedIn) {
      setMaterials([]);
      setLoading(false);
      return () => controller.abort();
    }
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const records = [];
        let batch;
        let apiPage = 1;
        do {
          batch = await shareService.getMaterials({ page: apiPage++, limit: 100 }, { signal: controller.signal });
          if (!Array.isArray(batch)) throw new Error('Unable to read study materials.');
          records.push(...batch);
        } while (batch.length === 100);
        if (!controller.signal.aborted) setMaterials(records);
      } catch (err) {
        if (!controller.signal.aborted) {
          setMaterials([]);
          setError(err.message || 'Unable to load materials. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [isLoggedIn, isLoading, revision]);

  useEffect(() => { setPage(0); }, [search, subject, type, format]);
  useEffect(() => {
    if (!preview) return;
    const close = event => { if (event.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [preview]);

  const filtered = materials.filter(material =>
    (!search || `${material.title} ${material.subject} ${material.description || ''}`.toLowerCase().includes(search.toLowerCase())) &&
    (!subject || material.subject === subject) && (!type || resourceType(material) === type) &&
    (!format || fileFormat(material) === format));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const subjects = [...new Set(materials.map(material => material.subject))].sort();
  const formats = [...new Set(materials.map(fileFormat))].sort();

  const selectFile = file => {
    if (!file) return;
    setSelectedFile(file);
    setUploadError('');
  };
  const handleUpload = async event => {
    event.preventDefault();
    if (!isLoggedIn) { setLoginRequiredOpen(true); return; }
    setUploadError('');
    setSuccess('');
    if (!selectedFile) { setUploadError('Please select a file.'); return; }
    if (selectedFile.size > 25 * 1024 * 1024) { setUploadError('Files must be 25 MB or smaller.'); return; }
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set('file', selectedFile);
    body.set('is_anonymous', form.elements.is_anonymous.checked ? 'true' : 'false');
    setUploading(true);
    try {
      await shareService.uploadMaterial(body);
      form.reset();
      setSelectedFile(null);
      setSuccess('Your study material has been uploaded.');
      setPage(0);
      setRevision(value => value + 1);
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  };
  const recordDownload = async material => {
    try {
      const updated = await shareService.recordDownload(material.id);
      setMaterials(previous => previous.map(item => item.id === updated.id ? updated : item));
    } catch (err) { setError(err.message || 'Unable to update the download count.'); }
  };

  return (
    <>
      <Navbar currentPage={pathname} variant="dashboard" onUserMenuClick={() => setUserMenuOpen(true)} onSettingsClick={() => setSettingsOpen(true)} />
      <main className="wellness-main">
        <div className="container">
          <div className="wellness-hero">
            <h2>ShareED</h2>
            <p>A simple hub where students can upload, download, and share notes, reviewer sheets, and study materials with peers.</p>
          </div>
          <section className="search-quick-access-section">
            <div className="wellness-card">
              <div className="card-header"><div className="card-icon"><i className="fas fa-search" /></div><h3>Resource Search &amp; Quick Access</h3></div>
              <div className="card-body">
                <p className="card-description">Learn together, grow together?access community-contributed study materials and reviewer sheets.</p>
                <div className="search-bar-container">
                  <input aria-label="Search study materials" className="search-input" placeholder="Search by keyword, topic, or course code..." value={search} onChange={event => setSearch(event.target.value)} />
                  <button type="button" className="search-btn" aria-label="Search" onClick={() => setPage(0)}><i className="fas fa-search" /></button>
                </div>
                <div className="filter-container">
                  <div className="filter-group"><label htmlFor="subjectFilter">Subject/Course</label>
                    <select id="subjectFilter" className="filter-select" value={subject} onChange={event => setSubject(event.target.value)}>
                      <option value="">All Subjects</option>{subjects.map(value => <option key={value}>{value}</option>)}
                    </select>
                  </div>
                  <div className="filter-group"><label htmlFor="resourceTypeFilter">Resource Type</label>
                    <select id="resourceTypeFilter" className="filter-select" value={type} onChange={event => setType(event.target.value)}>
                      <option value="">All Types</option><option value="document">Documents</option><option value="presentation">Presentations</option><option value="image">Images</option>
                    </select>
                  </div>
                  <div className="filter-group"><label htmlFor="fileFormatFilter">File Format</label>
                    <select id="fileFormatFilter" className="filter-select" value={format} onChange={event => setFormat(event.target.value)}>
                      <option value="">All Formats</option>{formats.map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <div className="resources-carousel" aria-busy={loading || isLoading}>
                  {(loading || isLoading) && <p role="status">Loading study materials...</p>}
                  {error && <div role="alert" className="error-message">{error} <button type="button" onClick={() => setRevision(value => value + 1)}>Retry</button></div>}
                  {!isLoading && !isLoggedIn && <p>Sign in to browse and share study materials. <a href="/login">Log in</a></p>}
                  {!loading && isLoggedIn && !error && filtered.length === 0 && <p role="status">{materials.length ? 'No materials match your filters.' : 'No study materials have been shared yet. Be the first to upload one.'}</p>}
                  {!loading && !error && <div className="resources-grid">
                    {visible.map(material => <article className="resource-card" key={material.id}>
                      <div className="resource-preview"><i className={resourceType(material) === 'image' ? 'fas fa-file-image' : fileFormat(material) === 'pdf' ? 'fas fa-file-pdf' : 'fas fa-file-alt'} /></div>
                      <div className="resource-info">
                        <h4 className="resource-title">{material.title}</h4>
                        <p className="resource-uploader">Uploaded by: {material.is_anonymous ? 'Anonymous Student' : material.uploader_name || 'Community member'}</p>
                        <div className="resource-meta"><span>{material.subject}</span><span>{fileFormat(material).toUpperCase()}</span><span><i className="fas fa-download" /> {material.download_count}</span></div>
                        <div className="resource-actions">
                          <a className="download-btn" href={material.file_url} download target="_blank" rel="noopener noreferrer" onClick={() => recordDownload(material)}><i className="fas fa-download" /> Download</a>
                          <button type="button" className="preview-btn" onClick={() => setPreview(material)}><i className="fas fa-eye" /> Preview</button>
                        </div>
                      </div>
                    </article>)}
                  </div>}
                  <div className="carousel-navigation">
                    <button type="button" className="carousel-btn" disabled={loading || page === 0} onClick={() => setPage(value => value - 1)}><i className="fas fa-chevron-left" /> Previous</button>
                    <button type="button" className="carousel-btn" disabled={loading || (page + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(value => value + 1)}>Next <i className="fas fa-chevron-right" /></button>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="upload-section">
            <div className="wellness-card">
              <div className="card-header"><div className="card-icon"><i className="fas fa-upload" /></div><h3>Upload Study Material</h3></div>
              <div className="card-body">
                <form className="upload-form" onSubmit={handleUpload}>
                  <fieldset disabled={uploading} style={{ border: 0, padding: 0, display: 'contents' }}>
                    <div className="form-group"><label htmlFor="resourceTitle">Title</label><input id="resourceTitle" name="title" className="upload-input" required maxLength={200} placeholder="e.g., CCC121 Midterm Reviewer - Data Structures" /></div>
                    <div className="form-group"><label htmlFor="subjectCode">Subject / Course Code</label><input id="subjectCode" name="subject" className="upload-input" required maxLength={100} placeholder="e.g., CCC121" /></div>
                    <div className="form-group"><label htmlFor="resourceDescription">Description (Optional)</label><textarea id="resourceDescription" name="description" className="upload-input" rows={3} placeholder="Describe your notes, reviewer, or study material" /></div>
                    <div className="form-group">
                      <label htmlFor="resourceFile">File Upload</label>
                      <div className="file-upload-area" role="button" tabIndex={0} onClick={() => !uploading && fileInputRef.current?.click()} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!uploading) fileInputRef.current?.click(); } }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!uploading) selectFile(event.dataTransfer.files[0]); }}>
                        <input ref={fileInputRef} type="file" id="resourceFile" name="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg" style={{ display: 'none' }} onClick={event => event.stopPropagation()} onChange={event => selectFile(event.target.files[0])} />
                        <div className="file-upload-label"><i className="fas fa-cloud-upload-alt" /><p>{selectedFile ? selectedFile.name : 'Drag and drop a file here or click to browse'}</p><span className="file-types">PDF, Word, PowerPoint, PNG or JPEG ? up to 25 MB</span></div>
                      </div>
                    </div>
                    <div className="form-group"><label className="anonymity-toggle"><input type="checkbox" name="is_anonymous" /><span className="toggle-slider" /><span className="toggle-text">Upload anonymously</span></label><p className="anonymity-note">Your identity will be hidden from other students.</p></div>
                    {uploadError && <p className="error-message" role="alert">{uploadError}</p>}
                    {success && <p className="success-message" role="status">{success}</p>}
                    <button type="submit" className="submit-btn"><i className="fas fa-upload" /> {uploading ? 'Uploading...' : 'Upload Resource'}</button>
                  </fieldset>
                  <p className="data-policy-statement"><i className="fas fa-shield-alt" /> Share only materials you have permission to distribute and follow your school's academic guidelines.</p>
                </form>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
      {preview && <div className="modal" role="dialog" aria-modal="true" aria-label="Resource preview" style={{ display: 'flex' }} onClick={() => setPreview(null)}>
        <div className="modal-content preview-modal-content" onClick={event => event.stopPropagation()}>
          <button type="button" className="close-button" aria-label="Close preview" onClick={() => setPreview(null)}>&times;</button>
          <h2>{preview.title}</h2><p>{preview.description}</p>
          {fileFormat(preview) === 'pdf' ? <div className="preview-container"><iframe src={preview.file_url} title={preview.title} /></div>
            : resourceType(preview) === 'image' ? <img src={preview.file_url} alt={preview.title} style={{ maxWidth: '100%', maxHeight: '60vh' }} />
            : <p>This file format opens in its associated application.</p>}
          <a href={preview.file_url} target="_blank" rel="noopener noreferrer" className="download-btn">Open file</a>
        </div>
      </div>}
    </>
  );
}
