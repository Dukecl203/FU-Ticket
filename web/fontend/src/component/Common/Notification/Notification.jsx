import React, { useEffect } from 'react';
import './notification.scss';

// Single notification item
export function NotificationItem({ id, type = 'info', message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(t);
  }, [id, duration, onClose]);

  return (
    <div className={`notification-item ${type}`} role="alert" aria-live="polite">
      <div className="notification-message">{message}</div>
      <button className="notification-close" onClick={() => onClose(id)} aria-label="Close">×</button>
    </div>
  );
}

// Container for notifications
export function NotificationsContainer({ notifications = [], onClose }) {
  return (
    <div className="notifications-root">
      {notifications.map(n => (
        <NotificationItem key={n.id} {...n} onClose={onClose} />
      ))}
    </div>
  );
}
