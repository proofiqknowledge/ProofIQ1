// backend/routes/trainerRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const {
  getTrainerBatches,
  getBatchStudents,
  getTrainerCourses,
  getStudentCourseProgress,
  uploadTrainerContent,
  proposeCourse,
  getPendingProposals,
  getExamAnalyticsForTrainer,
} = require('../controllers/trainerController');

// ===============================
// Trainer Main Routes
// ===============================
router.get('/batches', auth, roleMiddleware.isTrainer, getTrainerBatches);
router.get('/batches/:id/students', auth, roleMiddleware.isTrainer, getBatchStudents);
router.get('/courses', auth, roleMiddleware.isTrainer, getTrainerCourses);

// Trainer: Get exam analytics for a batch (trainer-only)
router.get('/exams/:examId/analytics', auth, roleMiddleware.isTrainer, getExamAnalyticsForTrainer);

router.get(
  '/students/:studentId/courses/:courseId/progress',
  auth,
  roleMiddleware.isTrainer,
  getStudentCourseProgress
);

router.post(
  '/courses/:courseId/weeks/:weekId/days/:dayId/content',
  auth,
  roleMiddleware.isTrainer,
  uploadTrainerContent
);

// Proposals
router.post('/courses/propose', auth, roleMiddleware.isTrainer, proposeCourse);
router.get('/courses/pending', auth, roleMiddleware.isTrainer, getPendingProposals);


// ===============================
// ⭐ Rewatch Request Routes
// ===============================
const {
  getPendingRequests,
  approveRewatch,
  rejectRewatch
} = require('../controllers/rewatchRequestController');

// Trainer views pending rewatch requests
// ⭐ Trainer Gets All Pending Requests
router.get('/rewatch/pending', auth, roleMiddleware.isTrainer, getPendingRequests);

// ⭐ Trainer Approves a Request
router.post('/rewatch/approve/:id', auth, roleMiddleware.isTrainer, approveRewatch);

// ⭐ Trainer Rejects a Request
router.post('/rewatch/reject/:id', auth, roleMiddleware.isTrainer, rejectRewatch);



// ===============================
module.exports = router;
