// ReportTimeline - VoiceED
// Component to display report timeline with status updates

'use client';

const STATUS_ORDER = [
  'submitted',
  'under_review',
  'assigned',
  'in_progress',
  'awaiting_additional_info',
  'resolved',
  'closed',
];

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  awaiting_additional_info: 'Awaiting Additional Info',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_ICONS = {
  submitted: 'fas fa-inbox',
  under_review: 'fas fa-search',
  assigned: 'fas fa-user-tag',
  in_progress: 'fas fa-cogs',
  awaiting_additional_info: 'fas fa-question-circle',
  resolved: 'fas fa-check-circle',
  closed: 'fas fa-archive',
};

const STATUS_COLORS = {
  submitted: '#3498db',
  under_review: '#f39c12',
  assigned: '#9b59b6',
  in_progress: '#2980b9',
  awaiting_additional_info: '#e67e22',
  resolved: '#27ae60',
  closed: '#7f8c8d',
};

export function ReportTimeline({ timeline, currentStatus, isAdmin = false }) {
  // Combine timeline entries with current status if not already in timeline
  const currentStatusEntry = timeline.find((t) => t.status === currentStatus);
  const hasCurrentInTimeline = !!currentStatusEntry;

  // Sort timeline by date
  const sortedTimeline = [...timeline].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Get status index for progress indicator
  const currentStatusIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className="report-timeline">
      {/* Progress Indicator */}
      <div
        className="timeline-progress"
        role="progressbar"
        aria-valuenow={currentStatusIndex + 1}
        aria-valuemin={1}
        aria-valuemax={STATUS_ORDER.length}
      >
        {STATUS_ORDER.map((status, index) => {
          const isCompleted = index < currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const isFuture = index > currentStatusIndex;

          return (
            <div
              key={status}
              className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isFuture ? 'future' : ''}`}
            >
              <div
                className="step-marker"
                style={{
                  backgroundColor:
                    isCompleted || isCurrent ? STATUS_COLORS[status] : '#e0e0e0',
                }}
              >
                {isCompleted ? (
                  <i className="fas fa-check" style={{ color: 'white' }} />
                ) : (
                  <i
                    className={STATUS_ICONS[status]}
                    style={{ color: isCurrent ? 'white' : '#999' }}
                  />
                )}
              </div>
              <span
                className="step-label"
                style={{ fontWeight: isCurrent ? 600 : 400 }}
              >
                {STATUS_LABELS[status]}
              </span>
              {index < STATUS_ORDER.length - 1 && (
                <div
                  className="step-connector"
                  style={{
                    backgroundColor: isCompleted ? STATUS_COLORS[status] : '#e0e0e0',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline Entries */}
      <div className="timeline-entries">
        {sortedTimeline.map((entry, index) => (
          <div key={entry.id} className="timeline-entry">
            {/* Timeline Dot/Connector */}
            <div className="timeline-marker">
              <div
                className="timeline-dot"
                style={{ backgroundColor: STATUS_COLORS[entry.status] }}
              >
                <i
                  className={STATUS_ICONS[entry.status]}
                  style={{ color: 'white', fontSize: '10px' }}
                />
              </div>
              {index < sortedTimeline.length - 1 && <div className="timeline-line" />}
            </div>

            {/* Entry Content */}
            <div className="timeline-content">
              <div className="timeline-entry-header">
                <span
                  className="timeline-status-badge"
                  style={{ backgroundColor: STATUS_COLORS[entry.status] }}
                >
                  {STATUS_LABELS[entry.status]}
                </span>
                <time className="timeline-timestamp" dateTime={entry.created_at}>
                  {new Date(entry.created_at).toLocaleString()}
                </time>
              </div>

              {entry.remarks && (
                <div className="timeline-remarks">
                  <p>{entry.remarks}</p>
                </div>
              )}

              {entry.attachments && entry.attachments.length > 0 && (
                <div className="timeline-attachments">
                  <h5>Attachments</h5>
                  <div className="attachments-list">
                    {entry.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="attachment-link"
                      >
                        <i
                          className={`fas ${att.attachment.mime_type.startsWith('image/') ? 'fa-image' : 'fa-file-pdf'}`}
                        ></i>
                        <span>{att.attachment.filename}</span>
                        <span className="attachment-size">
                          {(att.attachment.file_size / 1024).toFixed(1)} KB
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {entry.created_by_name && (
                <div className="timeline-author">
                  Updated by {entry.created_by_name}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Current status if not in timeline yet */}
        {!hasCurrentInTimeline && (
          <div className="timeline-entry current-status-entry">
            <div className="timeline-marker">
              <div
                className="timeline-dot current"
                style={{ backgroundColor: STATUS_COLORS[currentStatus] }}
              >
                <i
                  className={STATUS_ICONS[currentStatus]}
                  style={{ color: 'white', fontSize: '10px' }}
                />
              </div>
              <div className="timeline-line" />
            </div>
            <div className="timeline-content">
              <div className="timeline-entry-header">
                <span
                  className="timeline-status-badge current"
                  style={{ backgroundColor: STATUS_COLORS[currentStatus] }}
                >
                  {STATUS_LABELS[currentStatus]}{' '}
                  <span className="current-indicator">(Current)</span>
                </span>
                <time className="timeline-timestamp">Just now</time>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {timeline.length === 0 && !hasCurrentInTimeline && (
        <div className="timeline-empty">
          <i className="fas fa-history"></i>
          <p>No timeline entries yet. Status updates will appear here.</p>
        </div>
      )}
    </div>
  );
}

export default ReportTimeline;
