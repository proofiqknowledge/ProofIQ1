const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true, // For fast queries by user
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'blog_submitted', 'blog_approved', 'blog_rejected'],
    default: 'info',
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true, // For fast queries by read status
  },
  // Optional: link to related resource (course, batch, exam, etc)
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  relatedType: {
    type: String,
    enum: ['course', 'batch', 'exam', 'proposal', null],
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true, // For fast sorting by date
  },
});

// Index for common queries: all unread notifications for a user
notificationSchema.index({ user: 1, isRead: 1 });

// TTL index: auto-delete notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('Notification', notificationSchema);
