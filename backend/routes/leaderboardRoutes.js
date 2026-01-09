const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { getLeaderboard, getUserRank } = require('../controllers/leaderboardController');

router.get('/', auth, getLeaderboard);
router.get('/me', auth, getUserRank);

module.exports = router;
