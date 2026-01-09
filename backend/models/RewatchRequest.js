const mongoose = require('mongoose');

const RewatchRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  weekNumber: { type: Number, required: true },
  dayNumber: { type: Number, required: true },
  reason: { type: String },
  // add 'used' to indicate an approved request has been consumed by the student
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'used'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.models.RewatchRequest || mongoose.model('RewatchRequest', RewatchRequestSchema);
