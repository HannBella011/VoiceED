'use client';
import { useBlockingLoading } from '@/components/shared/GlobalLoading';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar, Footer } from '@/components/shared';
import { useAuthContext } from '@/context/AuthContext';
import { useModals } from '@/components/shared/GlobalModals';
import { superService } from '@/services/super';
import styles from '@/app/admin/admin.module.css';
import NotificationToasts from '@/components/shared/NotificationToasts';
import { useNotifications } from '@/hooks/useNotifications';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import FormDialog from '@/components/shared/FormDialog';

const emptyUser=()=>({email:'',username:'',full_name:'',school_id:''});
const roleLabels={student:'Student',admin:'Administrator',super_admin:'Superadministrator'};
const privileges={student:'Regular VoiceED access without administrative permissions.',admin:'Report management and content moderation access.',super_admin:'Account, role, student verification and platform administration access.'};
const labels={total:'Total Registered Users',verified:'Verified Students',unverified:'Unverified Students',administrators:'Administrators',superadministrators:'Superadministrators',suspended:'Suspended Accounts'};
export default function AccountAdministration({accountId=null}={}){
  const {notifications,show:notify,hide:dismiss}=useNotifications();
  const {currentUser,isLoggedIn,isLoading}=useAuthContext();const pathname=usePathname();const {setSettingsOpen}=useModals();
  const allowed=!isLoading&&isLoggedIn&&currentUser?.role==='super_admin';const session=`${currentUser?.id}:${currentUser?.role}`;const owner=useRef(session);owner.current=session;
  const [stats,setStats]=useState(null),[data,setData]=useState(null),[selection,setSelection]=useState(null);
  const [filters,setFilters]=useState({role:'',verified:'',active:'',page:1,sort:'newest'}),[search,setSearch]=useState(''),[debounced,setDebounced]=useState('');
  const [revision,setRevision]=useState(0),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
  const busy=useRef(false),sequence=useRef(0),inviteId=useRef(null);const [invitePending,setInvitePending]=useState(false);
  const [draft,setDraft]=useState({username:'',full_name:'',school_id:'',role:'student'}),[reason,setReason]=useState(''),[notes,setNotes]=useState(''),[reviewed,setReviewed]=useState(false);
  const [activity,setActivity]=useState(null),[activityMode,setActivityMode]=useState('account'),[actor,setActor]=useState(''),[activityPage,setActivityPage]=useState(1);
  const [createOpen,setCreateOpen]=useState(false),[newUser,setNewUser]=useState(emptyUser);
  const [confirmation,setConfirmation]=useState(null);const pendingAction=useRef(null);
  const [recoverId,setRecoverId]=useState(''),[recoverName,setRecoverName]=useState('');
  const selected=selection?.session===session?selection.value:null, users=data?.session===session?data.value:null, counts=stats?.session===session?stats.value:null;
  const events=activity?.session===session?activity.value:null;
  const [detailPending, setDetailPending] = useState(false);
  useBlockingLoading(allowed && (saving || detailPending));
  useEffect(()=>{if(search.trim()===debounced)return;const timer=setTimeout(()=>{setDebounced(search.trim());setFilters(value=>({...value,page:1}));},300);return()=>clearTimeout(timer);},[search,debounced]);
  useEffect(()=>{if(!allowed||accountId)return;const controller=new AbortController();superService.stats({signal:controller.signal}).then(value=>{if(!controller.signal.aborted)setStats({session,value});}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});return()=>controller.abort();},[allowed,session,revision,accountId]);
  useEffect(()=>{if(!allowed||accountId)return;const controller=new AbortController();setData(null);setLoading(true);superService.users({...filters,search:debounced,limit:20,verified:filters.verified===''?undefined:filters.verified==='true',active:filters.active===''?undefined:filters.active==='true'},{signal:controller.signal}).then(value=>{if(!controller.signal.aborted){setData({session,value});if(filters.page>1&&!value.items.length)setFilters(previous=>({...previous,page:Math.max(1,value.total_pages)}));}}).catch(error=>{if(!controller.signal.aborted)setError(error.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[allowed,session,filters.role,filters.active,filters.verified,filters.sort,filters.page,debounced,revision]);
  useEffect(()=>{if(!allowed||accountId)return;const controller=new AbortController();setActivity(null);const values={page:activityPage,limit:20,actor_id:actor||undefined};const request=activityMode==='account'?superService.audit(values,{signal:controller.signal}):superService.moderation(values,{signal:controller.signal});request.then(value=>{if(!controller.signal.aborted)setActivity({session,value});}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});return()=>controller.abort();},[allowed,session,actor,activityMode,activityPage,revision]);
  useEffect(()=>{setCreateOpen(false);setNewUser(emptyUser());sequence.current++;setDetailPending(false);pendingAction.current=null;setConfirmation(null);setSelection(null);setError('');setNotice('');setReason('');setNotes('');setReviewed(false);inviteId.current=null;setInvitePending(false);},[session,allowed]);
  useEffect(()=>{if(allowed&&accountId)open(accountId);},[allowed,session,accountId]);
  useEffect(()=>{if(!accountId&&typeof window!=='undefined'&&new URLSearchParams(window.location?.search||'').get('notice')==='account-deactivated')notify('Account deactivated.');},[accountId]);
  useEffect(()=>{if(!accountId&&typeof window!=='undefined'){const id=new URLSearchParams(window.location?.search||'').get('actor');if(id)setActor(id);const mode=new URLSearchParams(window.location?.search||'').get('activity');if(mode==='moderation')setActivityMode(mode);}},[accountId]);
  const change=(key,value)=>setFilters(previous=>({...previous,[key]:value,page:1}));
  async function open(id){if(busy.current)return;pendingAction.current=null;setConfirmation(null);const number=++sequence.current;setDetailPending(true);setSelection(null);setError('');try{const value=await superService.detail(id);if(number!==sequence.current||owner.current!==session)return;setSelection({session,value});setDraft({username:value.username,full_name:value.full_name||'',school_id:value.school_id||'',role:value.role});setReason('');setNotes('');setReviewed(false);}catch(error){if(number===sequence.current)setError(error.message);}finally{if(number===sequence.current)setDetailPending(false);}}
  async function run(callback,message){
    if(busy.current)return false;
    busy.current=true;setSaving(true);setError('');setNotice('');
    try{await callback();if(owner.current!==session)return false;setNotice(message);notify(message);setRevision(value=>value+1);return true;}
    catch(error){if(owner.current===session){setError(error.message+(error.operationId?` (Action ${error.operationId}; review history to reconcile.)`:''));notify(error.message,'error');}return false;}
    finally{busy.current=false;setSaving(false);}
  }
  function ask(action){
    if(!allowed||busy.current)return;
    const pending={...action,session};pendingAction.current=pending;setError('');setNotice('');setConfirmation(pending);
  }
  function cancelConfirmation(){if(busy.current)return;pendingAction.current=null;setConfirmation(null);}
  async function confirmAction(){
    const action=confirmation;
    if(!action||pendingAction.current!==action||owner.current!==action.session)return;
    const applied=await run(action.execute,action.message);
    if(applied&&pendingAction.current===action){pendingAction.current=null;setConfirmation(null);}
  }
  const entity=account=>`${account.full_name||account.username} (${account.email})`;
  async function invite(event){
    event.preventDefault();if(busy.current||invitePending)return;
    const values={...newUser,school_id:newUser.school_id.trim()};
    if(!values.school_id){setError('School ID is required.');return;}
    if(!inviteId.current)inviteId.current=crypto.randomUUID();
    const requestId=inviteId.current;
    ask({title:'Send account invitation?',entity:`${values.full_name} (${values.email})`,description:'Email an invitation to this user?',consequences:'The account will have the Student role.',confirmLabel:'Send invitation',variant:'primary',message:'Invitation sent.',execute:async()=>{
      try{await superService.invite({...values,request_id:requestId});if(owner.current===session){setNewUser(emptyUser());setCreateOpen(false);inviteId.current=null;setInvitePending(false);}}
      catch(error){if(owner.current===session)setInvitePending(true);throw error;}
    }});
  }
  async function update(event){
    event.preventDefault();if(!selected||!reason.trim()||busy.current)return;
    if(!draft.school_id.trim()){setError('School ID is required.');return;}
    const account=selected,payload={...draft,school_id:draft.school_id.trim(),reason:reason.trim()};
    const execute=async()=>{const value=await superService.update(account.id,payload);if(owner.current===session)setSelection({session,value:{...account,...value}});};
    if(payload.role===account.role){await run(execute,'Account information updated.');return;}
    const reducing=['student','admin','super_admin'].indexOf(payload.role)<['student','admin','super_admin'].indexOf(account.role);
    ask({title:reducing?'Reduce administrative access?':'Change account role?',entity:entity(account),description:'The proposed role change affects administrative permissions. Other edited account fields will be saved with it.',consequences:`${privileges[payload.role]} Existing API sessions will be revoked. A superadministrator can change the role again; backend authority protections still apply.`,currentRole:roleLabels[account.role],nextRole:roleLabels[payload.role],reason:payload.reason,confirmLabel:reducing?'Reduce access':'Change role',variant:reducing?'danger':'warning',execute,message:'Account information and role updated. Existing API sessions were revoked.'});
  }
  function status(){
    if(!selected||!reason.trim()||selected.id===currentUser.id)return;
    const account=selected,payload={is_active:!selected.is_active,reason:reason.trim()};
    ask({title:account.is_active?'Suspend account?':'Restore account?',entity:entity(account),description:account.is_active?'The account will lose application access and its API sessions will be revoked.':'The account will regain access after Supabase restoration succeeds.',consequences:account.is_active?'Content and audit history are retained. A superadministrator can restore access later.':'The existing role and student verification remain unchanged. Previous revoked sessions will not be reactivated.',reason:payload.reason,confirmLabel:account.is_active?'Suspend account':'Restore account',variant:account.is_active?'danger':'success',message:account.is_active?'Account deactivated and API sessions revoked.':'Account restored.',execute:async()=>{const value=await superService.status(account.id,payload);if(owner.current===session){setSelection({session,value:{...account,...value}});if(account.is_active)window.location.href='/super-admin?notice=account-deactivated';}}});
  }
  function verify(event){
    event.preventDefault();if(!selected||!notes.trim()||(!selected.is_verified&&!reviewed))return;
    const account=selected,payload={is_verified:!selected.is_verified,institutional_review_completed:reviewed,notes:notes.trim()};
    ask({title:account.is_verified?'Revoke student verification?':'Verify student?',entity:entity(account),description:account.is_verified?'The verified student indicator will be removed.':'Your institutional credential review will be recorded and the student will display as verified.',consequences:'Verification is a trust indicator and does not grant or remove permissions. A superadministrator can change it again; the review history is retained.',confirmLabel:account.is_verified?'Revoke verification':'Verify student',variant:account.is_verified?'warning':'success',message:'Student verification updated without changing permissions.',execute:async()=>{const value=await superService.verify(account.id,payload);if(owner.current===session){setSelection({session,value:{...account,...value}});setNotes('');setReviewed(false);}}});
  }
  function retry(action){ask({title:'Retry account synchronization?',entity:`Account action ${action.id}`,description:'Supabase Auth will be synchronized with the current saved account state, including its access restriction.',consequences:'This may apply a pending ban or restoration. Existing audit records are retained.',confirmLabel:'Retry synchronization',variant:'warning',execute:()=>superService.retry(action.id),message:'Account synchronization completed.'});}
  function recover(event,action){
    event.preventDefault();const payload={auth_user_id:recoverId,username:recoverName||null};
    ask({title:'Recover invitation profile?',entity:`Account action ${action.id}`,description:`Match the invitation to Supabase identity ${recoverId} and recover its application profile.`,consequences:'The backend verifies the invitation email. This does not resend the invitation or grant administrative privileges.',confirmLabel:'Recover invitation',variant:'primary',message:'Invitation profile recovered.',execute:async()=>{await superService.recover(action.id,payload);if(owner.current===session){setInvitePending(false);inviteId.current=null;}}});
  }
  return <><NotificationToasts notifications={notifications} onDismiss={dismiss}/><Navbar currentPage={pathname} onSettingsClick={()=>setSettingsOpen(true)}/><main className={`dashboard-main ${styles.page}`}><div className="container">
    <div className={styles.header}><div><h1>{accountId?(selected?.full_name||selected?.username||'Account Profile'):'User Management'}</h1><p>{accountId?'Manage account profile, access and student verification':'Manage accounts, administrative access and student verification'}</p></div>{accountId && <div className={styles.headerActions}><a className="btn btn--secondary" href="/super-admin">Back to user management</a><button type="button" className="btn btn--secondary" disabled={saving||loading} onClick={()=>open(accountId)}>Refresh</button></div>}</div>
    {isLoading?<p role="status">Checking access…</p>:!allowed?<div className="access-denied"><h2>Access Denied</h2><p>Superadministrator access is required.</p></div>:<>
      {!accountId && <>
      <section aria-label="Account administration"><h2>User and Administrator Management</h2><div className={styles.stats}>{Object.entries(labels).map(([key,label])=><div className="stat-card" key={key}><span className="stat-value">{counts?counts[key]:'—'}</span><span className="stat-label">{label}</span></div>)}</div>
        {error&&<p role="alert">{error}</p>}

        <h3>Manage accounts</h3><div className={styles.tabs}><button type="button" className="btn btn--secondary btn--sm" aria-pressed={!filters.role} onClick={()=>change('role','')}>All accounts</button><button type="button" className="btn btn--secondary btn--sm" aria-pressed={filters.role==='admin'} onClick={()=>change('role','admin')}>Administrators</button><button type="button" className="btn btn--secondary btn--sm" aria-pressed={filters.role==='super_admin'} onClick={()=>change('role','super_admin')}>Superadministrators</button></div><div className={`${styles.filters} ${styles.filterBar}`}><label>Search users<input aria-label="Search users" className="search-input" maxLength={200} value={search} onChange={event=>setSearch(event.target.value)} placeholder="Name, email or school ID"/></label><label>Role<select aria-label="Filter role" value={filters.role} onChange={event=>change('role',event.target.value)}><option value="">All roles</option><option value="student">Student</option><option value="admin">Administrator</option><option value="super_admin">Superadministrator</option></select></label><label>Student verification<select aria-label="Filter verification" value={filters.verified} onChange={event=>change('verified',event.target.value)}><option value="">All statuses</option><option value="true">Verified</option><option value="false">Unverified</option></select></label><label>Account status<select aria-label="Filter activity" value={filters.active} onChange={event=>change('active',event.target.value)}><option value="">All accounts</option><option value="true">Active</option><option value="false">Suspended</option></select></label><label>Sort<select aria-label="Sort accounts" value={filters.sort} onChange={event=>change('sort',event.target.value)}><option value="newest">Newest first</option><option value="name">Display name</option></select></label><div className={styles.filterActions}><button type="button" className="btn btn--primary btn--sm" disabled={saving} onClick={()=>{setError('');setCreateOpen(true);}}>Create User</button><button type="button" className="btn btn--secondary btn--sm" disabled={saving||loading} onClick={()=>{setRevision(value=>value+1);}}>Refresh</button><button type="button" className="btn btn--secondary btn--sm" onClick={()=>{setSearch('');setDebounced('');setFilters({role:'',verified:'',active:'',page:1,sort:'newest'});}}>Clear filters</button></div></div>
        {loading?<p role="status">Loading accounts…</p>:users?.items.length===0?<p>No matching accounts.</p>:<div className={styles.collection}>{users?.items.map(user=><article className={styles.record} key={user.id}><h3>{user.full_name||user.username} {user.is_verified&&<span aria-label="Verified student">✓</span>}</h3><p>{user.username} &#183; {roleLabels[user.role]} &#183; <span className={user.is_active?styles.positiveBadge:styles.warningBadge}>{user.is_active?'Active':'Suspended'}</span> &#183; <span className={styles.badge}>{user.is_verified?'Verified student':'Unverified student'}</span></p><a className="btn btn--secondary btn--sm" href={`/profile/${user.id}`}>Review Account</a></article>)}</div>}
        <div className={styles.pagination}><button type="button" className="btn btn--secondary btn--sm" disabled={loading||filters.page===1} onClick={()=>setFilters(value=>({...value,page:value.page-1}))}>Previous users</button><span>Page {filters.page} · {users?.total??'—'} users</span><button type="button" className="btn btn--secondary btn--sm" disabled={loading||!users?.has_more} onClick={()=>setFilters(value=>({...value,page:value.page+1}))}>Next users</button></div>
      </section>
      </>}
      {accountId && !selected && !error && <p role="status">Loading account profile...</p>}
      {accountId && error && <p role="alert">{error}</p>}
      {selected&&<section className="wellness-card" aria-label="Account review"><div className="card-body"><h2>Account Review</h2><p>{selected.email} · Registered {new Date(selected.created_at).toLocaleString()}</p><p>School ID: {selected.school_id||'Not supplied'} · Student verification: {selected.is_verified?'Verified':'Unverified'}</p>
        <dl className={styles.accountMetadata}>{Object.entries({'Account role':roleLabels[selected.role],'Account status':selected.is_active?'Active':'Suspended','Birthday':selected.birthday?.slice(0,10),'Gender':selected.gender,'Last login':selected.last_login?new Date(selected.last_login).toLocaleString():'Not recorded'}).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Not supplied'}</dd></div>)}</dl>
        <form aria-label="Account details" className={styles.removal} onSubmit={update}><fieldset className={styles.accountFields} disabled={saving}><label>Full name<input aria-label="Account full name" required maxLength={255} value={draft.full_name} onChange={event=>setDraft({...draft,full_name:event.target.value})}/></label><label>Display name<input aria-label="Account display name" required maxLength={50} value={draft.username} onChange={event=>setDraft({...draft,username:event.target.value})}/></label><label>School ID number<input required aria-label="Account school ID" maxLength={50} value={draft.school_id} onChange={event=>setDraft({...draft,school_id:event.target.value})}/></label><label>Role<select aria-label="Account role" value={draft.role} onChange={event=>setDraft({...draft,role:event.target.value})}><option value="student">Student</option><option value="admin">Administrator</option><option value="super_admin">Superadministrator</option></select></label><label>Reason for account change<textarea aria-label="Account change reason" required maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label><div className="voiceed-actions"><button type="submit" className="btn btn--primary" disabled={!reason.trim()}>Save account changes</button></div><div className="voiceed-actions voiceed-actions--separated"><button type="button" className={`btn ${selected.is_active?'btn--danger':'btn--success'}`} disabled={!reason.trim()||selected.id===currentUser.id} onClick={status}>{selected.is_active?'Deactivate account':'Restore account'}</button></div></fieldset></form>
        <form aria-label="Student verification" className={styles.removal} onSubmit={verify}><h3>Student Verification</h3><label>Verification notes<textarea aria-label="Verification notes" required maxLength={5000} disabled={saving} value={notes} onChange={event=>setNotes(event.target.value)}/></label>{!selected.is_verified&&<label className={styles.checkLabel}><input type="checkbox" checked={reviewed} disabled={saving} onChange={event=>setReviewed(event.target.checked)}/> Institutional review completed.</label>}<div className="voiceed-actions"><button type="submit" className={`btn ${selected.is_verified?'btn--warning':'btn--success'}`} disabled={saving||!notes.trim()||(!selected.is_verified&&!reviewed)}>{selected.is_verified?'Mark unverified':'Mark verified'}</button></div></form>
        {selected.verification_history?.map((entry,index)=><p key={index}>{entry.status} · {entry.reviewer} · {new Date(entry.created_at).toLocaleString()} — {entry.notes}</p>)}
        <a className="btn btn--secondary btn--sm" href={`/super-admin?actor=${selected.id}`}>Review account activity</a>
      </div></section>}
      {!accountId && <>
      <section aria-label="Administrator activity"><h2>Administrator Activity</h2><nav className={styles.tabs} aria-label="Administrator activity views"><a className="btn btn--secondary btn--sm" href={`/super-admin?activity=account${actor?`&actor=${actor}`:''}`} aria-current={activityMode==='account'?'page':undefined}>Account actions</a><a className="btn btn--secondary btn--sm" href={`/super-admin?activity=moderation${actor?`&actor=${actor}`:''}`} aria-current={activityMode==='moderation'?'page':undefined}>Content moderation actions</a>{actor&&<a className="btn btn--secondary btn--sm" href={`/super-admin?activity=${activityMode}`}>Show all administrators</a>}</nav>
        {events?.items.map(action=><article className={styles.activityRecord} key={action.id}><h3>{action.action||action.content_type} · {action.status||'removed'}</h3><p>{action.actor||action.administrator} · {new Date(action.created_at).toLocaleString()}</p>{action.reason&&<p>{action.reason}</p>}{action.payload&&<p>{JSON.stringify(action.payload)}</p>}
          {action.action!=='invite'&&action.status&&action.status!=='applied'&&<button type="button" className="btn btn--warning btn--sm" disabled={saving} onClick={()=>retry(action)}>Retry Auth synchronization</button>}
          {action.action==='invite'&&action.status!=='applied'&&<form aria-label="Recover invitation" onSubmit={event=>recover(event,action)}><label>Supabase user ID<input required value={recoverId} onChange={event=>setRecoverId(event.target.value)}/></label><label>Replacement display name (optional)<input maxLength={50} value={recoverName} onChange={event=>setRecoverName(event.target.value)}/></label><button type="submit" className="btn btn--primary" disabled={saving}>Recover invitation</button></form>}
        </article>)}<div className={styles.pagination}><button type="button" className="btn btn--secondary btn--sm" disabled={activityPage===1} onClick={()=>setActivityPage(value=>value-1)}>Previous actions</button><span>Page {activityPage}</span><button type="button" className="btn btn--secondary btn--sm" disabled={!events?.has_more} onClick={()=>setActivityPage(value=>value+1)}>Next actions</button></div>
      </section>
      </>}
    </>}
  </div></main>
    {allowed&&createOpen&&!confirmation&&<FormDialog open title="Create User" busy={saving} onClose={()=>{if(!busy.current)setCreateOpen(false);}}>
      <form aria-label="Create user" className={styles.removal} onSubmit={invite}>
        <fieldset className={styles.dialogFields} disabled={saving||invitePending}>
          <label>Email<input name="email" type="email" className="voiceed-control" required value={newUser.email} onChange={event=>setNewUser({...newUser,email:event.target.value})}/></label>
          <label>Display name<input name="username" className="voiceed-control" required maxLength={50} pattern={'[\\w.\\-]+'} value={newUser.username} onChange={event=>setNewUser({...newUser,username:event.target.value})}/></label>
          <label>Full name<input name="full_name" className="voiceed-control" required maxLength={255} value={newUser.full_name} onChange={event=>setNewUser({...newUser,full_name:event.target.value})}/></label>
          <label>School ID number<input name="school_id" className="voiceed-control" required maxLength={50} value={newUser.school_id} onChange={event=>setNewUser({...newUser,school_id:event.target.value})}/></label>
        </fieldset>
        {error&&<p role="alert">{error}</p>}{invitePending&&<p role="status">Check the invitation in account activity before retrying.</p>}
        <div className="voiceed-actions"><button type="button" className="btn btn--secondary" disabled={saving} onClick={()=>setCreateOpen(false)}>Cancel</button><button type="submit" className="btn btn--primary" disabled={saving||invitePending}>Create User</button></div>
      </form>
    </FormDialog>}
    {allowed&&confirmation?.session===session&&<ConfirmationDialog open title={confirmation.title} description={confirmation.description} entity={confirmation.entity} consequences={confirmation.consequences} confirmLabel={confirmation.confirmLabel} variant={confirmation.variant} busy={saving} error={error} onCancel={cancelConfirmation} onConfirm={confirmAction}>
      {confirmation.currentRole&&<p><strong>Current role:</strong> {confirmation.currentRole}<br/><strong>Proposed role:</strong> {confirmation.nextRole}</p>}
      {confirmation.reason&&<p><strong>Reason:</strong> {confirmation.reason}</p>}
    </ConfirmationDialog>}
    <Footer/></>;
}
