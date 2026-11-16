'use client';

import styles from './NotificationToasts.module.css';

export default function NotificationToasts({ notifications, onDismiss }) {
  return (
    <div className={styles.region} aria-label="Notifications">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type} show ${styles.toast}`}
          role={notification.type === 'error' ? 'alert' : 'status'}
        >
          <div className="notification-header">
            <div className="notification-title">{notification.title}</div>
            <button
              type="button"
              className="notification-close"
              aria-label="Dismiss notification"
              onClick={() => onDismiss(notification.id)}
            >
              ×
            </button>
          </div>
          <div className="notification-body">{notification.bodyMessage}</div>
        </div>
      ))}
    </div>
  );
}
