const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: String,
  authorImage: String,
  createdAt: { type: Date, default: Date.now },
  // Status: keep backward-compatible values and add draft/changes_requested
  status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected', 'changes_requested'], default: 'pending' },
  rejectReason: String,
  viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track unique viewers
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [CommentSchema],
  video: {
    id: mongoose.Schema.Types.ObjectId,
    filename: String
  },
  images: [{
    id: mongoose.Schema.Types.ObjectId,
    filename: String
  }],
  pointsClaimed: { type: Boolean, default: false } // Track if reward points have been claimed
  ,
  // Preserve last approved version and simple version history
  approvedVersion: {
    title: String,
    body: String,
    images: Array,
    video: Object,
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  versions: [{
    title: String,
    body: String,
    images: Array,
    video: Object,
    createdAt: { type: Date, default: Date.now },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String
  }]
  ,
  // Track last edited time for admin/master visibility
  lastEditedAt: { type: Date }
});

module.exports = mongoose.model('Blog', BlogSchema);
