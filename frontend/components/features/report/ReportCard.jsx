// ReportCard - VoiceED
// Component to display a report in dashboard/list views

'use client';

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  awaiting_additional_info: 'Awaiting Additional Info',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const STATUS_COLORS = {
  submitted: '#3498db',
  under_review: '#f39c12',
  assigned: '#9b59b6',
  in_progress: '#2980b9',
  awaiting_additional_info: '#e67e22',
  resolved: '#27ae60',
  closed: '#7f8c8d',
};

export const CATEGORY_LABELS = {
  academic: 'Academic Concern',
  harassment: 'Harassment or Bullying',
  safety: 'Facility/Safety Hazard',
  discrimination: 'Discrimination',
  mental_health: 'Mental Health Concern',
  violence: 'Violence or Threat',
  other: 'Other',
};

const CATEGORY_ICONS = {
  academic: 'fas fa-book',
  harassment: 'fas fa-user-slash',
  safety: 'fas fa-exclamation-triangle',
  discrimination: 'fas fa-balance-scale',
  mental_health: 'fas fa-brain',
  violence: 'fas fa-fist-raised',
  other: 'fas fa-ellipsis-h',
};

export function ReportCard({
  report,
  onClick,
  variant = 'dashboard',
  showActions = false,
}) {
  const statusColor = STATUS_COLORS[report.status] || '#7f8c8d';
  const categoryLabel = CATEGORY_LABELS[report.category] || report.category;
  const categoryIcon = CATEGORY_ICONS[report.category] || 'fas fa-tag';
  const statusLabel = STATUS_LABELS[report.status] || report.status;

  const handleClick = () => {
    if (onClick) {
      onClick(report);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <article
      className={`report-card report-card--${variant} ${onClick ? 'clickable' : ''}`}
      onClick={handleClick}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="report-card-header">
        <div className="report-card-title-section">
          <h3 className="report-card-title">{report.title}</h3>
          <div className="report-card-meta">
            <span className="report-card-tracking">
              Tracking: <code>{report.tracking_code}</code>
            </span>
            {variant !== 'tracking' && (
              <>
                <span className="report-card-divider">•</span>
                <span className="report-card-date">
                  Submitted {formatDate(report.created_at)}
                </span>
              </>
            )}
          </div>
        </div>

        <span
          className="report-card-status"
          style={
            variant === 'admin'
              ? { '--report-status-color': statusColor }
              : { backgroundColor: statusColor }
          }
        >
          {statusLabel}
        </span>
      </div>

      <div className="report-card-body">
        <div className="report-card-category">
          <i className={categoryIcon}></i>
          <span>{categoryLabel}</span>
        </div>

        {report.location && (
          <div className="report-card-location">
            <i className="fas fa-map-marker-alt"></i>
            <span>{report.location}</span>
          </div>
        )}

        {report.incident_date && (
          <div className="report-card-incident-date">
            <i className="fas fa-calendar-alt"></i>
            <span>Incident: {new Date(report.incident_date).toLocaleDateString()}</span>
          </div>
        )}

        {'description' in report && report.description && (
          <p className="report-card-description">
            {report.description.length > 150
              ? report.description.substring(0, 150) + '...'
              : report.description}
          </p>
        )}

        {report.is_anonymous && (
          <div className="report-card-anonymous-badge">
            <i className="fas fa-user-secret"></i>
            <span>Anonymous Report</span>
          </div>
        )}

        {'attachments' in report &&
          report.attachments &&
          report.attachments.length > 0 && (
            <div className="report-card-attachments">
              <i className="fas fa-paperclip"></i>
              <span>
                {report.attachments.length} attachment
                {report.attachments.length > 1 ? 's' : ''}
              </span>
            </div>
          )}
      </div>

      {showActions && (
        <div className="report-card-actions">
          <button
            className="btn btn--ghost btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            <i className="fas fa-eye"></i> View Details
          </button>

          {variant === 'admin' && (
            <>
              <button className="btn btn--ghost btn--sm">
                <i className="fas fa-edit"></i> Update Status
              </button>
              <button className="btn btn--ghost btn--sm">
                <i className="fas fa-user-tag"></i> Assign
              </button>
            </>
          )}
        </div>
      )}

      {!showActions && onClick && (
        <div className="report-card-click-hint">
          Click to view details <i className="fas fa-chevron-right"></i>
        </div>
      )}
    </article>
  );
}

export default ReportCard;
