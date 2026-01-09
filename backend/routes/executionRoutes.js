const express = require('express');
const router = express.Router();
const { executeCodeController } = require('../controllers/executionController');

// POST /api/code/execute
router.post('/execute', executeCodeController);

module.exports = router;
