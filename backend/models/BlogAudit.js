// backend/models/BlogAudit.js
const mongoose = require('mongoose');

const BlogAuditSchema = new mongoose.Schema({
  blog: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true, index: true },
  action: { type: String, enum: ['created','submitted','edited','approved','rejected','requested_changes'], required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedAt: { type: Date, default: Date.now },
  previousContent: {
    title: String,
    body: String,
    images: Array,
    video: Object,
    status: String
  },
  newContent: {
    title: String,
    body: String,
    images: Array,
    video: Object,
    status: String
  },
  note: String // For rejection reason or admin notes
});

module.exports = mongoose.model('BlogAudit', BlogAuditSchema);
