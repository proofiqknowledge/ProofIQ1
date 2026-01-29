// routes/visualizeRoute.js
const express = require('express');
const router = express.Router();
const { visualizeCode } = require('../controllers/visualizeController');

/**
 * POST /api/visualize
 * Execute code with step-by-step visualization
 * Body: { code: string, language: string }
 */
router.post('/', visualizeCode);

module.exports = router;
