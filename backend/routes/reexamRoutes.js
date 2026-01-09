const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const reexamController = require('../controllers/reexamController');

// Student: Create a re-exam request
router.post('/request', auth, roleMiddleware.isStudent, reexamController.createRequest);

// Admin: Get all re-exam requests
router.get('/all', auth, roleMiddleware.isAdmin, reexamController.getAllRequests);

// Get re-exam request by ID
router.get('/:id', auth, reexamController.getRequestById);

// Get re-exam request status for a specific student and exam
router.get('/status/:studentId/:examId', auth, reexamController.getRequestStatus);

// Admin: Approve a re-exam request
router.patch('/approve/:id', auth, roleMiddleware.isAdmin, reexamController.approveRequest);

// Admin: Reject a re-exam request
router.patch('/reject/:id', auth, roleMiddleware.isAdmin, reexamController.rejectRequest);

module.exports = router;
