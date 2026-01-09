// backend/models/Submission.js
const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
    testCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'TestCase', required: false },
    stdout: { type: String, default: '' },
    stderr: { type: String, default: '' },
    compile_output: { type: String, default: '' },
    status: { type: String, default: '' }, // accepted, wrong_answer, runtime_error, time_limit, etc.
    time: { type: Number, default: 0 } // seconds (or judge reported)
}, { _id: false });

const SubmissionSchema = new mongoose.Schema({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: false },
    // Changed to String to support both ObjectId and legacy timestamp IDs
    questionId: { type: String, required: false },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    language: { type: String, default: 'python' },
    source: { type: String, required: true },

    // Array of per-testcase results
    results: { type: [ResultSchema], default: [] },

    passed: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    score: { type: Number, default: 0 }, // computed marks (float allowed)
    isManualOverride: { type: Boolean, default: false },
    manualScore: { type: Number, default: null },

    meta: {
        durationMs: { type: Number, default: 0 }, // total execution time
        judge0Token: { type: String, default: '' } // optional token or trace id
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // ✅ NEW: Track submission type for proper grading
    // 'custom' = Run Code button (test only, don't grade)
    // 'sample' = Run Sample Tests (visible tests only)
    // 'final' = Submit Code button (grade this)
    // 'auto_final' = Auto-executed during exam submission (grade this)
    runType: {
        type: String,
        enum: ['custom', 'sample', 'final', 'auto_final', 'test_all', 'run', 'all'],
        default: 'final'
    }
});

// Update updatedAt on save
SubmissionSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Indexes for fast lookup
SubmissionSchema.index({ questionId: 1, userId: 1, createdAt: -1 });
SubmissionSchema.index({ examId: 1, userId: 1, createdAt: -1 });

// ✅ NEW: Optimized index for exam submission grading lookup
// This index covers the exact query pattern used in resultController.js
SubmissionSchema.index({
    examId: 1,
    userId: 1,
    questionId: 1,
    runType: 1,
    createdAt: -1
});

module.exports = mongoose.model('Submission', SubmissionSchema);
