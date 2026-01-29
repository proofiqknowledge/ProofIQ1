const mongoose = require('mongoose');

/**
 * Points Configuration Model
 * 
 * Stores configurable point values for different activity types.
 * Enables Admin/Master to update points without code changes.
 */
const pointsConfigSchema = new mongoose.Schema({
    activityType: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
        lowercase: true,
    },
    points: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    description: {
        type: String,
        required: true,
    },
    enabled: {
        type: Boolean,
        default: true,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, { timestamps: true });

// Index for quick lookups by activity type
pointsConfigSchema.index({ activityType: 1 });

module.exports = mongoose.model('PointsConfig', pointsConfigSchema);
