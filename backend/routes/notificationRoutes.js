const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} = require('../controllers/notificationController');
const auth = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(auth);

// Get all notifications for the user
router.get('/', getNotifications);

// Mark a specific notification as read
// Mark all notifications as read (must come BEFORE dynamic route)
router.patch('/mark-all/read', markAllAsRead);

// Mark specific notification as read
router.patch('/:notificationId/read', markAsRead);


// Delete a specific notification
router.delete('/:notificationId', deleteNotification);

// Delete all notifications
router.delete('/', deleteAllNotifications);

module.exports = router;
