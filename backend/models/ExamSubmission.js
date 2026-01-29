const mongoose = require('mongoose');

const submissionAnswerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  questionType: { type: String, enum: ['mcq', 'coding', 'theory'], required: true },

  // ✅ NEW: Track question state
  visited: { type: Boolean, default: false },
  answered: { type: Boolean, default: false },
  markedForReview: { type: Boolean, default: false },
  timeSpentOnQuestion: { type: Number, default: 0 }, // in seconds

  // MCQ
  selectedOption: String,


  // CODING
  code: String,
  language: String,
  // ✅ NEW: Track last run code explicitly
  lastRun: { type: Boolean, default: false },
  lastRunCode: String,
  lastRunTimestamp: Date,

  judge0SubmissionId: String,
  judge0Status: String,
  judge0Output: String,
  testCasesPassed: { type: Number, default: 0 },
  testCasesFailed: { type: Number, default: 0 },
  testCaseResults: [{
    input: String,
    expectedOutput: String,
    actualOutput: String,
    passed: Boolean,
    status: String,
    stderr: String,
  }],

  // THEORY
  textAnswer: String,


  // GRADING
  marksObtained: { type: Number, default: 0 },
  marksMax: Number,
  isCorrect: Boolean,
  feedback: String,
}, { _id: false });

const examSubmissionSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attemptNumber: { type: Number, default: 1, min: 1, max: 3 }, // ✅ Track attempt (max 3)


  status: {
    type: String,
    enum: ['not_started', 'pending', 'in_progress', 'submitted', 'graded', 'evaluated'],
    default: 'not_started',
  },


  startedAt: Date,
  submittedAt: Date,
  gradedAt: Date,
  evaluatedAt: Date,


  // ✅ NEW: Progress tracking (Mettl-style)
  currentQuestionIndex: { type: Number, default: 0 },
  questionsVisited: { type: Number, default: 0 },
  questionsAnswered: { type: Number, default: 0 },
  questionsMarkedForReview: { type: Number, default: 0 },
  progressPercentage: { type: Number, default: 0 },

  awaitingEvaluation: { type: Boolean, default: false },
  answers: [submissionAnswerSchema],


  // ANTI-CHEAT
  violationCount: { type: Number, default: 0, min: 0 },
  cheatingLogs: [{
    time: { type: Date, default: Date.now },
    type: { type: String, trim: true, maxlength: 120 },
    details: { type: String, trim: true, maxlength: 500 },
  }],
  cheatingDetected: { type: Boolean, default: false },
  submissionReason: { type: String, trim: true, maxlength: 200 },


  // RESULTS
  totalMarksObtained: { type: Number, default: 0 },
  totalMarksMax: { type: Number, default: 0 },
  percentageScore: { type: Number, default: 0 },
  qualified: { type: Boolean, default: false },
  grade: { type: String, enum: ['Green', 'Amber', 'Red', 'Excellent', 'Good', 'Average', 'Poor'], default: 'Red' },


  // STATUS FLAGS
  submitted: { type: Boolean, default: false },
  evaluated: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },

  // MANUAL EVALUATION (Trainer-Based)
  isEvaluated: { type: Boolean, default: false },
  evaluatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  manualScores: [{
    questionId: { type: String, required: true },
    score: { type: Number, default: 0 },
  }],
  totalManualScore: { type: Number, default: 0 },


  // TIME & META
  timeSpent: { type: Number, default: 0 },
  timeRemaining: { type: Number }, // ✅ NEW: Track remaining time
  // Per-user randomized question order (stores question ids as strings)
  questionOrder: [{ type: String }],


  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// ✅ CONCURRENCY FIX: Enforce unique constraint to prevent duplicate submissions
// Only ONE submission allowed per student+exam combination
examSubmissionSchema.index({ exam: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('ExamSubmission', examSubmissionSchema);
