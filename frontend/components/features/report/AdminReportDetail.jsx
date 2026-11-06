// AdminReportDetail - VoiceED
// Admin report detail view with status management

'use client';

import { useState } from 'react';
import { ReportTimeline } from './ReportTimeline';
import { ReportCard, STATUS_COLORS, CATEGORY_LABELS } from './ReportCard';

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  awaiting_additional_info: 'Awaiting Additional Info',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_ORDER = [
  'submitted',
  'under_review',
  'assigned',
  'in_progress',
  'awaiting_additional_info',
  'resolved',
  'closed',
];

export function AdminReportDetail({ 
  report, 
  currentUser, 
  onStatusUpdate, 
  onAssign, 
  availableAssignees,
  isLoading = false 
}) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(report.status);
  const [remarks, setRemarks] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [remarksError, setRemarksError] = useState('');

  const handleStatusChange = async () => {
    if (remarks.split(/\s+/).filter(Boolean).length > 250) {
      setRemarksError('Remarks cannot exceed 250 words');
      return;
    }
    
    setRemarksError('');
    try {
      await onStatusUpdate(report.id, selectedStatus, remarks || undefined);
      setShowStatusModal(false);
      setRemarks('');
    } catch (error) {
      setRemarksError(error.message);
    }
  };

  const handleAssign = async () => {
    if (!selectedAssignee) return;
    try {
      await onAssign(report.id, selectedAssignee);
      setShowAssignModal(false);
      setSelectedAssignee('');
    } catch (error) {
      setRemarksError(error.message);
    }
  };

  const getNextStatuses = (currentStatus) => {
    const allowed = { submitted: ['under_review'], under_review: ['awaiting_additional_info','closed'], assigned: ['in_progress','awaiting_additional_info'], in_progress: ['resolved','awaiting_additional_info'], awaiting_additional_info: ['under_review', ...(report.assignee_id ? ['in_progress'] : [])], resolved: ['closed'], closed: [] };
    return [currentStatus, ...(allowed[currentStatus] || [])];
  };

  const nextStatuses = getNextStatuses(report.status);

  return (
    <div className="admin-report-detail">
      {remarksError && <p role="alert">{remarksError}</p>}
      {/* Report Header */}
      <div className="admin-report-header">
        <div className="admin-report-title-section">
          <h1>{report.title}</h1>
          <div className="admin-report-meta">
            <span className="tracking-code">Tracking: <code>{report.tracking_code}</code></span>
            <span className="divider">•</span>
            <span className="report-id">ID: #{report.id}</span>
            <span className="divider">•</span>
            <time dateTime={report.created_at}>
              Submitted {new Date(report.created_at).toLocaleString()}
            </time>
          </div>
        </div>

        <div className="admin-report-status-section">
          <span 
            className="admin-status-badge"
            style={{ backgroundColor: STATUS_COLORS[report.status] || '#7f8c8d' }}
          >
            {STATUS_LABELS[report.status]}
          </span>
          
          <div className="admin-report-actions">
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => setShowStatusModal(true)}
              disabled={isLoading}
            >
              <i className="fas fa-edit"></i> Change Status
            </button>
            
            {report.assignee_id ? (
              <span className="assignee-badge">
                <i className="fas fa-user-tag"></i>
                Assigned to {report.assignee_name || `User #${report.assignee_id}`}
              </span>
            ) : (
              <button
                className="btn btn--primary btn--sm"
                onClick={() => setShowAssignModal(true)}
                disabled={isLoading || availableAssignees.length === 0}
              >
                <i className="fas fa-user-plus"></i> Assign
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report Info Grid */}
      <div className="admin-report-info-grid">
        <div className="info-card">
          <h4>Category</h4>
          <p>{CATEGORY_LABELS[report.category] || report.category}</p>
        </div>
        
        <div className="info-card">
          <h4>Type</h4>
          <p>
            <span className={`type-badge ${report.is_anonymous ? 'anonymous' : 'authenticated'}`}>
              {report.is_anonymous ? 'Anonymous' : 'Authenticated'}
            </span>
          </p>
        </div>
        
        <div className="info-card">
          <h4>Location</h4>
          <p>{report.location || 'Not specified'}</p>
        </div>
        
        <div className="info-card">
          <h4>Incident Date</h4>
          <p>{report.incident_date ? new Date(report.incident_date).toLocaleString() : 'Not specified'}</p>
        </div>
        
        {!report.is_anonymous && report.user_id && (
          <div className="info-card">
            <h4>Reporter</h4>
            <p>User ID: #{report.user_id}</p>
          </div>
        )}
        
        {report.is_anonymous && report.reporter_email && (
          <div className="info-card">
            <h4>Contact Email</h4>
            <p>{report.reporter_email}</p>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="admin-report-section">
        <h3>Description</h3>
        <div className="report-description">
          {report.description}
        </div>
      </div>

      {/* Attachments */}
      {report.attachments && report.attachments.length > 0 && (
        <div className="admin-report-section">
          <h3>Evidence Attachments</h3>
          <div className="attachments-grid">
            {report.attachments.map((att) => (
              <a 
                key={att.id} 
                href={att.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="attachment-card"
              >
                <div className="attachment-preview">
                  {att.mime_type.startsWith('image/') ? (
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
              </a>
            ))}
          </div>
        </div>
      )}

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

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Report Status</h3>
              <button className="modal-close" onClick={() => setShowStatusModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="statusSelect" className="form-label">
                  New Status <span className="required">*</span>
                </label>
                <select
                  id="statusSelect"
                  className="form-input"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  {nextStatuses.map(status => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="remarksInput" className="form-label">
                  Administrator Remarks (Optional, max 250 words)
                </label>
                <textarea
                  id="remarksInput"
                  className={`form-textarea ${remarksError ? 'error' : ''}`}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={4}
                  placeholder="Add any notes about this status change..."
                  maxLength={50000}
                />
                <div className="form-hint">
                  {remarks.split(/\s+/).filter(Boolean).length} / 250 words
                </div>
                {remarksError && <span className="form-error">{remarksError}</span>}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => setShowStatusModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn--primary" 
                onClick={handleStatusChange}
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal modal--md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Report</h3>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="assigneeSelect" className="form-label">
                  Assign To <span className="required">*</span>
                </label>
                <select
                  id="assigneeSelect"
                  className="form-input"
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(Number(e.target.value) || '')}
                >
                  <option value="">Select an admin/moderator...</option>
                  {availableAssignees.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.username} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              {availableAssignees.length === 0 && (
                <p className="form-hint" style={{ color: '#e74c3c' }}>
                  No admins or moderators available for assignment.
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn--secondary" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn--primary" 
                onClick={handleAssign}
                disabled={isLoading || !selectedAssignee}
              >
                {isLoading ? 'Assigning...' : 'Assign Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminReportDetail;
