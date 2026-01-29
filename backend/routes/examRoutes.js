const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const examController = require('../controllers/examController');
const examSubmissionController = require('../controllers/examSubmissionController');
const analyticsController = require('../controllers/analyticsController');

// ===== LEGACY EXAM (Keep existing functionality) =====

// Student submits weekly exam
router.post('/weekly', auth, roleMiddleware.isStudent, examController.submitWeeklyExam);

// Get student report (admin or trainer)
router.get(
	'/submissions/:submissionId/report',
	auth,
	(req, res, next) => {
		// allow Admin or Trainer
		if (!req.user || (req.user.role !== 'Admin' && req.user.role !== 'Trainer')) {
			return res.status(403).json({ success: false, message: 'Forbidden: insufficient rights' });
		}
		next();
	},
	examController.getStudentReport
);


// ===== STUDENT EXAMS (MUST COME BEFORE /:id ROUTE) =====

// Get exams assigned to student (must come before parameterized routes)
router.get('/assigned/me', auth, roleMiddleware.isStudent, examController.getAssignedExams);

// Get module exams for a course (students see only if enrolled)
router.get('/course/:courseId/modules', auth, examController.getModuleExamsByCourse);

// Get specific module/weekly exam by course/week
router.get('/modulely/:courseId/:weekNumber', auth, examController.getModuleExam);

// ===== NEW EXAM MANAGEMENT (Admin) =====

// Get all exams
router.get('/', auth, roleMiddleware.isAdmin, examController.getAllExams);

// Get exam by ID (can be accessed by students if assigned)
router.get('/:id', auth, examController.getExamById);

// Create exam
router.post('/', auth, roleMiddleware.isAdmin, examController.createExam);

router.post(
	'/module-placeholder',
	auth,
	roleMiddleware.isAdmin,
	examController.createPlaceholderExam
);

// Update exam
router.put('/:id', auth, roleMiddleware.isAdmin, examController.updateExam);

// Delete exam
router.delete('/:id', auth, roleMiddleware.isAdmin, examController.deleteExam);

// Assign exam to users/batches
router.post('/:id/assign', auth, roleMiddleware.isAdmin, examController.assignExam);

// ✅ NEW: Un-assign exam from users/batches
router.delete('/:id/unassign', auth, roleMiddleware.isAdmin, examController.unassignExam);

// ✅ NEW: Get exam assignment details
router.get('/:id/assignments', auth, roleMiddleware.isAdmin, examController.getExamAssignments);

// ===== EXAM SUBMISSIONS =====

// Start exam
router.post('/:examId/start', auth, roleMiddleware.isStudent, examSubmissionController.startExam);

// Submit answer
router.post('/:examId/answer/:questionId', auth, roleMiddleware.isStudent, examSubmissionController.submitAnswer);

// Submit entire exam
router.post('/:examId/submit', auth, roleMiddleware.isStudent, examSubmissionController.submitExam);

// Get submission status
router.get('/:examId/status', auth, examSubmissionController.getSubmissionStatus);
// Get exam attempts for student (returns attempts used/remaining and past submissions)
router.get('/:examId/attempts', auth, roleMiddleware.isStudent, examSubmissionController.getExamAttempts);
// ===== ANALYTICS ROUTES =====

// Get batch exam analytics
router.get(
	'/analytics/batch/:batchId/performance',
	auth,
	// Role check is handled in controller or add generic roleMiddleware here if uniform
	analyticsController.getBatchExamAnalytics
);

// Get detailed student performance
router.get(
	'/analytics/student/:studentId/detailed',
	auth,
	analyticsController.getStudentDetailedPerformance
);

module.exports = router;
