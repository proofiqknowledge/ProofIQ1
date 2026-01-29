const PointsConfig = require('../models/PointsConfig');
const User = require('../models/User');
const PointsHistory = require('../models/PointsHistory');

/**
 * GET /api/points-config
 * Fetch all points configuration
 * Access: All authenticated users (read-only for non-admins)
 */
exports.getPointsConfig = async (req, res) => {
    try {
        const configs = await PointsConfig.find({ enabled: true })
            .sort({ activityType: 1 })
            .select('-__v')
            .lean();

        res.json({
            success: true,
            data: configs,
        });
    } catch (error) {
        console.error('Error fetching points config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch points configuration'
        });
    }
};

/**
 * POST /api/points-config
 * Create a new activity type with points
 * Access: Admin/Master only
 */
exports.createPointsConfig = async (req, res) => {
    try {
        const { activityType, points, description } = req.body;

        // Validation
        if (!activityType || !description) {
            return res.status(400).json({
                success: false,
                message: 'Activity type and description are required'
            });
        }

        if (points === undefined || points === null) {
            return res.status(400).json({
                success: false,
                message: 'Points value is required'
            });
        }

        const pointsNum = Number(points);
        if (isNaN(pointsNum) || pointsNum < 0) {
            return res.status(400).json({
                success: false,
                message: 'Points must be a non-negative number'
            });
        }

        // Check if activity type already exists
        const existing = await PointsConfig.findOne({
            activityType: activityType.toLowerCase().trim()
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Activity type already exists'
            });
        }

        // Create new configuration
        const config = await PointsConfig.create({
            activityType: activityType.toLowerCase().trim(),
            points: pointsNum,
            description: description.trim(),
            enabled: true,
            updatedBy: req.user.id,
        });

        console.log(`✅ New activity type created by ${req.user.role}: ${activityType} = ${pointsNum} points`);

        res.status(201).json({
            success: true,
            message: 'Activity type created successfully',
            data: config,
        });
    } catch (error) {
        console.error('Error creating points config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create activity type'
        });
    }
};

/**
 * PUT /api/points-config/:activityType
 * Update points for a specific activity
 * Access: Admin/Master only
 */
exports.updatePointsConfig = async (req, res) => {
    try {
        const { activityType } = req.params;
        const { points } = req.body;

        // Validation
        if (points === undefined || points === null) {
            return res.status(400).json({
                success: false,
                message: 'Points value is required'
            });
        }

        const pointsNum = Number(points);
        if (isNaN(pointsNum) || pointsNum < 0) {
            return res.status(400).json({
                success: false,
                message: 'Points must be a non-negative number'
            });
        }

        // Find and update configuration
        const config = await PointsConfig.findOneAndUpdate(
            { activityType: activityType.toLowerCase().trim() },
            {
                points: pointsNum,
                updatedBy: req.user.id,
                updatedAt: new Date(),
            },
            { new: true, runValidators: true }
        );

        if (!config) {
            return res.status(404).json({
                success: false,
                message: `Activity type '${activityType}' not found`
            });
        }

        console.log(`✅ Points config updated by ${req.user.role}: ${activityType} = ${pointsNum} points`);

        res.json({
            success: true,
            message: 'Points configuration updated successfully',
            data: config,
        });
    } catch (error) {
        console.error('Error updating points config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update points configuration'
        });
    }
};

/**
 * POST /api/points-config/recalculate
 * Recalculate all users' reward points based on current configuration
 * Access: Admin/Master only
 * 
 * WARNING: This is a heavy operation. Use with caution.
 */
exports.recalculateAllPoints = async (req, res) => {
    try {
        console.log(`🔄 Starting points recalculation (initiated by ${req.user.role})`);

        // Fetch current points configuration
        const configs = await PointsConfig.find({ enabled: true }).lean();
        const pointsMap = {};
        configs.forEach(config => {
            pointsMap[config.activityType] = config.points;
        });

        // Fetch all points history records
        const history = await PointsHistory.find().lean();

        // Group by user and recalculate
        const userPoints = {};
        history.forEach(record => {
            const userId = record.userId.toString();

            // Determine activity type from reason (this is simplified - adjust based on your data)
            let activityType = 'module_completion'; // default
            if (record.reason.toLowerCase().includes('module')) {
                activityType = 'module_completion';
            } else if (record.reason.toLowerCase().includes('video')) {
                activityType = 'video_watch';
            } else if (record.reason.toLowerCase().includes('article')) {
                activityType = 'article_read';
            } else if (record.reason.toLowerCase().includes('certif')) {
                activityType = 'certification';
            } else if (record.reason.toLowerCase().includes('assessment')) {
                activityType = 'assessment_pass';
            } else if (record.reason.toLowerCase().includes('mock')) {
                activityType = 'mock_test';
            }

            const points = pointsMap[activityType] || record.points; // fallback to original

            if (!userPoints[userId]) {
                userPoints[userId] = 0;
            }
            userPoints[userId] += points;
        });

        // Batch update users
        const bulkOps = Object.entries(userPoints).map(([userId, points]) => ({
            updateOne: {
                filter: { _id: userId },
                update: { $set: { rewardPoints: points } },
            },
        }));

        if (bulkOps.length > 0) {
            await User.bulkWrite(bulkOps);
        }

        console.log(`✅ Recalculated points for ${bulkOps.length} users`);

        res.json({
            success: true,
            message: `Points recalculated successfully for ${bulkOps.length} users`,
            usersUpdated: bulkOps.length,
        });
    } catch (error) {
        console.error('Error recalculating points:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to recalculate points'
        });
    }
};
