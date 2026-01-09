const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const adminExamController = require('../controllers/adminExamController');
const examController = require('../controllers/examController');

router.get('/:examId/analytics', auth, roleMiddleware.isAdmin, adminExamController.getExamAnalytics);

// NEW: Generate template for advanced coding questions
router.post('/generate-template', auth, roleMiddleware.isAdmin, examController.generateTemplate);

module.exports = router;
