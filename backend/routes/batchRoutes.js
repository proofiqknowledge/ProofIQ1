const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// ✅ Import all functions from batchController
const {
  createBatch,
  getAllBatches,
  getBatch,
  updateBatch,
  deleteBatch,
  setBatchAccessDuration,
  assignUserToBatch,
  removeUserFromBatch,
  getBatchStudents,
  getBatchesWithCount,
  createBatchWithExcel,  // ✅ ADDED
  addStudentsFromExcel,  // ✅ ADDED
  getBatchesProgressDashboard, // new
  removeStudentFromBatch // ✅ ADDED
} = require('../controllers/batchController');

// ✅ Import uploadExcel middleware
const { uploadExcel } = require('../utils/uploadHandler');

// =========================================
// ===== SPECIFIC ROUTES FIRST (BEFORE :id) =====
// =========================================

// GET batches with student counts
router.get('/with-counts', auth, roleMiddleware.isAdmin, getBatchesWithCount);

// GET batches progress dashboard (trainer/admin)
router.get('/progress-dashboard', auth, getBatchesProgressDashboard);

// GET students in a specific batch (MUST BE BEFORE /:id)
router.get('/:id/students', auth, roleMiddleware.isAdmin, getBatchStudents);

// =========================================
// ===== GENERAL GET ROUTES =====
// =========================================

// GET all batches
router.get('/', auth, getAllBatches);

// GET single batch by id (LAST - catches all remaining :id patterns)
router.get('/:id', auth, getBatch);

// =========================================
// ===== POST ROUTES =====
// =========================================

// POST create batch (without Excel)
router.post('/', auth, roleMiddleware.isAdmin, createBatch);

// POST create batch using uploaded Excel file ✅ FIXED
router.post(
  '/create-with-excel',
  auth,
  roleMiddleware.isAdmin,
  uploadExcel.single('file'),
  createBatchWithExcel
);

// POST add students to existing batch using uploaded Excel file ✅ FIXED
router.post(
  '/:id/add-from-excel',
  auth,
  roleMiddleware.isAdmin,
  uploadExcel.single('file'),
  addStudentsFromExcel
);

// =========================================
// ===== PUT ROUTES =====
// =========================================

// PUT update batch
router.put('/:id', auth, roleMiddleware.isAdmin, updateBatch);

// PUT set per-batch course access duration (admin only)
router.put('/:id/access-duration', auth, roleMiddleware.isAdmin, setBatchAccessDuration);

// =========================================
// ===== DELETE ROUTES =====
// =========================================

// DELETE batch
router.delete('/:id', auth, roleMiddleware.isAdmin, deleteBatch);

// =========================================
// ===== BATCH USER MANAGEMENT =====
// =========================================

// POST assign user to batch
router.post('/:id/assign-user', auth, roleMiddleware.isAdmin, assignUserToBatch);

// POST remove user from batch
router.post('/:id/remove-user', auth, roleMiddleware.isAdmin, removeUserFromBatch);


// Remove student from batch (Admin/Master only)
router.put('/:id/remove-student', auth, roleMiddleware.isAdmin, removeStudentFromBatch);

module.exports = router;

