const mongoose = require('mongoose');

const reExamRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  employeeId: {
    type: String,
  },
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true,
  },
  examName: {
    type: String,
    required: true,
  },
  writtenAt: {
    type: Date,
  },
  marks: {
    type: Number,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],  // ✅ Added 'completed'
    default: 'pending',
  },
  attemptNumber: {
    type: Number,
    default: 1,
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: {
    type: Date,
  },
});

module.exports = mongoose.model('ReExamRequest', reExamRequestSchema);
