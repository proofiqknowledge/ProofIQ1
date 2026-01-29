const mongoose = require('mongoose');
const User = require('../models/User');
const PointsHistory = require('../models/PointsHistory');

// POST /api/points/claim
// body: { courseId, weekNumber }
exports.claimPoints = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const userId = req.user?.id;
    const { courseId, weekNumber } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!courseId || weekNumber === undefined || weekNumber === null) {
      return res.status(400).json({ message: 'courseId and weekNumber are required' });
    }

    const wk = Number(weekNumber);
    if (Number.isNaN(wk)) return res.status(400).json({ message: 'Invalid weekNumber' });

    let updatedUser = null;

    await session.withTransaction(async () => {
      // Re-fetch user inside transaction
      const user = await User.findById(userId).session(session);
      if (!user) throw new Error('User not found');

      // Find the enrolled course entry
      const enrolled = (user.enrolledCourses || []).find(ec => String(ec.courseId) === String(courseId) || (ec.courseId && String(ec.courseId._id) === String(courseId)));
      if (!enrolled) throw new Error('Not enrolled in course');

      // Ensure the module/week is completed
      const completedWeeks = Array.isArray(enrolled.completedWeeks) ? enrolled.completedWeeks.map(n => Number(n)) : [];
      if (!completedWeeks.includes(wk)) {
        const e = new Error('Module not completed yet');
        e.status = 400;
        throw e;
      }

      // Ensure not already claimed
      const claimed = Array.isArray(enrolled.completedWeeksPointsClaimed) ? enrolled.completedWeeksPointsClaimed.map(n => Number(n)) : [];
      if (claimed.includes(wk)) {
        const e = new Error('Points already claimed for this module');
        e.status = 400;
        throw e;
      }

      // Award points dynamically based on configuration
      const PointsConfig = require('../models/PointsConfig');
      const config = await PointsConfig.findOne({
        activityType: 'module_completion',
        enabled: true
      }).session(session);

      const award = config?.points || 100; // fallback to 100 for safety
      user.rewardPoints = (user.rewardPoints || 0) + award;

      // Mark this week as claimed
      if (!Array.isArray(enrolled.completedWeeksPointsClaimed)) enrolled.completedWeeksPointsClaimed = [];
      enrolled.completedWeeksPointsClaimed.push(wk);

      // Save user within transaction
      await user.save({ session });

      // Create PointsHistory audit record
      await PointsHistory.create([{ userId: user._id, points: award, reason: 'Module Completion Reward', meta: { courseId, weekNumber: wk } }], { session });

      updatedUser = user;
    });

    // Clear leaderboard cache since points changed
    const { clearLeaderboardCache } = require('./leaderboardController');
    clearLeaderboardCache();

    // Return updated points and info
    return res.status(200).json({ success: true, rewardPoints: updatedUser.rewardPoints, claimedWeek: wk });
  } catch (err) {
    console.error('Error in claimPoints:', err);
    if (res.headersSent) return; // transaction helper may have sent response for some early checks
    const status = err.status && Number.isInteger(err.status) ? err.status : 500;
    return res.status(status).json({ message: err.message || 'Server error' });
  } finally {
    session.endSession();
  }
};
