const mongoose = require('mongoose');

const enrolledCourseSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  progress: { type: Number, default: 0 },
  completedWeeks: [{ type: Number }],
  // NEW: Track if course disclaimer has been acknowledged
  disclaimerAcknowledged: { type: Boolean, default: false },
  disclaimerAcknowledgedAt: { type: Date },
  // Tracks which completed week numbers have had their points claimed
  completedWeeksPointsClaimed: [{ type: Number }],

  // Tracks individual days completed { weekNumber, dayNumber, completedAt }
  completedDays: [{
    weekNumber: { type: Number },
    dayNumber: { type: Number },
    completedAt: { type: Date, default: Date.now }
  }],
  // NEW: store watched videos for this enrolled course
  // videoGridFSId can be a GridFS ObjectId string or any unique video identifier you use
  watchedVideos: [{
    videoGridFSId: { type: String },
    watchedAt: { type: Date, default: Date.now }
  }],

  // NEW: one-time allowances for rewatching specific videos
  // When a trainer/admin approves a rewatch request, we push the videoId here.
  // After the student uses the allowance (watches again), remove it.
  rewatchAllowances: [{ type: String }],

  // NEW: Persistent notes for course modules
  notes: [{
    weekNumber: { type: Number },
    dayNumber: { type: Number },
    content: { type: String },
    updatedAt: { type: Date, default: Date.now }
  }]
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
    // ✅ No validation - accepts any format
  },
  azureOid: {
    type: String,
    unique: true,
    sparse: true,
    // Store Azure Object ID (immutable) for reliable identity mapping
  },
  // ❌ REMOVED: designation
  // ❌ REMOVED: yearsOfExperience
  passwordHash: { type: String, required: true },
  // Fields used for password reset flow
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  role: {
    type: String,
    enum: ['Master', 'Admin', 'Trainer', 'Student'],
    enum: ['Master', 'Admin', 'Trainer', 'Student'],
    default: 'Student',
  },
  authType: {
    type: String,
    enum: ['Local', 'MSAL'],
    default: 'Local'
  },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  rewardPoints: { type: Number, default: 0 },
  isBlocked: { type: Boolean, default: false },
  enrolledCourses: [enrolledCourseSchema],
}, { timestamps: true });

// ✅ PERFORMANCE INDEXES
// 1. Optimize "Get Students in Batch" (Dashboard queries)
userSchema.index({ batch: 1, role: 1 });

// 2. Optimize "Find Users in Course" (Course progress queries)
userSchema.index({ "enrolledCourses.courseId": 1 });

// 3. Optimize "Find all Trainers/Admins" (User management)
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
