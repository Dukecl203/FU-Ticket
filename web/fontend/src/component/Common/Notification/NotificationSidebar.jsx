import React from 'react';
import './NotificationSidebar.css';

const NotificationSidebar = ({ open, onClose, notifications = [], onMarkAllRead, onClear, onItemClick, onMarkRead, onDelete }) => {
  // Helper function to get icon and color based on notification type
  const getNotificationStyle = (type) => {
    switch (type) {
      case 'WALLET_TOPUP':
        return { icon: '💰', bgColor: '#e8f5e9', borderColor: '#4caf50' };
      case 'TICKET_PURCHASE':
        return { icon: '🎫', bgColor: '#e3f2fd', borderColor: '#2196f3' };
      case 'WALLET_WITHDRAW':
        return { icon: '💳', bgColor: '#fff3e0', borderColor: '#ff9800' };
      case 'ORDER':
        return { icon: '📦', bgColor: '#f3e5f5', borderColor: '#9c27b0' };
      default:
        return { icon: '🔔', bgColor: '#f5f5f5', borderColor: '#999' };
    }
  };

  return (
    <>
      <div className={`ns-overlay ${open ? 'visible' : ''}`} onClick={onClose} />
      <aside className={`notification-sidebar ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="ns-header">
          <h4>Thông báo</h4>
          <div className="ns-actions">
            <button className="ns-action" onClick={onMarkAllRead} title="Đánh dấu tất cả đã đọc">
              ✓ Tất cả
            </button>
            <button className="ns-action" onClick={onClear} title="Xóa tất cả">
              🗑️
            </button>
            <button className="ns-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="ns-list">
          {notifications.length === 0 && <div className="ns-empty">Không có thông báo</div>}
          {notifications.map((n, i) => {
            const style = getNotificationStyle(n.type);
            return (
              <div
                key={n.id || n._id || `n-${i}`}
                className={`ns-item ${n.read ? 'read' : 'unread'} ${n.href ? 'clickable' : ''}`}
                style={{
                  backgroundColor: style.bgColor,
                  borderLeft: `4px solid ${style.borderColor}`,
                }}
                onClick={() => onItemClick && onItemClick(n)}
              >
                <div className="ns-item-header">
                  <span className="ns-icon">{style.icon}</span>
                  <div className="ns-item-content">
                    <div className="ns-item-title">{n.title || 'Thông báo'}</div>
                    <div className="ns-item-body">{n.body || n.message || ''}</div>
                    <div className="ns-item-meta">{n.time || ''}</div>
                  </div>
                  <div className="ns-item-actions">
                    {!n.read && (
                      <button
                        className="ns-btn-mark"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkRead && onMarkRead(n);
                        }}
                        title="Đánh dấu đã đọc"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className="ns-btn-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete && onDelete(n);
                      }}
                      title="Xóa thông báo"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};

export default NotificationSidebar;
