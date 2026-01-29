const express = require('express');
const router = express.Router();
const {
  getStudentProgress,
  getAllStudentsProgress,
  getCourseProgress,
} = require('../controllers/progressController');
const auth = require('../middlewares/authMiddleware');
const { isAdmin, isStudent } = require('../middlewares/roleMiddleware');

// Get progress for a specific student
// Students can only access their own progress; admins can access any
router.get('/:studentId', auth, getStudentProgress);

// Get course-specific progress for a student
// Students can only access their own progress; admins/trainers can access any
router.get('/:studentId/course/:courseId', auth, getCourseProgress);

// Get all students' progress (Admin only)
router.get('/admin/all/progress', auth, isAdmin, getAllStudentsProgress);


module.exports = router;
