const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const adminOnly = require('../middlewares/adminOnly');
const {
    getPointsConfig,
    createPointsConfig,
    updatePointsConfig,
    recalculateAllPoints,
} = require('../controllers/pointsConfigController');

// GET /api/points-config - All authenticated users
router.get('/', protect, getPointsConfig);

// POST /api/points-config - Admin/Master only (Create new activity type)
router.post('/', protect, adminOnly, createPointsConfig);

// PUT /api/points-config/:activityType - Admin/Master only
router.put('/:activityType', protect, adminOnly, updatePointsConfig);

// POST /api/points-config/recalculate - Admin/Master only
router.post('/recalculate', protect, adminOnly, recalculateAllPoints);

module.exports = router;
