const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const { claimPoints } = require('../controllers/pointsController');

// POST /api/points/claim
router.post('/claim', protect, claimPoints);

module.exports = router;
