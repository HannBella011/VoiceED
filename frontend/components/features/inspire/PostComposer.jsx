'use client';
import { useEffect, useRef, useState } from 'react';
import { inspireRequest } from '@/services/inspire';
import { bodyText, emptyBody } from '@/lib/inspire-body';
import RichEditor from './RichEditor';
import InspireDialog from './InspireDialog';
import RichBody from './RichBody';

export default function PostComposer({ initialType = 'story', authorName = 'You', authorVerified = false, onClose, onSaved }) {
  const [preview, setPreview] = useState(false);
  const previewPanel = useRef(null);
  useEffect(() => {
    if (!preview) return;
    previewPanel.current?.focus({ preventScroll: true });
    const dialog = previewPanel.current?.closest('.modal-content');
    if (dialog) dialog.scrollTop = 0;
  }, [preview]);
  const [type, setType] = useState(initialType === 'post' ? 'story' : initialType);
  const [body, setBody] = useState(emptyBody);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const uploaded = useRef(new Map());
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const values = files.map(file => ({ file, url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null }));
    setPreviews(values);
    return () => values.forEach(item => { if (item.url) URL.revokeObjectURL(item.url); });
  }, [files]);
  const discard = () => {
    if (sending.current) return;
    uploaded.current.forEach(id => inspireRequest(`/attachments/${id}`, { method: 'DELETE' }).catch(() => {}));
    onClose();
  };
  const selectFiles = event => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length + incoming.length > 10) { setError('Choose at most 10 attachments.'); return; }
    if (incoming.some(file => file.size === 0 || file.size > 25 * 1024 * 1024 || !/\.(png|jpe?g|pdf)$/i.test(file.name) || !['image/png', 'image/jpeg', 'application/pdf'].includes(file.type))) {
      setError('Choose nonempty PNG, JPG, JPEG or PDF files, up to 25 MB each.'); return;
    }
    setError(''); setFiles(previous => [...previous, ...incoming]);
  };
  const removeFile = file => {
    const id = uploaded.current.get(file);
    if (id) inspireRequest(`/attachments/${id}`, { method: 'DELETE' }).catch(() => {});
    uploaded.current.delete(file);
    setFiles(previous => previous.filter(item => item !== file));
  };
  const submit = async event => {
    event.preventDefault();
    if (sending.current) return;
    if (!bodyText(body).trim()) return;
    if (!preview) { setError(''); setPreview(true); return; }
    sending.current = true; setBusy(true); setError('');
    let saved = null;
    try {
      for (let index = 0; index < files.length; index++) {
        if (!mounted.current) return;
        const file = files[index];
        if (uploaded.current.has(file)) continue;
        setProgress(`Uploading attachment ${index + 1} of ${files.length}…`);
        const data = new FormData(); data.set('file', file);
        const attachment = await inspireRequest('/attachments', { method: 'POST', data });
        uploaded.current.set(file, attachment.id);
      }
      if (!mounted.current) return;
      setProgress('Saving post…');
      const common = { body, attachment_ids: files.map(file => uploaded.current.get(file)) };
      saved = await inspireRequest(type === 'quote' ? '/quotes' : '/stories', { method: 'POST', data: type === 'quote'
        ? { ...common, author: author || null }
        : { ...common, title: title.trim() || (type === 'story' ? 'Story' : 'Post'), post_type: type, is_anonymous: anonymous, recipient_label: type === 'kudos' ? recipient : null } });
    } catch (error) { setError(error.message); }
    finally { sending.current = false; setBusy(false); setProgress(''); }
    if (saved) { uploaded.current.clear(); if (mounted.current) onSaved(saved); }
  };
  const displayAuthor = anonymous && type !== 'quote' ? 'Anonymous' : authorName;
  return <InspireDialog title={preview ? 'Preview Post' : 'Create Post'} onClose={discard} busy={busy}>
    <form className="add-comment-form" onSubmit={submit}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <div hidden={preview}>
        <label htmlFor="post-format">Post format</label>
        <select id="post-format" value={type} onChange={event => setType(event.target.value)}>
          <option value="story">Story</option><option value="quote">Quote</option>
          {['kudos', 'milestone'].includes(initialType) && <option value={initialType}>{initialType === 'kudos' ? 'Kudos' : 'Milestone'}</option>}
        </select>
        {type !== 'quote' && <label>Title {type === 'milestone' ? '' : '(optional)'}<input required={type === 'milestone'} maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /></label>}
        {type === 'kudos' && <label>Who do you want to recognize?<input required maxLength={255} value={recipient} onChange={event => setRecipient(event.target.value)} /></label>}
        <RichEditor value={body} onChange={setBody} maxLength={type === 'quote' ? 10000 : 50000} disabled={busy} />
        {type === 'quote' ? <label>Quote attribution (optional)<input maxLength={255} value={author} onChange={event => setAuthor(event.target.value)} /></label>
          : <label><input type="checkbox" checked={anonymous} onChange={eent => setAnonymous(event.target.checked)} /> Post anonymously</label>}
        <label className="inspire-file-picker">Attachments (up to 10, 25 MB each)<input type="file" multiple accept=".png,.jpg,.jpeg,.pdf" onChange={selectFiles} /></label>
        <div className="inspire-attachment-previews">{previews.map(({ file, url }, index) => <div key={index}>{url && <img src={url} alt={file.name} />}<span>{file.name}</span><button type="button" onClick={() => removeFile(file)} aria-label={`Remove ${file.name}`}>Remove</button></div>)}</div>
        </div>
        {preview && <section className="inspire-post-preview" aria-label="Full post preview" ref={previewPanel} tabIndex={-1}>
          <article className="post-card">
            <div className="post-header">
              <div className="post-avatar">{displayAuthor.charAt(0)}</div>
              <div className="post-author-info"><div className="post-author-name">{displayAuthor}{authorVerified && displayAuthor !== 'Anonymous' && <span aria-label="Verified student"> ✓</span>}</div><span className="post-time">Ready to publish</span></div>
              <span className="post-type">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            </div>
            <div className="post-content">
              {type !== 'quote' && <h4>{title.trim() || (type === 'story' ? 'Story' : 'Post')}</h4>}
              {type === 'kudos' && <strong>To: {recipient}</strong>}
              <RichBody body={body} />
              {type === 'quote' && <p>— {author.trim() || 'Unknown'}</p>}
              {files.length > 0 && <div className="inspire-preview-files">{files.map((file, index) => <figure key={index}>{previews.find(item => item.file === file)?.url && <img src={previews.find(item => item.file === file).url} alt={file.name} />}<figcaption>{file.type === 'application/pdf' && <span aria-hidden="true">PDF · </span>}{file.name}</figcaption></figure>)}</div>}
            </div>
          </article>
        </section>}
        {error && <p role="alert">{error}</p>}
        {progress && <p role="status">{progress}</p>}
        <div className="form-submit"><button type="button" className="cancel-btn" onClick={preview ? () => setPreview(false) : discard}>{preview ? 'Back to editing' : 'Cancel'}</button><button type="submit" className="submit-btn" disabled={busy || !bodyText(body).trim() || (type === 'quote' && bodyText(body).length > 10000)}>{busy ? 'Publishing…' : preview ? 'Publish' : 'Preview'}</button></div>
      </fieldset>
    </form>
  </InspireDialog>;
}
