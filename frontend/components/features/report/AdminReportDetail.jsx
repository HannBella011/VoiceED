// AdminReportDetail - VoiceED
// Admin report detail view with status management

'use client';

import { useEffect, useRef, useState } from 'react';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import NotificationToasts from '@/components/shared/NotificationToasts';
import { useNotifications } from '@/hooks/useNotifications';
import styles from '@/app/admin/admin.module.css';
import { ReportTimeline } from './ReportTimeline';
import { STATUS_COLORS, CATEGORY_LABELS } from './ReportCard';

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  awaiting_additional_info: 'Awaiting Additional Info',
  resolved: 'Resolved',
  closed: 'Closed',
};

export function AdminReportDetail({
  report,
  currentUser,
  onStatusUpdate,
  onAssign,
  onReject,
  availableAssignees = [],
  isLoading = false,
}) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [assignmentRemarks, setAssignmentRemarks] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(report.status);
  const [remarks, setRemarks] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [remarksError, setRemarksError] = useState('');
  const [responsibilityConfirmed, setResponsibilityConfirmed] = useState(false);
  const [reporterOpen, setReporterOpen] = useState(false);
  const [attachmentIndex, setAttachmentIndex] = useState(null);

  const { notifications, show: notify, hide: dismissNotification } = useNotifications();
  const [processing, setProcessing] = useState(false);
  const pending = useRef(false);
  const context = `${report.id}:${currentUser?.id}:${currentUser?.role}`;
  const currentContext = useRef(context);
  currentContext.current = context;
  const allowed = ['admin', 'super_admin'].includes(currentUser?.role);
  const superAdmin = currentUser?.role === 'super_admin';
  const eligibleAssignees = availableAssignees.filter(
    (user) => user.is_active !== false && ['admin', 'super_admin'].includes(user.role)
  );
  const canUpdate =
    allowed &&
    Boolean(report.assignee_id) &&
    String(report.assignee_id) === String(currentUser?.id);
  const actionable = !['resolved', 'closed'].includes(report.status);
  const busy = isLoading || processing;
  useEffect(() => {
    setShowStatusModal(false);
    setShowAssignModal(false);
    setShowRejectModal(false);
    setRejectionReason('');
    setAssignmentRemarks('');
    setRemarks('');
    setSelectedAssignee('');
    setRemarksError('');
    setResponsibilityConfirmed(false);
    setReporterOpen(false);
    setAttachmentIndex(null);
  }, [context]);
  const closeDialogs = () => {
    if (pending.current) return;
    setShowStatusModal(false);
    setShowAssignModal(false);
    setShowRejectModal(false);
  };
  const handleStatusChange = async () => {
    if (
      !canUpdate ||
      busy ||
      pending.current ||
      currentContext.current !== context ||
      !responsibilityConfirmed
    )
      return;
    if (remarks.split(/\s+/).filter(Boolean).length > 250) {
      setRemarksError('Remarks cannot exceed 250 words');
      return;
    }
    if (selectedStatus === report.status && !remarks.trim()) return;
    pending.current = true;
    setProcessing(true);
    setRemarksError('');
    try {
      await onStatusUpdate(report.id, selectedStatus, remarks.trim() || undefined);
      if (currentContext.current !== context) return;
      setShowStatusModal(false);
      setRemarks('');
      notify(`Report updated to ${STATUS_LABELS[selectedStatus]}.`);
    } catch (error) {
      if (currentContext.current === context) {
        setRemarksError(error.message || 'Report update failed.');
        notify(error.message || 'Report update failed.', 'error');
      }
    } finally {
      pending.current = false;
      setProcessing(false);
    }
  };
  const handleAssign = async () => {
    if (
      !superAdmin ||
      !actionable ||
      busy ||
      pending.current ||
      currentContext.current !== context ||
      !selectedAssignee
    )
      return;
    pending.current = true;
    setProcessing(true);
    setRemarksError('');
    try {
      await onAssign(
        report.id,
        selectedAssignee,
        assignmentRemarks.trim() || undefined
      );
      if (currentContext.current !== context) return;
      setShowAssignModal(false);
      setSelectedAssignee('');
      notify('Report assignment updated.');
    } catch (error) {
      if (currentContext.current === context) {
        setRemarksError(error.message || 'Report assignment failed.');
        notify(error.message || 'Report assignment failed.', 'error');
      }
    } finally {
      pending.current = false;
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (
      !superAdmin ||
      !actionable ||
      busy ||
      pending.current ||
      currentContext.current !== context ||
      !responsibilityConfirmed ||
      !rejectionReason.trim()
    )
      return;
    pending.current = true;
    setProcessing(true);
    setRemarksError('');
    try {
      await onReject(report.id, {
        reason: rejectionReason.trim(),
        responsibility_confirmed: responsibilityConfirmed,
      });
      if (currentContext.current !== context) return;
      setShowRejectModal(false);
      notify('Report rejected and closed.');
    } catch (error) {
      if (currentContext.current === context) {
        setRemarksError(error.message);
        notify(error.message || 'Rejection failed.', 'error');
      }
    } finally {
      pending.current = false;
      setProcessing(false);
    }
  };

  const getNextStatuses = (currentStatus) => {
    const allowed = {
      submitted: ['under_review'],
      under_review: ['awaiting_additional_info', 'closed'],
      assigned: ['in_progress', 'awaiting_additional_info'],
      in_progress: ['resolved', 'awaiting_additional_info'],
      awaiting_additional_info: [
        'under_review',
        ...(report.assignee_id ? ['in_progress'] : []),
      ],
      resolved: ['closed'],
      closed: [],
    };
    return [currentStatus, ...(allowed[currentStatus] || [])];
  };

  const nextStatuses = getNextStatuses(report.status);
  const attachments = report.attachments || [];
  const preview = attachmentIndex === null ? null : attachments[attachmentIndex];
  const reporter = report.is_anonymous ? null : report.reporter_details;
  const reportTitle = report.title?.trim() || `Report #${report.id}`;
  const categoryLabel = CATEGORY_LABELS[report.category] || report.category;
  const movePreview = (direction) =>
    setAttachmentIndex(
      (index) => (index + direction + attachments.length) % attachments.length
    );
  const copyTracking = async () => {
    try {
      await navigator.clipboard.writeText(report.tracking_code);
      notify('Tracking ID copied.');
    } catch {
      notify('Unable to copy the tracking ID. Select and copy it manually.', 'error');
    }
  };

  return (
    <div className={`admin-report-detail ${styles.reportDetail}`}>
      <NotificationToasts
        notifications={notifications}
        onDismiss={dismissNotification}
      />
      {remarksError && <p role="alert">{remarksError}</p>}
      <header className={styles.reportHeader}>
        <div className={styles.reportTopRow}>
          <span
            className="admin-status-badge"
            style={{
              '--report-status-color': STATUS_COLORS[report.status] || '#7f8c8d',
            }}
          >
            {STATUS_LABELS[report.status]}
          </span>
          {superAdmin && (
            <div className={styles.reportAdminActions}>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                disabled={busy || !actionable || !eligibleAssignees.length}
                onClick={() => {
                  setSelectedAssignee('');
                  setAssignmentRemarks('');
                  setRemarksError('');
                  setShowAssignModal(true);
                }}
              >
                Assign
              </button>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                disabled={busy || !actionable}
                onClick={() => {
                  setRejectionReason('');
                  setResponsibilityConfirmed(false);
                  setRemarksError('');
                  setShowRejectModal(true);
                }}
              >
                Reject
              </button>
            </div>
          )}
        </div>
        <h1>{reportTitle}</h1>
        <div className={styles.reportMetadataRow}>
          <dl className={styles.reportMetadata}>
            <div>
              <dt>Report ID</dt>
              <dd>
                <button
                  type="button"
                  className={styles.copyTracking}
                  onClick={copyTracking}
                  aria-label="Copy tracking ID"
                >
                  {report.tracking_code || report.id}
                  <i className="far fa-copy" aria-hidden="true" />
                </button>
              </dd>
            </div>
            <div>
              <dt>Report Type</dt>
              <dd>{categoryLabel}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>
                <time dateTime={report.created_at}>
                  {new Date(report.created_at).toLocaleString()}
                </time>
              </dd>
            </div>
          </dl>
          <div className={styles.reportUserActions}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setReporterOpen(true)}
            >
              User Info
            </button>
            {canUpdate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={busy}
                onClick={() => {
                  setSelectedStatus(report.status);
                  setResponsibilityConfirmed(false);
                  setRemarksError('');
                  setShowStatusModal(true);
                }}
              >
                Change Status
              </button>
            )}
          </div>
        </div>
        {report.assignee_id && (
          <p className={styles.assignmentText}>
            Assigned to {report.assignee_name || 'an administrator'}
          </p>
        )}
        {report.is_anonymous && (
          <p className={styles.assignmentText}>Sent anonymously</p>
        )}
      </header>

      {/* Description */}
      <div className="admin-report-section">
        <h3>Description</h3>
        <div className={styles.incidentMeta}>
          <span>
            <i className="fas fa-map-marker-alt" aria-hidden="true" />{' '}
            {report.location || 'Location not specified'}
          </span>
          <span>
            <i className="far fa-calendar-alt" aria-hidden="true" />{' '}
            {report.incident_date
              ? new Date(report.incident_date).toLocaleString()
              : 'Incident date not specified'}
          </span>
        </div>
        <div className="report-description">{report.description}</div>

        {/* Attachments */}
        {report.attachments && report.attachments.length > 0 && (
          <div className={styles.evidenceSection}>
            <h3>Evidence Attachments</h3>
            <div className="attachments-grid">
              {attachments.map((att, index) => (
                <button
                  key={att.id}
                  type="button"
                  onClick={() => setAttachmentIndex(index)}
                  aria-label={`Preview ${att.filename}`}
                  className="attachment-card"
                >
                  <div className="attachment-preview">
                    {att.mime_type?.startsWith('image/') ? (
                      <img src={att.url} alt={att.filename} />
                    ) : (
                      <i className="fas fa-file-pdf"></i>
                    )}
                  </div>
                  <div className="attachment-info">
                    <span className="attachment-name">{att.filename}</span>
                    <span className="attachment-size">
                      {(att.file_size / 1024).toFixed(1)} KB • {att.mime_type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Timeline */}
      <div className="admin-report-section">
        <div className="section-header">
          <h3>Timeline</h3>
          {report.timeline && report.timeline.length > 0 && (
            <span className="timeline-count">{report.timeline.length} updates</span>
          )}
        </div>
        <ReportTimeline
          timeline={report.timeline || []}
          currentStatus={report.status}
          isAdmin={true}
        />
      </div>

      {allowed && reporterOpen && (
        <ConfirmationDialog
          open
          title="Reporter information"
          hideActions
          dialogRole="dialog"
          onCancel={() => setReporterOpen(false)}
        >
          {report.is_anonymous ? (
            <p>
              This report was submitted anonymously. No linked profile is available.
            </p>
          ) : (
            <dl className={styles.reporterFields}>
              {Object.entries({
                'Full name': reporter?.full_name,
                'Display name': reporter?.display_name,
                Email: reporter?.email || report.reporter_email,
                'School ID': reporter?.school_id,
                Birthday: reporter?.birthday,
                'User ID': report.user_id,
              }).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || 'Not provided'}</dd>
                </div>
              ))}
            </dl>
          )}
          {report.is_anonymous && report.reporter_email && (
            <p>Optional contact: {report.reporter_email}</p>
          )}
          <div className="voiceed-actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setReporterOpen(false)}
            >
              Close
            </button>
            {!report.is_anonymous && report.user_id && (
              <a
                className="btn btn--primary"
                href={`/admin/reports/${report.id}/reporter`}
              >
                View user profile
              </a>
            )}
          </div>
        </ConfirmationDialog>
      )}
      {allowed && preview && (
        <ConfirmationDialog
          open
          title="Attachment preview"
          className={styles.previewDialog}
          hideActions
          dialogRole="dialog"
          onCancel={() => setAttachmentIndex(null)}
          onKeyDown={(event) => {
            if (
              attachments.length > 1 &&
              ['ArrowLeft', 'ArrowRight'].includes(event.key) &&
              !['VIDEO', 'AUDIO', 'IFRAME'].includes(event.target.tagName)
            ) {
              event.preventDefault();
              movePreview(event.key === 'ArrowLeft' ? -1 : 1);
            }
          }}
        >
          <div className={styles.previewToolbar}>
            <p>{preview.filename}</p>
            <span>
              {attachmentIndex + 1} / {attachments.length}
            </span>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setAttachmentIndex(null)}
            >
              Close
            </button>
          </div>
          <div className={styles.previewContent}>
            {preview.mime_type?.startsWith('image/') ? (
              <img src={preview.url} alt={preview.filename} />
            ) : preview.mime_type === 'application/pdf' ? (
              <iframe
                src={preview.url}
                title={preview.filename}
                referrerPolicy="no-referrer"
              />
            ) : preview.mime_type?.startsWith('video/') ? (
              <video src={preview.url} controls />
            ) : preview.mime_type?.startsWith('audio/') ? (
              <audio src={preview.url} controls />
            ) : (
              <p>
                A preview is not available for this file. Open it using the link below.
              </p>
            )}
          </div>
          <div className={styles.previewToolbar}>
            {attachments.length > 1 && (
              <>
                <button
                  type="button"
                  className="btn btn--secondary"
                  aria-label="Previous attachment"
                  onClick={() => movePreview(-1)}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  aria-label="Next attachment"
                  onClick={() => movePreview(1)}
                >
                  Next →
                </button>
              </>
            )}
            <a
              className="btn btn--secondary"
              href={preview.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open original
            </a>
          </div>
        </ConfirmationDialog>
      )}

      {canUpdate && showStatusModal && (
        <ConfirmationDialog
          open
          title="Update"
          titleClassName={styles.updateTitle}
          subtitle={
            <div className={styles.updateIdentity}>
              <button
                type="button"
                className={styles.copyTracking}
                onClick={copyTracking}
                aria-label="Copy tracking ID"
              >
                {report.tracking_code}
                <i className="far fa-copy" aria-hidden="true" />
              </button>
            </div>
          }
          consequences={
            ['resolved', 'closed'].includes(selectedStatus)
              ? 'The current workflow does not offer reopening from this state. The report and its timeline are retained.'
              : undefined
          }
          confirmLabel={
            selectedStatus === 'resolved'
              ? 'Resolve report'
              : selectedStatus === 'closed'
                ? 'Close report'
                : 'Update Status'
          }
          variant={
            selectedStatus === 'resolved'
              ? 'success'
              : selectedStatus === 'closed'
                ? 'warning'
                : 'primary'
          }
          busy={busy}
          confirmDisabled={
            !responsibilityConfirmed ||
            (selectedStatus === report.status && !remarks.trim()) ||
            remarks.split(/\s+/).filter(Boolean).length > 250
          }
          error={remarksError}
          onCancel={closeDialogs}
          onConfirm={handleStatusChange}
        >
          <fieldset disabled={busy} className={styles.dialogFields}>
            <label htmlFor="statusSelect">
              New status
              <select
                id="statusSelect"
                className="voiceed-control"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
              >
                {nextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="remarksInput">
              Administrator remarks (optional, max 250 words)
              <textarea
                id="remarksInput"
                className="voiceed-control"
                rows={4}
                maxLength={50000}
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
              />
            </label>
            <small>{remarks.split(/\s+/).filter(Boolean).length} / 250 words</small>
            <label className={styles.responsibility}>
              <input
                type="checkbox"
                checked={responsibilityConfirmed}
                onChange={(event) => setResponsibilityConfirmed(event.target.checked)}
              />
              I confirm that I have reviewed this report and take responsibility for
              this update.
            </label>
          </fieldset>
        </ConfirmationDialog>
      )}
      {superAdmin && showRejectModal && (
        <ConfirmationDialog
          open
          title="Reject report"
          entity={`${report.title?.trim() || `Report #${report.id}`} (${report.tracking_code})`}
          description="Rejecting closes this report. It cannot be reopened through the current workflow. The report, assignment, rejection reason, and responsible superadministrator remain in its timeline."
          confirmLabel="Confirm Rejection"
          variant="danger"
          busy={busy}
          confirmDisabled={
            !rejectionReason.trim() ||
            rejectionReason.trim().split(/\s+/).length > 240 ||
            !responsibilityConfirmed
          }
          error={remarksError}
          onCancel={closeDialogs}
          onConfirm={handleReject}
        >
          <fieldset disabled={busy} className={styles.dialogFields}>
            <label htmlFor="rejectionReason">
              Reason for rejection (required, up to 240 words)
              <textarea
                id="rejectionReason"
                className="voiceed-control"
                required
                maxLength={5000}
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
              />
            </label>
            <label className={styles.responsibility}>
              <input
                type="checkbox"
                checked={responsibilityConfirmed}
                onChange={(event) => setResponsibilityConfirmed(event.target.checked)}
              />
              I confirm that I have reviewed this report and take responsibility for
              this update.
            </label>
          </fieldset>
        </ConfirmationDialog>
      )}
      {superAdmin && showAssignModal && (
        <ConfirmationDialog
          open
          title="Confirm report assignment"
          description="The selected administrator will be responsible for reviewing this report."
          entity={`${reportTitle} (${report.tracking_code})`}
          consequences="New assignments enter the Assigned stage. Reassigning ongoing work preserves its current stage and records the change in the timeline."
          confirmLabel="Confirm Assignment"
          variant="primary"
          busy={busy}
          confirmDisabled={
            !selectedAssignee ||
            selectedAssignee === report.assignee_id ||
            assignmentRemarks.trim().split(/\s+/).length > 200
          }
          error={remarksError}
          onCancel={closeDialogs}
          onConfirm={handleAssign}
        >
          <p>
            <strong>Current assignee:</strong> {report.assignee_name || 'Unassigned'}
            <br />
            <strong>Proposed assignee:</strong>{' '}
            {eligibleAssignees.find((user) => String(user.id) === selectedAssignee)
              ?.full_name ||
              eligibleAssignees.find((user) => String(user.id) === selectedAssignee)
                ?.username ||
              'Select an administrator'}
          </p>
          <fieldset disabled={busy} className={styles.dialogFields}>
            <label htmlFor="assigneeSelect">
              Assign to
              <select
                id="assigneeSelect"
                className="voiceed-control"
                value={selectedAssignee}
                onChange={(event) => setSelectedAssignee(event.target.value)}
              >
                <option value="">Select an administrator...</option>
                {eligibleAssignees.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.username} ({user.role})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assignment remarks (optional, up to 200 words)
              <textarea
                className="voiceed-control"
                value={assignmentRemarks}
                maxLength={2000}
                onChange={(event) => setAssignmentRemarks(event.target.value)}
              />
            </label>
          </fieldset>
        </ConfirmationDialog>
      )}
    </div>
  );
}

export default AdminReportDetail;
