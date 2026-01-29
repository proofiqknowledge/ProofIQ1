import React, { useState, useEffect, useCallback } from 'react';
import { FaBell, FaTimes, FaCheckCircle, FaInfoCircle, FaExclamationCircle, FaTimesCircle } from 'react-icons/fa';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../services/notificationService';


const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notifications on component mount and set up auto-refresh
  useEffect(() => {
    loadNotifications();

    // Auto-refresh notifications every 10 seconds
    const interval = setInterval(loadNotifications, 10000);

    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Handle mark as read
  const handleMarkAsRead = async (e, notificationId, isRead) => {
    e.stopPropagation();

    if (!isRead) {
      try {
        await markNotificationAsRead(notificationId);
        await loadNotifications();
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Handle delete notification
  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();

    try {
      await deleteNotification(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Handle delete all notifications
  const handleDeleteAll = async () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      try {
        await deleteAllNotifications();
        await loadNotifications();
      } catch (error) {
        console.error('Failed to delete all notifications:', error);
      }
    }
  };

  // Get icon based on notification type
  const getTypeIcon = (type) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle style={{ color: '#27ae60', marginRight: '8px' }} />;
      case 'warning':
        return <FaExclamationCircle style={{ color: '#f39c12', marginRight: '8px' }} />;
      case 'error':
        return <FaTimesCircle style={{ color: '#e74c3c', marginRight: '8px' }} />;
      case 'info':
      default:
        return <FaInfoCircle style={{ color: '#3498db', marginRight: '8px' }} />;
    }
  };

  // Format timestamp
  const formatTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMinutes = Math.floor((now - notifDate) / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Styles
  const bellStyle = {
    position: 'relative',
    cursor: 'pointer',
    fontSize: '20px',
    marginRight: '20px',
    transition: 'all 0.3s ease',
    color: '#9B1C36',
  };

  const badgeStyle = {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: '#9B1C36',
    color: 'white',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
  };

  const dropdownStyle = {
    position: 'absolute',
    top: '60px',
    right: '0',
    width: '400px',
    maxHeight: '500px',
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle = {
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  };

  const headerTitleStyle = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  };

  const actionsStyle = {
    display: 'flex',
    gap: '8px',
  };

  const actionButtonStyle = {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3498db',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '0',
    textDecoration: 'underline',
  };

  const listStyle = {
    overflowY: 'auto',
    flex: 1,
    maxHeight: '400px',
  };

  const notificationItemStyle = (isRead) => ({
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    gap: '12px',
    cursor: 'pointer',
    backgroundColor: isRead ? 'white' : '#f0f8ff',
    transition: 'background-color 0.2s ease',
    alignItems: 'flex-start',
  });

  const contentStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const titleStyle = {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#333',
  };

  const messageStyle = {
    fontSize: '12px',
    color: '#666',
  };

  const timeStyle = {
    fontSize: '11px',
    color: '#999',
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#999',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0 4px',
    alignSelf: 'flex-start',
  };

  const emptyStateStyle = {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Icon */}
      <div
        style={bellStyle}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <FaBell />
        {unreadCount > 0 && (
          <div style={badgeStyle}>{unreadCount > 99 ? '99+' : unreadCount}</div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div style={dropdownStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <div style={headerTitleStyle}>Notifications</div>
            <div style={actionsStyle}>
              {unreadCount > 0 && (
                <button
                  style={actionButtonStyle}
                  onClick={handleMarkAllAsRead}
                  title="Mark all as read"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  style={actionButtonStyle}
                  onClick={handleDeleteAll}
                  title="Delete all notifications"
                >
                  Clear all
                </button>
              )}
              <button
                style={{ ...actionButtonStyle, textDecoration: 'none' }}
                onClick={() => setIsOpen(false)}
              >
                <FaTimes />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div style={listStyle}>
            {loading ? (
              <div style={emptyStateStyle}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div style={emptyStateStyle}>No notifications yet</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  style={notificationItemStyle(notification.isRead)}
                  onClick={(e) =>
                    handleMarkAsRead(e, notification._id, notification.isRead)
                  }
                >
                  <div>{getTypeIcon(notification.type)}</div>
                  <div style={contentStyle}>
                    <div style={titleStyle}>{notification.title}</div>
                    <div style={messageStyle}>{notification.message}</div>
                    <div style={timeStyle}>{formatTime(notification.createdAt)}</div>
                  </div>
                  <button
                    style={closeButtonStyle}
                    onClick={(e) => handleDeleteNotification(e, notification._id)}
                    title="Delete notification"
                  >
                    <FaTimes />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationCenter;
