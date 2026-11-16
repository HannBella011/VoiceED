'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, Footer } from '@/components/shared';
import { useAuthContext } from '@/context/AuthContext';
import { useModals } from '@/components/shared/GlobalModals';
import { adminService } from '@/services/admin';
import RichBody from '@/components/features/inspire/RichBody';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import styles from '@/app/admin/admin.module.css';
import NotificationToasts from '@/components/shared/NotificationToasts';
import { useNotifications } from '@/hooks/useNotifications';
import ContentStatistics from './ContentStatistics';

const kinds = { resource: 'ShareED resources', story: 'InspireED stories & posts', quote: 'InspireED quotes', comment: 'Comments' };

export default function ContentAdministration({kind=null, id=null, historyMode=false}={}) {
  const isDetail=kind!==null&&id!==null;
  const {notifications,show:notify,hide:dismiss}=useNotifications();
  const pathname = usePathname();
  const { currentUser, isLoggedIn, isLoading } = useAuthContext();
  const { setSettingsOpen } = useModals();
  const allowed = !isLoading && isLoggedIn && ['admin', 'super_admin'].includes(currentUser?.role);
  const session = `${currentUser?.id}:${currentUser?.role}:${kind}:${id}:${historyMode}`;
  const identity = useRef(session); identity.current = session;
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ kind: '', state: 'visible', page: 1, sort: 'newest' });
  const view = historyMode ? 'audit' : 'content';
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [aggregates, setAggregates] = useState(null);
  const [statisticsError, setStatisticsError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [reason, setReason] = useState('');
  const [policy, setPolicy] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [preview, setPreview] = useState(null);
  const savingRef = useRef(false);
  const detailSequence = useRef(0);
  const previewSequence = useRef(0);
  const visibleData = data?.session === session ? data.value : null;
  const visibleDetail = detail?.session === session ? detail.value : null;

  useEffect(() => {
    if (search.trim() === debounced) return;
    const timer = setTimeout(() => { setDebounced(search.trim()); setFilters(value => ({ ...value, page: 1 })); }, 300);
    return () => clearTimeout(timer);
  }, [search, debounced]);
  useEffect(() => {
    if (!allowed || isDetail || historyMode) return;
    const controller = new AbortController(); setStatisticsError('');
    adminService.stats({signal:controller.signal}).then(value => {if (!controller.signal.aborted) setAggregates({session,value});}).catch(error => {if (!controller.signal.aborted) setStatisticsError(error.message);});
    return () => controller.abort();
  }, [allowed, isDetail, historyMode, session, revision]);
  useEffect(() => {
    if (!allowed || isDetail) return;
    const controller = new AbortController();
    setData(null); setLoading(true); setError('');
    const values = { page: filters.page, limit: 20, kind: filters.kind || undefined, search: debounced };
    const request = view === 'audit' ? adminService.audit(values, { signal: controller.signal })
      : adminService.content({ ...values, state: filters.state, sort: filters.sort }, { signal: controller.signal });
    request.then(value => { if (!controller.signal.aborted) {
      setData({ session, value });
      if (filters.page > 1 && !value.items.length) setFilters(previous => ({ ...previous, page: Math.max(1, value.total_pages) }));
    } }).catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [allowed, session, filters.kind, filters.state, filters.sort, filters.page, debounced, view, revision, isDetail]);
  useEffect(() => {
    detailSequence.current++; previewSequence.current++; setConfirmation(null); setDetail(null); setDetailLoading(false); setPreview(null); setReason(''); setPolicy(''); setNotes(''); setDetailError('');
  }, [session, allowed]);
  useEffect(() => {
    if (!allowed) return;
    if (isDetail) {
      if (kinds[kind] && /^[1-9][0-9]*$/.test(String(id))) openDetail(kind, Number(id));
      else setDetailError('This content link is invalid. Return to content moderation and choose a record.');
      return;
    }
    if (typeof window === 'undefined') return;
    const query = new URLSearchParams(window.location?.search || '');
    const legacyKind = query.get('kind'), legacyId = query.get('content');
    if (kinds[legacyKind] && /^[1-9][0-9]*$/.test(legacyId || '')) window.location.replace(`/admin/content/${legacyKind}/${legacyId}`);
  }, [session, allowed, isDetail, kind, id]);

  async function openDetail(kind, id) {
    if (savingRef.current) return;
    setConfirmation(null);
    const sequence = ++detailSequence.current;
    setDetail(null); setPreview(null); setDetailLoading(true); setDetailError(''); setReason(''); setPolicy(''); setNotes('');
    try {
      const value = await adminService.detail(kind, id);
      if (sequence === detailSequence.current && identity.current === session) setDetail({ session, value });
    } catch (error) { if (sequence === detailSequence.current) setDetailError(error.message); }
    finally { if (sequence === detailSequence.current) setDetailLoading(false); }
  }
  async function remove(event) {
    event.preventDefault();
    if (!visibleDetail || savingRef.current || !reason.trim()) return;
    setDetailError('');
    setConfirmation({ session, kind: visibleDetail.kind, id: visibleDetail.id, title: visibleDetail.title, payload: { reason: reason.trim(), policy_reference: policy.trim() || null, internal_notes: notes.trim() || null } });
  }
  async function confirmRemoval() {
    if (!confirmation || confirmation.session !== identity.current || savingRef.current) return;
    const action = confirmation;
    savingRef.current = true; setSaving(true); setDetailError('');
    let result;
    try {
      result = await adminService.remove(action.kind, action.id, action.payload);
      if (identity.current !== session) return;
      notify(result.author_available ? 'Content removed. A message was sent to the author.' : 'Content removed. No linked author account is available for a message.');
      setRevision(value => value + 1);
      setConfirmation(null);
    } catch (error) { if (identity.current === session) {setDetailError(error.message);notify(error.message,'error');} }
    finally { savingRef.current = false; setSaving(false); }
    if (result && identity.current === session) await openDetail(action.kind, action.id);
  }
  async function attachment(file) {
    const sequence = detailSequence.current;
    const previewRequest = ++previewSequence.current;
    setPreview({ file });
    try {
      const { url } = await adminService.attachment(file.id);
      if (sequence === detailSequence.current && previewRequest === previewSequence.current && identity.current === session) setPreview({ file, url });
    } catch (error) { if (sequence === detailSequence.current && previewRequest === previewSequence.current) setPreview({ file, error: error.message }); }
  }
  function closePreview() { previewSequence.current++; setPreview(null); }
  const changeFilter = (key, value) => setFilters(previous => ({ ...previous, [key]: value, page: 1 }));
  return <>
    <NotificationToasts notifications={notifications} onDismiss={dismiss} />
    <Navbar currentPage={pathname} onSettingsClick={() => setSettingsOpen(true)} />
    <main className={`dashboard-main ${styles.page}`}><div className="container">
      <div className={styles.header}><div><h1>{isDetail?'Content Review':historyMode?'Moderation History':'Content Dashboard'}</h1><p>{isDetail?'Review this content and its moderation history':historyMode?'Review recorded content moderation actions':'Review published content and manage moderation'}</p></div>{isDetail && <div className={styles.headerActions}><a className="btn btn--secondary" href="/admin">Back to content moderation</a>{allowed && <button type="button" className="btn btn--secondary" disabled={loading || detailLoading || saving} onClick={() => openDetail(kind,Number(id))}>Refresh</button>}</div>}</div>
      {isLoading ? <p role="status">Checking administrator access…</p> : !allowed ? <div className="access-denied"><h2>Access Denied</h2><p>Administrator access is required.</p></div> : <>
        {!isDetail && <>
        {!historyMode && <>{statisticsError && <p role="alert">{statisticsError}</p>}<ContentStatistics data={aggregates?.session===session?aggregates.value:null} /></>}
        <section aria-label="Moderation tools"><div>
          <nav className={styles.tabs} aria-label="Content administration"><a className="btn btn--secondary" href="/admin" aria-current={!historyMode?'page':undefined}>Content moderation</a><a className="btn btn--secondary" href="/admin/history" aria-current={historyMode?'page':undefined}>Moderation history</a></nav>
          <div className={`${styles.filters} ${styles.filterBar}`}><label>Content type<select aria-label="Content type" className="filter-select" value={filters.kind} onChange={event => changeFilter('kind', event.target.value)}><option value="">All content</option>{Object.entries(kinds).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            {view === 'content' && <><label>Removal state<select aria-label="Removal state" className="filter-select" value={filters.state} onChange={event => changeFilter('state', event.target.value)}><option value="visible">Not removed</option><option value="removed">Removed</option><option value="all">All states</option></select></label><label>Sort<select aria-label="Sort content" className="filter-select" value={filters.sort} onChange={event => changeFilter('sort', event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label></>}
            <label>Search<input aria-label="Search moderation content" className="search-input" maxLength={200} value={search} onChange={event => setSearch(event.target.value)} placeholder={view === 'audit' ? 'Title or removal reason' : 'Title or content'} /></label><div className={styles.filterActions}><button type="button" className="btn btn--secondary btn--sm" disabled={loading} onClick={() => setRevision(value => value + 1)}>Refresh</button><button type="button" className="btn btn--secondary btn--sm" onClick={() => {setSearch('');setDebounced('');setFilters({kind:'',state:'visible',page:1,sort:'newest'});}}>Clear filters</button></div></div>
          {error && <p role="alert">{error} <button type="button" onClick={() => setRevision(value => value + 1)}>Retry list</button></p>}
          {loading ? <p role="status">Loading content…</p> : !error && visibleData?.items.length === 0 ? <p>No matching content.</p> : <div className={styles.collection}>{visibleData?.items.map(item => view === 'audit' ? <article className={styles.record} key={item.id}><h3>{item.content_title}</h3><p>{item.content_type} #{item.content_id} · {new Date(item.created_at).toLocaleString()} · {item.administrator}</p><p>Reason: {item.reason}</p>{item.policy_reference && <p>Policy explanation: {item.policy_reference}</p>}{item.internal_notes && <p>Administrator-only notes: {item.internal_notes}</p>}<a className="btn btn--secondary btn--sm" href={`/admin/content/${item.content_type}/${item.content_id}`}>Review content</a></article> : <article className={styles.record} key={`${item.kind}:${item.id}`}><h3>{item.title}</h3><p>{item.post_type} #{item.id} · {item.author} · {new Date(item.created_at).toLocaleString()} · <span className={styles.badge}>{item.removed_at ? 'Removed' : 'Not removed'}</span></p><p>{item.excerpt}</p><a className="btn btn--secondary btn--sm" href={`/admin/content/${item.kind}/${item.id}`}>Review content</a></article>)}</div>}
          <div className={styles.pagination}><button type="button" className="btn btn--secondary btn--sm" disabled={loading || filters.page === 1} onClick={() => setFilters(value => ({ ...value, page: value.page - 1 }))}>Previous</button><span>Page {filters.page} · {visibleData?.total ?? '—'} records</span><button type="button" className="btn btn--secondary btn--sm" disabled={loading || !visibleData?.has_more} onClick={() => setFilters(value => ({ ...value, page: value.page + 1 }))}>Next</button></div>
        </div></section>
        </>}
        {isDetail && <section className="wellness-card" aria-label="Content review"><div className="card-body">
          {detailLoading && <p role="status">Loading review…</p>}{detailError && <p role="alert">{detailError}</p>}
          {visibleDetail && <><h2>{visibleDetail.title}</h2><p>{visibleDetail.kind} #{visibleDetail.id} · {visibleDetail.author} · {new Date(visibleDetail.created_at).toLocaleString()}</p><RichBody body={visibleDetail.body} fallback={visibleDetail.text || ''} />
            {visibleDetail.parent && <a href={`/admin/content/${visibleDetail.parent.kind}/${visibleDetail.parent.id}`}>Review parent post</a>}
            {visibleDetail.file_url && <a href={visibleDetail.file_url} target="_blank" rel="noopener noreferrer">Open resource file</a>}
            {visibleDetail.attachments?.map(file => <button type="button" key={file.id} className="btn btn--secondary" onClick={() => attachment(file)}>{file.filename}</button>)}

            {visibleDetail.removed_at ? <p>Removed on {new Date(visibleDetail.removed_at).toLocaleString()}.</p> : <form onSubmit={remove} className={styles.removal}>
              <label>Reason for removal (sent to author)<textarea aria-label="Removal reason" required maxLength={5000} disabled={saving} value={reason} onChange={event => setReason(event.target.value)} /></label>
              <label>Policy explanation (optional, sent to author)<textarea aria-label="Policy explanation" maxLength={1000} disabled={saving} value={policy} onChange={event => setPolicy(event.target.value)} /></label>
              <label>Administrator-only notes (optional)<textarea aria-label="Internal notes" maxLength={5000} disabled={saving} value={notes} onChange={event => setNotes(event.target.value)} /></label>
              <div className="voiceed-actions voiceed-actions--separated"><button type="submit" className="btn btn--danger" disabled={saving || !reason.trim()}>{saving ? 'Removing…' : 'Remove content and notify author'}</button></div>
            </form>}
            {visibleDetail.history?.items.map(action => <article key={action.id}><h4>Removal record</h4><p>{action.administrator} · {new Date(action.created_at).toLocaleString()}</p><p>Reason: {action.reason}</p>{action.policy_reference && <p>Policy explanation: {action.policy_reference}</p>}{action.internal_notes && <p>Administrator-only notes: {action.internal_notes}</p>}<p>{action.notification_id ? 'Author message recorded.' : action.author_available ? 'Author message is no longer retained.' : 'No linked author account.'}</p></article>)}
          </>}
        </div></section>}
      </>}
    </div></main>
    {allowed && preview && <ConfirmationDialog open title={preview.file.filename} className={styles.previewDialog} hideActions dialogRole="dialog" onCancel={closePreview}>
      <div className={styles.previewContent}>{preview.error ? <p role="alert">{preview.error}</p> : !preview.url ? <p role="status">Opening attachment...</p> : preview.file.mime_type === 'application/pdf' ? <iframe src={preview.url} title={preview.file.filename} referrerPolicy="no-referrer" /> : <img src={preview.url} alt={preview.file.filename} />}</div>
      <div className="voiceed-actions"><button className="btn btn--secondary" onClick={closePreview}>Close</button>{preview.url && <a className="btn btn--secondary" href={preview.url} target="_blank" rel="noopener noreferrer">Open original</a>}</div>
    </ConfirmationDialog>}
    {allowed && confirmation?.session === session && <ConfirmationDialog open title="Remove published content?" description="This content will be hidden from public listings and its linked author will receive your removal reason." entity={`${confirmation.title} · ${confirmation.kind} #${confirmation.id}`} consequences="The record and moderation history are retained. This dashboard does not offer an undo action." confirmLabel="Remove content" variant="danger" busy={saving} error={detailError} onCancel={() => setConfirmation(null)} onConfirm={confirmRemoval}><p><strong>Removal reason:</strong> {confirmation.payload.reason}</p></ConfirmationDialog>}
    <Footer />
  </>;
}
