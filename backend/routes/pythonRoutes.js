const express = require('express');
const router = express.Router();
const { executePythonController } = require('../controllers/pythonController');

// POST /api/python/execute-and-visualize
router.post('/execute-and-visualize', executePythonController);

module.exports = router;
