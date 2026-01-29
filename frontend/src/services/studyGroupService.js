import api from './api';

// Get eligible students to invite
export const getStudentsForInvite = async () => {
    const response = await api.get('/study-groups/students');
    return response.data;
};

// Send a study invite
export const sendStudyRequest = async (toUserId, groupId = null, message = '') => {
    const response = await api.post('/study-groups/request', { toUserId, groupId, message });
    return response.data;
};

// Get my pending requests
export const getMyRequests = async () => {
    const response = await api.get('/study-groups/requests');
    return response.data;
};

// Respond to a request
export const respondToRequest = async (requestId, status) => {
    const response = await api.put(`/study-groups/request/${requestId}`, { status });
    return response.data;
};

// Get my groups
export const getMyGroups = async () => {
    const response = await api.get('/study-groups');
    return response.data;
};

// Update group name
export const updateGroup = async (groupId, name) => {
    const response = await api.put(`/study-groups/${groupId}`, { name });
    return response.data;
};

// Leave a group
export const leaveGroup = async (groupId) => {
    const response = await api.delete(`/study-groups/${groupId}/leave`);
    return response.data;
};

// Admin: Get all groups
export const getAllGroupsAdmin = async () => {
    const response = await api.get('/study-groups/admin/all');
    return response.data;
};

// Admin: Add member
export const addMemberAdmin = async (groupId, userId) => {
    const response = await api.post(`/study-groups/admin/${groupId}/member`, { userId });
    return response.data;
};

// Admin: Remove member
export const removeMemberAdmin = async (groupId, userId) => {
    const response = await api.delete(`/study-groups/admin/${groupId}/member`, { data: { userId } });
    return response.data;
};
