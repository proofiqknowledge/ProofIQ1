const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const { excelUpload } = require('../utils/uploadMiddleware');
const {
  getMe,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserDashboard,
  getAdminUserDetail,
  recomputeEnrollmentProgress,
  bulkCreateUsers,
  createSingleUser,
  getUnassignedStudents,
  assignStudentToBatch,
  getLeaderboard,
  blockUser,
  unblockUser
} = require('../controllers/userController');

if (!getLeaderboard) {
  console.error("❌ CRITICAL ERROR: getLeaderboard is undefined in userRoutes.js. Check userController.js exports.");
} else {
  console.log("✅ getLeaderboard function imported successfully in userRoutes.js");
}

// Get current logged-in user
router.get('/me', auth, getMe);

// Leaderboard (Must be before /:id)
router.get('/leaderboard', auth, getLeaderboard);

// Debug: get enrolled courses for current user (protected)
router.get('/me/enrolled', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('enrolledCourses').populate('enrolledCourses.courseId', 'title');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ enrolledCourses: user.enrolledCourses });
  } catch (err) {
    console.error('Error fetching enrolled courses for debug:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// User dashboard routes
router.get('/dashboard', auth, getUserDashboard); // Generic dashboard
router.get('/student/dashboard', auth, roleMiddleware.isStudent, getUserDashboard); // Student dashboard

// ===== SPECIFIC ROUTES FIRST (BEFORE /:id) =====

// Get unassigned students
router.get('/unassigned', auth, roleMiddleware.isAdmin, getUnassignedStudents);

// ===== GENERAL ROUTES =====

// Admin routes
router.get('/admin/:id/dashboard', auth, roleMiddleware.isAdmin, getAdminUserDetail);
// Admin: recompute a user's enrollment progress for a specific course
router.post('/admin/recompute-progress/:userId/:courseId', auth, roleMiddleware.isAdmin, recomputeEnrollmentProgress);
router.get('/', auth, roleMiddleware.isAdmin, getAllUsers);

// Admin bulk operations
router.post('/bulk-upload', auth, roleMiddleware.isAdmin, excelUpload.single('file'), bulkCreateUsers);
router.post('/create', auth, roleMiddleware.isAdmin, createSingleUser);

// Assign student to batch
router.put('/:id/assign-batch', auth, roleMiddleware.isAdmin, (req, res, next) => {
  // Validate batch exists
  if (!req.body.batch) return res.status(400).json({ message: 'Batch ID required' });
  next();
}, assignStudentToBatch);

// ===== DYNAMIC ROUTES (MUST BE LAST) =====

// Get user by id (MUST BE LAST)
router.get('/:id', auth, roleMiddleware.isAdmin, getUserById);

// Update user (admin or self)
router.put('/:id', auth, function (req, res, next) {
  if (req.user.role === 'Admin' || req.user.role === 'Master' || req.user.id === req.params.id) return next();
  return res.status(403).json({ message: "Forbidden: Can only update your own profile" });
}, updateUser);

// Delete user
router.delete('/:id', auth, roleMiddleware.isAdmin, deleteUser);

// Block/Unblock user
router.patch('/:id/block', auth, roleMiddleware.isAdmin, blockUser);
router.patch('/:id/unblock', auth, roleMiddleware.isAdmin, unblockUser);

module.exports = router;