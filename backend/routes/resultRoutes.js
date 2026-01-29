const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const resultController = require('../controllers/resultController');

router.post('/submit', auth, roleMiddleware.isStudent, resultController.submitCodingExam);

module.exports = router;
