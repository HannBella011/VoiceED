"use client";

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Navbar, Footer } from '@/components/shared';
import { useAuth } from '@/hooks';
import { useModals } from '@/components/shared/GlobalModals';
import { shareService } from '@/services/share';
import './share.css';

const PAGE_SIZE = 6;
const fileFormat = material => material.file_url.split('?')[0].split('.').pop().toLowerCase();
const resourceType = material => material.file_type.startsWith('image/') ? 'image'
  : /powerpoint|presentation/.test(material.file_type) ? 'presentation' : 'document';

export default function ShareEd() {
  const pathname = usePathname();
  const { isLoggedIn, isLoading, currentUser } = useAuth();
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
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [mine, setMine] = useState(false);
  const [locationReady, setLocationReady] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [subjectError, setSubjectError] = useState('');
  const [sort, setSort] = useState('newest');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const uploadLock = useRef(false);
  const uploadDialog = useRef(null);
  const identity = useRef(currentUser?.id);
  identity.current = currentUser?.id;
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const readLocation = () => { setMine(typeof window !== 'undefined' && new URLSearchParams(window.location?.search || '').get('mine') === '1'); setPage(1); setLocationReady(true); };
    readLocation();
    if (typeof window !== 'undefined') window.addEventListener?.('popstate', readLocation);
    return () => { if (typeof window !== 'undefined') window.removeEventListener?.('popstate', readLocation); };
  }, []);

  useEffect(() => {
    if (search.trim() === debouncedSearch) return;
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);
  useEffect(() => {
    const controller = new AbortController();
    if (isLoading || !locationReady) return () => controller.abort();
    setMaterials([]); setTotal(0); setHasMore(false); setLoading(isLoggedIn); setError('');
    if (!isLoggedIn) return () => controller.abort();
    const load = async () => {
      try {
        const data = await shareService.getMaterials({ page, limit: PAGE_SIZE, envelope: true,
          search: debouncedSearch, subject: subject || undefined, resource_type: type || undefined,
          file_format: format || undefined, sort, ...(mine ? { mine: true } : {}) }, { signal: controller.signal });
        if (!data || !Array.isArray(data.items)) throw new Error('Unable to read study materials.');
        if (!controller.signal.aborted) {
          setMaterials(data.items); setTotal(data.total); setHasMore(data.has_more);
          if (page > 1 && data.items.length === 0) setPage(Math.max(1, data.total_pages));
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message || 'Unable to load materials. Please try again.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [isLoggedIn, isLoading, currentUser?.id, revision, page, debouncedSearch, subject, type, format, sort, mine, locationReady]);
  useEffect(() => {
    const controller = new AbortController();
    setSubjects([]); setSubjectError('');
    if (!isLoading && isLoggedIn) shareService.getSubjects({ signal: controller.signal })
      .then(values => { if (!controller.signal.aborted) setSubjects(values); })
      .catch(err => { if (!controller.signal.aborted) setSubjectError(err.message || 'Unable to load subjects.'); });
    return () => controller.abort();
  }, [isLoading, isLoggedIn, currentUser?.id, revision]);
  useEffect(() => { setUploadOpen(false); setPreview(null); setSelectedFile(null); setUploadError(''); }, [currentUser?.id]);
  useEffect(() => {
    if (!uploadOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; uploadDialog.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [uploadOpen]);
  const closeUpload = () => { if (!uploadLock.current) { setUploadOpen(false); setSelectedFile(null); setUploadError(''); } };
  const modalKeys = event => {
    if (event.key === 'Escape') { event.stopPropagation(); closeUpload(); }
    if (event.key !== 'Tab') return;
    const nodes = Array.from(uploadDialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled):not([type="file"]),textarea:not(:disabled),[role="button"][tabindex="0"]'));
    if (!nodes.length) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === nodes[0] || document.activeElement === uploadDialog.current)) { event.preventDefault(); nodes[nodes.length - 1].focus(); }
    else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) { event.preventDefault(); nodes[0].focus(); }
  };
  useEffect(() => {
    if (!preview) return;
    const close = event => { if (event.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [preview]);

  const formats = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'png', 'jpeg'];

  const selectFile = file => {
    if (!file) return;
    setSelectedFile(file);
    setUploadError('');
  };
  const handleUpload = async event => {
    event.preventDefault();
    if (!isLoggedIn) { setLoginRequiredOpen(true); return; }
    if (uploadLock.current) return;
    const owner = currentUser?.id;
    setUploadError('');
    setSuccess('');
    if (!selectedFile) { setUploadError('Please select a file.'); return; }
    if (selectedFile.size > 25 * 1024 * 1024) { setUploadError('Files must be 25 MB or smaller.'); return; }
    const form = event.currentTarget;
    const body = new FormData(form);
    body.set('file', selectedFile);
    body.set('is_anonymous', form.elements.is_anonymous.checked ? 'true' : 'false');
    uploadLock.current = true; setUploading(true);
    try {
      await shareService.uploadMaterial(body);
      if (identity.current !== owner) return;
      form.reset();
      setSelectedFile(null);
      setSuccess('Your study material has been uploaded.');
      setUploadOpen(false);
      setPage(1);
      setRevision(value => value + 1);
    } catch (err) {
      if (identity.current === owner) setUploadError(err.message || 'Upload failed. Please try again.');
    } finally { uploadLock.current = false; setUploading(false); }
  };
  const recordDownload = async material => {
    const owner = currentUser?.id;
    try {
      const updated = await shareService.recordDownload(material.id);
      if (identity.current !== owner) return;
      setMaterials(previous => previous.map(item => item.id === updated.id ? updated : item));
      if (sort === 'downloads') setRevision(value => value + 1);
    } catch (err) { if (identity.current === owner) setError(err.message || 'Unable to update the download count.'); }
  };

  return (
    <>
      <Navbar currentPage={pathname} variant="dashboard" onUserMenuClick={() => setUserMenuOpen(true)} onSettingsClick={() => setSettingsOpen(true)} />
      <main className="wellness-main share-page">
        <div className="container">
          <div className="wellness-hero">
            <h2>ShareED</h2>
            <p>A simple hub where students can upload, download, and share notes, reviewer sheets, and study materials with peers.</p>
          </div>
          {mine && <p>Your shared resources. <a href="/share-ed" onClick={event => { event.preventDefault(); setMine(false); setPage(1); window.history.replaceState({}, '', '/share-ed'); }}>Browse all resources</a></p>}
          {success && <p className="success-message" role="status">{success}</p>}
          <section className="search-quick-access-section" aria-label="Resource search controls">
            <div className="wellness-card">
              <div className="card-header"><h3>Resource search</h3><div className="share-upload-action"><button type="button" className="btn btn--primary btn--sm" aria-label="Upload resource" onClick={() => { if (!isLoggedIn) { setLoginRequiredOpen(true); return; } setUploadOpen(true); setSuccess(''); }}><i className="fas fa-upload" /> Upload</button></div></div>
              <div className="card-body">
                <p className="card-description">Learn together, grow together — access community-contributed study materials and reviewer sheets.</p>
                <div className="search-bar-container">
                  <input aria-label="Search study materials" className="search-input" placeholder="Search by keyword, topic, or course code..." value={search} onChange={event => setSearch(event.target.value)} />
                  <button type="button" className="search-btn" aria-label="Search" onClick={() => { setDebouncedSearch(search.trim()); setPage(1); }}><i className="fas fa-search" /></button>
                </div>
                <div className="filter-container">
                  {subjectError && <p role="alert">{subjectError} <button type="button" onClick={() => setRevision(value => value + 1)}>Retry</button></p>}
                  <div className="filter-group"><label htmlFor="subjectFilter">Subject/Course</label>
                    <select id="subjectFilter" className="filter-select" value={subject} onChange={event => { setSubject(event.target.value); setPage(1); }}>
                      <option value="">All Subjects</option>{subjects.map(value => <option key={value}>{value}</option>)}
                    </select>
                  </div>
                  <div className="filter-group"><label htmlFor="resourceTypeFilter">Resource Type</label>
                    <select id="resourceTypeFilter" className="filter-select" value={type} onChange={event => { setType(event.target.value); setPage(1); }}>
                      <option value="">All Types</option><option value="document">Documents</option><option value="presentation">Presentations</option><option value="image">Images</option>
                    </select>
                  </div>
                  <div className="filter-group"><label htmlFor="fileFormatFilter">File Format</label>
                    <select id="fileFormatFilter" className="filter-select" value={format} onChange={event => { setFormat(event.target.value); setPage(1); }}>
                      <option value="">All Formats</option>{formats.map(value => <option key={value} value={value}>{value === 'jpeg' ? 'JPG / JPEG' : value.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="filter-group"><label htmlFor="resourceSort">Sort by</label><select id="resourceSort" className="filter-select" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option><option value="downloads">Most downloaded</option></select></div>
                </div>
              </div>
            </div>
          </section>
          <section className="search-quick-access-section" aria-label="Resource search results">
            <div className="wellness-card">
              <div className="card-header"><div className="card-icon"><i className="fas fa-book" /></div><h3>Study materials</h3></div>
              <div className="card-body">
                <div className="resources-carousel" aria-busy={loading || isLoading}>
                  {(loading || isLoading) && <p role="status">Loading study materials...</p>}
                  {error && <div role="alert" className="error-message">{error} <button type="button" onClick={() => setRevision(value => value + 1)}>Retry</button></div>}
                  {!isLoading && !isLoggedIn && <p>Sign in to browse and share study materials. <a href="/login">Log in</a></p>}
                  {!loading && isLoggedIn && !error && materials.length === 0 && <p role="status">{debouncedSearch || subject || type || format ? 'No materials match your filters.' : 'No study materials have been shared yet. Be the first to upload one.'}</p>}
                  {!loading && !error && <div className="resources-grid">
                    {materials.map(material => <article className="resource-card" key={material.id}>
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
                    <button type="button" className="carousel-btn" disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}><i className="fas fa-chevron-left" /> Previous</button>
                    <span role="status">Page {page} · {total} resources</span>
                    <button type="button" className="carousel-btn" disabled={loading || !hasMore} onClick={() => setPage(value => value + 1)}>Next <i className="fas fa-chevron-right" /></button>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
      <Footer />
      {uploadOpen && <div className="modal share-upload-modal" style={{ display: 'flex' }} onClick={closeUpload}>
        <div className="modal-content" role="dialog" aria-modal="true" aria-labelledby="share-upload-title" tabIndex={-1} ref={uploadDialog} onKeyDown={modalKeys} onClick={event => event.stopPropagation()}>
          <section className="upload-section"><button type="button" className="close-button" aria-label="Close upload" disabled={uploading} onClick={closeUpload}>&times;</button>
            <div className="wellness-card">
              <div className="card-header"><div className="card-icon"><i className="fas fa-upload" /></div><h3 id="share-upload-title">Upload Study Material</h3></div>
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
                        <div className="file-upload-label"><i className="fas fa-cloud-upload-alt" /><p>{selectedFile ? selectedFile.name : 'Drag and drop a file here or click to browse'}</p><span className="file-types">PDF, Word, PowerPoint, PNG or JPEG — up to 25 MB</span></div>
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
      </div>}
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
