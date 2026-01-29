import api from './api';

/**
 * Fetch all notifications for the logged-in user
 */
export const fetchNotifications = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await api.get('/notifications', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Mark a specific notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await api.patch(
      `/notifications/${notificationId}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await api.patch(
      '/notifications/mark-all/read',
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a specific notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await api.delete(`/notifications/${notificationId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Delete all notifications
 */
export const deleteAllNotifications = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await api.delete('/notifications', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    throw error;
  }
};
