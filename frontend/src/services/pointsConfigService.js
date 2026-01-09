import api from './api';

/**
 * Points Configuration Service
 * Handles API calls for points configuration management
 */

/**
 * Get all points configuration
 * @returns {Promise<Array>} Array of points config objects
 */
export const getPointsConfig = async () => {
    const response = await api.get('/points-config');
    return response.data.data;
};

/**
 * Create a new activity type
 * @param {string} activityType - The activity type identifier
 * @param {number} points - The point value
 * @param {string} description - Description of the activity
 * @returns {Promise<Object>} Created config object
 */
export const createPointsConfig = async (activityType, points, description) => {
    const response = await api.post('/points-config', { activityType, points, description });
    return response.data.data;
};

/**
 * Update points for a specific activity type
 * @param {string} activityType - The activity type to update
 * @param {number} points - The new point value
 * @returns {Promise<Object>} Updated config object
 */
export const updatePointsConfig = async (activityType, points) => {
    const response = await api.put(`/points-config/${activityType}`, { points });
    return response.data.data;
};

/**
 * Recalculate all users' points based on current configuration
 * @returns {Promise<Object>} Recalculation result
 */
export const recalculateAllPoints = async () => {
    const response = await api.post('/points-config/recalculate');
    return response.data;
};
