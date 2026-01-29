const mongoose = require('mongoose');
const PointsConfig = require('../models/PointsConfig');

/**
 * Seed Points Configuration
 * 
 * Populates the PointsConfig collection with initial activity-point mappings.
 * Run this script once during initial setup or when adding new activity types.
 */

const defaultPointsConfig = [
    {
        activityType: 'module_completion',
        points: 100,
        description: 'Points awarded for completing a course module/week',
        enabled: true,
    },
    {
        activityType: 'video_watch',
        points: 50,
        description: 'Points awarded for watching a video',
        enabled: true,
    },
    {
        activityType: 'article_read',
        points: 500,
        description: 'Points awarded for reading an article',
        enabled: true,
    },
    {
        activityType: 'certification',
        points: 1000,
        description: 'Points awarded for earning a certification',
        enabled: true,
    },
    {
        activityType: 'assessment_pass',
        points: 200,
        description: 'Points awarded for passing an assessment',
        enabled: true,
    },
    {
        activityType: 'mock_test',
        points: 50,
        description: 'Points awarded for completing a mock test',
        enabled: true,
    },
];

const seedPointsConfig = async () => {
    try {
        console.log('🌱 Seeding Points Configuration...');

        // Check if already seeded
        const existingCount = await PointsConfig.countDocuments();
        if (existingCount > 0) {
            console.log(`✅ Points Configuration already seeded (${existingCount} entries found)`);
            return;
        }

        // Insert default configurations
        await PointsConfig.insertMany(defaultPointsConfig);
        console.log(`✅ Successfully seeded ${defaultPointsConfig.length} points configurations`);

        // Display created configs
        defaultPointsConfig.forEach(config => {
            console.log(`   - ${config.activityType}: ${config.points} points`);
        });

    } catch (error) {
        console.error('❌ Error seeding points configuration:', error.message);
        // Don't throw - allow server to continue starting
    }
};

module.exports = seedPointsConfig;
