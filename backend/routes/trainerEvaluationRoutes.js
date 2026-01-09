const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
    getAllPendingEvaluations,
    getExamSubmissions,
    getSubmissionForEvaluation,
    evaluateSubmission
} = require('../controllers/trainerEvaluationController');

// All routes require authentication and Trainer role

// @route   GET /api/trainer/evaluation/pending
// @desc    Get all pending evaluations (all exams + submissions) for trainer
// @access  Trainer
router.get('/pending', auth, roleMiddleware.isTrainer, getAllPendingEvaluations);

// @route   GET /api/trainer/evaluation/exams/:examId/submissions
// @desc    Get all submissions for a specific exam (only from trainer's batches)
// @access  Trainer
router.get('/exams/:examId/submissions', auth, roleMiddleware.isTrainer, getExamSubmissions);

// @route   GET /api/trainer/evaluation/submission/:submissionId
// @desc    Get submission details for evaluation
// @access  Trainer
router.get('/submission/:submissionId', auth, roleMiddleware.isTrainer, getSubmissionForEvaluation);

// @route   POST /api/trainer/evaluation/submission/:submissionId/evaluate
// @desc    Submit evaluation for a theoretical exam
// @access  Trainer
router.post('/submission/:submissionId/evaluate', auth, roleMiddleware.isTrainer, evaluateSubmission);

// @route   GET /api/trainer/evaluation/debug
// @desc    Debug endpoint to check trainer data
// @access  Trainer
const { debugTrainerData } = require('../controllers/debugTrainerEvaluation');
router.get('/debug', auth, roleMiddleware.isTrainer, debugTrainerData);

module.exports = router;

