const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['mcq', 'coding', 'theory'], required: true },
  title: { type: String, required: true },
  marks: { type: Number, required: true, default: 1 },

  // ✅ ADD THESE NEW FIELDS
  markedForReview: { type: Boolean, default: false },
  timeSpent: { type: Number, default: 0 }, // in seconds

  // MCQ specific
  options: [{
    text: String,
    isCorrect: Boolean,
    optionLabel: { type: String, enum: ['A', 'B', 'C', 'D', 'E'] }
  }],

  // Coding specific
  language: { type: String, default: 'javascript' },
  boilerplate: { type: String, default: '' },

  // Function template fields (for HackerRank-style questions)
  functionName: { type: String, default: '' },        // e.g., "add"
  functionSignature: { type: String, default: '' },   // e.g., "def add(a, b):"
  mainBlock: { type: String, default: '' },           // Hidden code that calls function

  testCases: [{
    input: String,
    expectedOutput: String,
    isHidden: { type: Boolean, default: false },
    description: { type: String, default: '' },       // e.g., "Basic addition test"
    timeLimit: { type: Number, default: 5 },          // seconds
    memoryLimit: { type: Number, default: 256 }       // MB
  }],

  // Rest of fields...
}, { _id: true });


const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['mcq', 'coding', 'theory'],
      default: 'mcq',
      required: true,
    },
    // NEW: Exam type for evaluation criteria (affects qualification thresholds)
    examType: {
      type: String,
      enum: ['theory', 'mcq', 'coding'],
      default: function () {
        // Auto-detect from question types if not explicitly set
        if (this.questions && this.questions.length > 0) {
          const hasCoding = this.questions.some(q => q.type === 'coding');
          if (hasCoding) return 'coding';
          const hasMCQ = this.questions.some(q => q.type === 'mcq');
          if (hasMCQ) return 'mcq';
        }
        return 'theory';
      }
    },
    duration: {
      type: Number,
      required: true, // in minutes
    },
    qualificationPercentage: {
      type: Number,
      min: 1,
      max: 100,
      default: 50, // Amber threshold
      required: true,
    },
    // RAG thresholds: Green >= excellentMin (80), Amber >= goodMin (50)
    excellentMin: {
      type: Number,
      min: 1,
      max: 100,
      default: 80, // Green threshold
      required: true,
    },
    goodMin: {
      type: Number,
      min: 1,
      max: 100,
      default: 50, // Amber threshold
      required: true,
    },
    averageMin: {
      type: Number,
      min: 1,
      max: 100,
      default: 50, // Amber threshold
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    questions: [questionSchema],
    published: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Optional: track which course/week this exam is for
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    weekNumber: {
      type: Number,
      default: null,
    },
    isInModule: {
      type: Boolean,
      default: false,
    },
    assignedTo: {
      users: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      batches: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Batch',
        },
      ],
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Pre-save hook: ensure each MCQ option has an optionLabel (A/B/C/...) so front-end always has labels
examSchema.pre('save', function (next) {
  try {
    if (!Array.isArray(this.questions)) return next();
    this.questions.forEach((q) => {
      if (!Array.isArray(q.options)) return;
      q.options.forEach((opt, idx) => {
        if (!opt.optionLabel) {
          // Assign label based on index (A, B, C, ...)
          opt.optionLabel = String.fromCharCode(65 + idx);
        }
      });
    });
  } catch (err) {
    // don't block save on hook failures; log and continue
    console.warn('Assessment pre-save hook failed to set optionLabel:', err);
  }
  next();
});

// Pre-save hook: Auto-detect examType and apply appropriate thresholds
examSchema.pre('save', function (next) {
  try {
    // Auto-detect examType from questions if not explicitly set
    if (!this.examType && this.questions && this.questions.length > 0) {
      const hasCoding = this.questions.some(q => q.type === 'coding');
      const hasMCQ = this.questions.some(q => q.type === 'mcq');

      if (hasCoding) {
        this.examType = 'coding';
      } else if (hasMCQ) {
        this.examType = 'mcq';
      } else {
        this.examType = 'theory';
      }
    }

    // Apply RAG thresholds (80/50/50/50)
    // This simplifies the logic to Green (80+) and Amber (50+)
    if (this.isNew || this.isModified('examType')) {
      this.excellentMin = 80;
      this.goodMin = 50;
      this.averageMin = 50;
      this.qualificationPercentage = 50;
    }
  } catch (err) {
    console.warn('Exam pre-save hook failed to set examType/thresholds:', err);
  }
  next();
});

module.exports = mongoose.model('Exam', examSchema);
