const mongoose = require('mongoose');

const daySchema = new mongoose.Schema({
  dayNumber: { type: Number, required: true }, // 1-5
  title: { type: String, default: '' }, // Original title field
  customName: { type: String, maxlength: 150, trim: true }, // NEW: Custom name for day
  overview: { type: String, default: '' },
  videoUrl: { type: String }, // backward compatibility
  videoGridFSId: { type: mongoose.Schema.Types.ObjectId }, // GridFS file ID
  videoName: { type: String }, // Video filename
  documentUrl: { type: String },
  documentGridFSId: { type: mongoose.Schema.Types.ObjectId }, // GridFS file ID
  documentName: { type: String }, // Document filename
  pptUrl: { type: String }, // NEW: External PPT URL (if needed in your old file)
  acknowledgementRequired: { type: Boolean, default: true },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastEditedAt: { type: Date },
});

const weekSchema = new mongoose.Schema({
  weekNumber: { type: Number, required: true },
  title: { type: String },
  customName: { type: String, maxlength: 150, trim: true }, // NEW
  days: [daySchema],
  hasExam: { type: Boolean, default: false },
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },

  // Image (GridFS)
  imageGridFSId: { type: mongoose.ObjectId, default: null },
  imageName: { type: String },
  imageContentType: { type: String, default: "" },
  imageUrl: { type: String, default: "" },

  weeks: [weekSchema],

  // ⭐ NEW FIELD MERGED FROM FILE 2
  durationWeeks: { type: Number, default: 0 },

  // Course Stay Duration (per-batch access control)
  courseStayEnabled: { type: Boolean, default: false },
  courseStayDurationWeeks: { type: Number, default: 0 },
  courseStayDurationDays: { type: Number, default: 0 },

  // ⭐ NEW FIELDS: Course Information & Disclaimer
  aboutCourse: { type: String, default: "" },
  learnings: [{ type: String }],          // Array of bullet points
  whatYouWillDo: [{ type: String }],      // Array of bullet points/skills
  disclaimerEnabled: { type: Boolean, default: true },
  disclaimerContent: { type: String, default: "IMPORTANT: ONE-TIME WATCH POLICY\nPlease note that this course strictly enforces a one-time viewing policy for all video content. You can watch each video exactly once. After completion, the video will be locked. To re-watch any video, you must request legitimate approval from an Admin or Trainer. By clicking 'I Acknowledge & Agree', you confirm that you understand and accept this restriction." },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTrainers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedBatches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  enrolledCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'active' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('Course', courseSchema);
