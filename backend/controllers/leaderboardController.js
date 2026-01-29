const User = require('../models/User');

// In-memory cache for leaderboard
let leaderboardCache = {
  data: null,
  timestamp: null,
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear leaderboard cache
 * Call this when points are awarded or recalculated
 */
const clearLeaderboardCache = () => {
  leaderboardCache = { data: null, timestamp: null };
  console.log('🗑️ Leaderboard cache cleared');
};

// Export for use in other controllers
exports.clearLeaderboardCache = clearLeaderboardCache;

// Get leaderboard - All users by default, or top N if specified
exports.getLeaderboard = async (req, res) => {
  try {
    const topParam = req.query.top;
    const N = topParam ? parseInt(topParam) : null; // null = no limit, fetch all users

    // Check cache validity
    const now = Date.now();
    const cacheValid = leaderboardCache.data &&
      leaderboardCache.timestamp &&
      (now - leaderboardCache.timestamp) < CACHE_TTL;

    if (cacheValid && (!N || leaderboardCache.data.length >= N)) {
      console.log('✅ Serving leaderboard from cache');
      const result = N ? leaderboardCache.data.slice(0, N) : leaderboardCache.data;
      return res.json(result);
    }

    // Fetch fresh data - fetch all users, including those with 0 points
    console.log('🔄 Fetching fresh leaderboard data');

    // Build query to fetch all users (or top N if specified)
    let query = User.find()
      .sort({ rewardPoints: -1 })
      .select('name role employeeId rewardPoints');

    // Apply limit only if specified
    if (N) {
      query = query.limit(N);
    }

    const users = await query.lean();

    // Add rank
    users.forEach((u, idx) => { u.rank = idx + 1; });

    // Update cache with all fetched users
    leaderboardCache = {
      data: users,
      timestamp: now,
    };

    res.json(users);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get the current user's rank and rewardPoints
exports.getUserRank = async (req, res) => {
  try {
    const leaderboard = await User.find().sort({ rewardPoints: -1 }).select('_id').lean();
    const rank = leaderboard.findIndex(u => u._id.toString() === req.user.id) + 1;
    const user = await User.findById(req.user.id).select('name role rewardPoints');
    res.json({ ...user._doc, rank });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
