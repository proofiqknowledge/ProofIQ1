const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const {
    getStudentsForInvite,
    sendStudyRequest,
    getMyRequests,
    respondToRequest,
    getMyGroups,
    updateGroup,
    leaveGroup,
    getAllGroupsAdmin,
    addMemberAdmin,
    removeMemberAdmin
} = require('../controllers/studyGroupController');

// ==========================================
// Student Routes
// ==========================================

// Get eligible students to invite (Same batch, student role)
router.get('/students', auth, getStudentsForInvite);

// Send a study invite (to user or group)
router.post('/request', auth, sendStudyRequest);

// Get my pending requests (invites received)
router.get('/requests', auth, getMyRequests);

// Respond to a request (Accept/Reject)
router.put('/request/:requestId', auth, respondToRequest);

// Get my groups
router.get('/', auth, getMyGroups);

// Update group name
router.put('/:groupId', auth, updateGroup);

// Leave a group
router.delete('/:groupId/leave', auth, leaveGroup);

// ==========================================
// Admin Routes
// ==========================================

// Get all groups
router.get('/admin/all', auth, roleMiddleware.isAdmin, getAllGroupsAdmin);

// Manual Member Management
router.post('/admin/:groupId/member', auth, roleMiddleware.isAdmin, addMemberAdmin);
router.delete('/admin/:groupId/member', auth, roleMiddleware.isAdmin, removeMemberAdmin);

module.exports = router;
