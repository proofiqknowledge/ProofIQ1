const Notification = require('../models/Notification');

/**
 * Create a new notification
 * @param {string} userId - User ID to notify
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - Type: 'info', 'success', 'warning', 'error'
 * @param {Object} options - Additional options (relatedId, relatedType)
 */
exports.createNotification = async (userId, title, message, type = 'info', options = {}) => {
  try {
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      relatedId: options.relatedId || null,
      relatedType: options.relatedType || null,
    });

    await notification.save();
    console.log(`✅ Notification created for user ${userId}: "${title}"`);
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

/**
 * Get all notifications for a user
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get last 50 notifications, sorted by newest first
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    // Count unread notifications
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false,
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Mark a specific notification as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Verify the notification belongs to the user
    if (notification.user.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Mark all notifications as read for the user
 */
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );

    res.json({
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete a specific notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Verify the notification belongs to the user
    if (notification.user.toString() !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete all notifications for the user
 */
exports.deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await Notification.deleteMany({ user: userId });

    res.json({
      message: 'All notifications deleted',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ message: error.message });
  }
};
