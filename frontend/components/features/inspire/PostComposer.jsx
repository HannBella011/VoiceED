'use client';
import { useEffect, useRef, useState } from 'react';
import { inspireRequest } from '@/services/inspire';
import { bodyText, emptyBody } from '@/lib/inspire-body';
import RichEditor from './RichEditor';
import InspireDialog from './InspireDialog';

export default function PostComposer({ initialType = 'story', onClose, onSaved }) {
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
  return <InspireDialog title="Create Post" onClose={discard} busy={busy}>
    <form className="add-comment-form" onSubmit={submit}>
      <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <label htmlFor="post-format">Post format</label>
        <select id="post-format" value={type} onChange={event => setType(event.target.value)}>
          <option value="story">Story</option><option value="quote">Quote</option>
          {['kudos', 'milestone'].includes(initialType) && <option value={initialType}>{initialType === 'kudos' ? 'Kudos' : 'Milestone'}</option>}
        </select>
        {type !== 'quote' && <label>Title {type === 'milestone' ? '' : '(optional)'}<input required={type === 'milestone'} maxLength={200} value={title} onChange={event => setTitle(event.target.value)} /></label>}
        {type === 'kudos' && <label>Who do you want to recognize?<input required maxLength={255} value={recipient} onChange={event => setRecipient(event.target.value)} /></label>}
        <RichEditor value={body} onChange={setBody} maxLength={type === 'quote' ? 10000 : 50000} disabled={busy} />
        {type === 'quote' ? <label>Quote attribution (optional)<input maxLength={255} value={author} onChange={event => setAuthor(event.target.value)} /></label>
          : <label><input type="checkbox" checked={anonymous} onChange={event => setAnonymous(event.target.checked)} /> Post anonymously</label>}
        <label>Attachments (up to 10, 25 MB each)<input type="file" multiple accept=".png,.jpg,.jpeg,.pdf" onChange={selectFiles} /></label>
        <div className="inspire-attachment-previews">{previews.map(({ file, url }, index) => <div key={index}>{url && <img src={url} alt={file.name} />}<span>{file.name}</span><button type="button" onClick={() => removeFile(file)} aria-label={`Remove ${file.name}`}>Remove</button></div>)}</div>
        {error && <p role="alert">{error}</p>}
        {progress && <p role="status">{progress}</p>}
        <div className="form-submit"><button type="button" className="cancel-btn" onClick={discard}>Cancel</button><button type="submit" className="submit-btn" disabled={busy || !bodyText(body).trim() || (type === 'quote' && bodyText(body).length > 10000)}>{busy ? 'Publishing…' : 'Publish'}</button></div>
      </fieldset>
    </form>
  </InspireDialog>;
}
