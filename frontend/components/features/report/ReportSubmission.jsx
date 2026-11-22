 'use client';
import { useBlockingLoading } from '@/components/shared/GlobalLoading';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuthContext } from '@/context/AuthContext';
import { accountRequest } from '@/services/account';
import { submitReportAuthenticated, submitReportAnonymous, submitReportGuest } from '@/services/reports';
import { REPORT_CATEGORIES, REPORT_STEPS, reporterFromProfile, emptyReporter, localIncidentTime, reporterError, detailsError, evidenceError, reportPayload, submissionKey } from '@/lib/reportSubmission';
import styles from './ReportSubmission.module.css';

export function ReportSubmission() {
  const { currentUser, isLoading }=useAuthContext();
  const [step,setStep]=useState(1);
  const [furthest,setFurthest]=useState(1);
  const [anonymous,setAnonymous]=useState(false);
  const [reporter,setReporter]=useState(()=>reporterFromProfile(currentUser));
  const [contactEmail,setContactEmail]=useState('');
  const [details,setDetails]=useState({title:'',category:'',incident_date:'',location:'',description:''});
  const [files,setFiles]=useState([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  useBlockingLoading(busy);
  const [receipt,setReceipt]=useState(null);
  const [copyMessage,setCopyMessage]=useState('');
  const submitting=useRef(false);
  const identityEdited=useRef(false);
  const anonymousRef=useRef(false);
  const heading=useRef(null);
  useEffect(()=>{
    let active=true;
    if(!currentUser?.id)return;
    accountRequest('/auth/me').then(profile=>{if(active&&!anonymousRef.current&&!identityEdited.current)setReporter(reporterFromProfile(profile));}).catch(()=>{if(active)setError('Unable to refresh your profile. Check the displayed information before continuing.');});
    return()=>{active=false;};
  },[currentUser?.id]);
  useEffect(()=>{heading.current?.focus();},[step]);
  const identityError=()=>reporterError(reporter,anonymous,contactEmail);
  const move=target=>{
    if(busy||receipt||target===4||target>furthest+1)return;
    const invalid=target>1 ? identityError()||(target>2?detailsError(details):'') : '';
    if(invalid){setError(invalid);return;}
    if(target===2&&!details.incident_date)setDetails(previous=>({...previous,incident_date:localIncidentTime()}));
    setError('');setStep(target);setFurthest(previous=>Math.max(previous,target));
  };
  const toggleAnonymous=checked=>{
    anonymousRef.current=checked;setAnonymous(checked);identityEdited.current=false;
    setReporter(checked?emptyReporter():reporterFromProfile(currentUser));setContactEmail('');setError('');
  };
  const selectFiles=event=>{
    const selected=Array.from(event.target.files||[]);
    const invalid=selected.map(evidenceError).find(Boolean);
    if(invalid)setError(invalid);
    else {setFiles(previous=>[...previous,...selected.filter(file=>!previous.some(old=>old.name===file.name&&old.size===file.size&&old.lastModified===file.lastModified))]);setError('');}
    event.target.value='';
  };
  const submit=async()=>{
    if(submitting.current||receipt)return;
    const invalid=identityError()||detailsError(details)||files.map(evidenceError).find(Boolean);
    if(invalid){setError(invalid);return;}
    submitting.current=true;setBusy(true);setError('');
    try{
      const payload=reportPayload(reporter,details,anonymous,contactEmail);
      const key=await submissionKey(payload,files,anonymous?'anonymous':currentUser?.id||'guest');
      const send=anonymous?submitReportAnonymous:currentUser?submitReportAuthenticated:submitReportGuest;
      const result=await send(payload,files,key);
      // A successful API response with a saved code is authoritative even when an
      // older backend omits the newer notification/private-link receipt fields.
      if(result?.success===false||!/^VED-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(result?.tracking_code))throw new Error('The server response did not include a saved tracking ID. Keep your entries unchanged and retry to retrieve the same submission.');
      setReceipt(result);setStep(4);setFurthest(4);
    }catch(err){setError(err.message||'Unable to submit. Your entries have been kept; you can retry.');}
    finally{submitting.current=false;setBusy(false);}
  };
  const hasPrivateLink=typeof receipt?.tracking_access_token==='string'&&Boolean(receipt.tracking_access_token.trim());
  const privatePath=receipt?`/track/${receipt.tracking_code}${hasPrivateLink?`#access=${encodeURIComponent(receipt.tracking_access_token)}`:''}`:'';
  const copy=async privateLink=>{
    try{await navigator.clipboard.writeText(privateLink?`${window.location.origin}${privatePath}`:receipt.tracking_code);setCopyMessage(privateLink?'Private tracking link copied.':'Tracking ID copied.');}
    catch{setCopyMessage('Copy failed. Select and save the tracking ID or private link manually.');}
  };
  const category=REPORT_CATEGORIES.find(([value])=>value===details.category)?.[1];
  return <section className={styles.wizard} aria-labelledby="report-submit-title">
    <div className="wellness-card">
      <div className="card-header"><div className="card-icon"><i className="fas fa-shield-alt" /></div><h3 id="report-submit-title">Submit a Report</h3></div>
      <div className={`card-body ${styles.body}`}>
        <h4 ref={heading} tabIndex={-1} className={styles.stepTitle}>Step {step}: {REPORT_STEPS[step-1]}</h4>
        {error&&<p className="error-message" role="alert">{error}</p>}
        <div className={styles.step} key={step}>
          {step===1&&<>
            <label className={styles.anonymous}><input type="checkbox" checked={anonymous} onChange={event=>toggleAnonymous(event.target.checked)} /> Submit Anonymously</label>
            {anonymous?<><p>Your report will not be linked to your account. Evidence, infrastructure logs and information you disclose can still contain identifying details.</p><div className="form-group"><label htmlFor="anonymous-contact">Contact email (optional)</label><input id="anonymous-contact" type="email" value={contactEmail} onChange={event=>setContactEmail(event.target.value)} maxLength={255} /><small>Providing an email creates a potential identifying link and offers less anonymity than reporting without contact information.</small></div></>:<>
              <p>{currentUser?'Your account information is prefilled. Corrections apply only to this report.':'You can submit a named report without an account. Complete the information below.'}</p>
              <div className={styles.fields}>{[['full_name','Full Name'],['display_name','Display Name'],['birthday','Birthday'],['school_id','School ID Number'],['email','Email Address']].map(([field,label])=><div className="form-group" key={field}><label htmlFor={`report-${field}`}>{label}</label><input id={`report-${field}`} type={field==='birthday'?'date':field==='email'?'email':'text'} required maxLength={['display_name','school_id'].includes(field)?50:255} max={field==='birthday'?localIncidentTime().slice(0,10):undefined} value={reporter[field]} onChange={event=>{identityEdited.current=true;setReporter({...reporter,[field]:event.target.value});}} /></div>)}</div>
            </>}
          </>}
          {step===2&&<>
            <div className="form-group"><label htmlFor="complaintTitle">Complaint title</label><input id="complaintTitle" required maxLength={200} value={details.title} onChange={event=>setDetails({...details,title:event.target.value})} placeholder="Give your complaint a short, descriptive title" /></div>
            <div className={styles.fields}>
              <div className="form-group"><label htmlFor="incidentCategory">Incident Category</label><select id="incidentCategory" required value={details.category} onChange={event=>setDetails({...details,category:event.target.value})}><option value="">Select a category</option>{REPORT_CATEGORIES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
              <div className="form-group"><label htmlFor="incidentDate">Date &amp; Time of Incident</label><input id="incidentDate" type="datetime-local" required value={details.incident_date} onChange={event=>setDetails({...details,incident_date:event.target.value})} /></div>
            </div>
            <div className="form-group"><label htmlFor="incidentLocation">Location</label><input id="incidentLocation" maxLength={255} value={details.location} onChange={event=>setDetails({...details,location:event.target.value})} /></div>
            <div className="form-group"><label htmlFor="incidentDescription">Description</label><textarea id="incidentDescription" rows={5} required maxLength={50000} value={details.description} onChange={event=>setDetails({...details,description:event.target.value})} /></div>
            <div className="form-group"><label htmlFor="evidenceUpload">Evidence (optional)</label><input id="evidenceUpload" type="file" multiple accept=".png,.jpg,.jpeg,.pdf" onChange={selectFiles} /><small>PNG, JPG, JPEG or PDF, up to 25 MB per file. Avoid evidence that identifies you if anonymity matters.</small></div>
            <ul className={styles.files}>{files.map((file,index)=><li key={`${file.name}:${index}`}><span>{file.name} ({(file.size/1024/1024).toFixed(2)} MB)</span><button type="button" className={styles.textButton} onClick={()=>setFiles(previous=>previous.filter((_,i)=>i!==index))} aria-label={`Remove ${file.name}`}>Remove</button></li>)}</ul>
          </>}
          {step===3&&<div className={styles.review}>
            <h5>Reporter Information</h5>
            {anonymous?<p>Submitted Anonymously{contactEmail?`; Optional contact: ${contactEmail}`:''}</p>:<dl>{[['full_name','Full Name'],['display_name','Display Name'],['birthday','Birthday'],['school_id','School ID Number'],['email','Email Address']].map(([key,label])=><div key={key}><dt>{label}</dt><dd>{reporter[key]}</dd></div>)}</dl>}
            <h5>Incident Information</h5><dl><div><dt>Complaint title</dt><dd>{details.title}</dd></div><div><dt>Incident Category</dt><dd>{category}</dd></div><div><dt>Date &amp; Time</dt><dd>{new Date(details.incident_date).toLocaleString()}</dd></div><div><dt>Location</dt><dd>{details.location||'Not provided'}</dd></div><div><dt>Description</dt><dd className={styles.description}>{details.description}</dd></div><div><dt>Evidence</dt><dd>{files.length?files.map(file=>file.name).join(', '):'No attachments'}</dd></div></dl>
            <p>Review your entries before submitting. Your report has not been submitted yet.</p>
          </div>}
          {step===4&&receipt&&<div className={styles.success}>
            <h5>Report Submitted Successfully</h5><p>Your report has been received. Keep your tracking ID to monitor its progress.</p>
            <code className={styles.code}>{receipt.tracking_code}</code>{receipt.created_at&&!Number.isNaN(new Date(receipt.created_at).getTime())&&<p>Submitted {new Date(receipt.created_at).toLocaleString()}</p>}
            {receipt.email_notification==='accepted'?<p>The tracking email was accepted for sending. Delivery has not been confirmed.</p>:receipt.email_notification==='not_requested'?<p>No email was provided. Copy and securely save your tracking ID and any private tracking link before leaving.</p>:<p role="status">Your report was submitted successfully, but we couldn't confirm the tracking email. Please copy and save your tracking ID and any available private link.</p>}
            {hasPrivateLink?<p>The code alone shows limited status. Your private tracking link unlocks detailed updates and any shared evidence; keep it private.</p>:<p role="status">The server returned your saved tracking ID but no private tracking link. Save this ID; do not submit another report. Detailed tracking may require your account or assistance from support.</p>}
            <div className={styles.successActions}><button type="button" className="submit-btn" onClick={()=>copy(false)}>Copy Tracking ID</button>{hasPrivateLink&&<button type="button" className="submit-btn" onClick={()=>copy(true)}>Copy Private Tracking Link</button>}<Link className="submit-btn" href={privatePath}>Go to Report Tracking</Link><Link className={styles.secondary} href={currentUser?'/dashboard':'/services'}>Return to {currentUser?'Dashboard':'Services'}</Link></div>
            {copyMessage&&<p role="status">{copyMessage}</p>}
          </div>}
        </div>
        {step<4&&<div className={styles.actions}>
          {step>1&&<button type="button" className={styles.secondary} disabled={busy} onClick={()=>move(step-1)}>Back</button>}
          {step<3?<button type="button" className="submit-btn" disabled={busy||isLoading||Boolean(step===1?identityError():detailsError(details))} onClick={()=>move(step+1)}>Next</button>:<button type="button" className="submit-btn" disabled={busy} onClick={submit}>{busy?'Submitting...':'Submit Report'}</button>}
        </div>}
      </div>
    </div>
    <ol className={styles.progress} aria-label="Report submission progress">{REPORT_STEPS.map((label,index)=><li key={label}><button type="button" aria-current={step===index+1?'step':undefined} className={`${styles.indicator} ${index+1<step?styles.completed:''}`} disabled={busy||Boolean(receipt)||index+1>furthest||index===3} onClick={()=>move(index+1)}><span>{index+1<step?'\u2713':index+1}</span><small>{label}</small></button></li>)}</ol>
  </section>;
}
