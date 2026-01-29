import api from './api';

/**
 * Create a re-exam request
 */
export const createReExamRequest = async (payload) => {
  const response = await api.post('/reexam/request', payload);
  return response.data;
};

/**
 * Get all re-exam requests (admin only)
 */
export const getAllReExamRequests = async (status = null, page = 1, limit = 10) => {
  const params = { page, limit };
  if (status) params.status = status;
  const response = await api.get('/reexam/all', { params });
  return response.data;
};

/**
 * Get re-exam request by ID
 */
export const getReExamRequestById = async (id) => {
  const response = await api.get(`/reexam/${id}`);
  return response.data;
};

/**
 * Get re-exam request status for a specific student and exam
 */
export const getReExamRequestStatus = async (studentId, examId) => {
  const response = await api.get(`/reexam/status/${studentId}/${examId}`);
  return response.data;
};

/**
 * Approve a re-exam request
 */
export const approveReExamRequest = async (id) => {
  const response = await api.patch(`/reexam/approve/${id}`);
  return response.data;
};

/**
 * Reject a re-exam request
 */
export const rejectReExamRequest = async (id, reason = null) => {
  const response = await api.patch(`/reexam/reject/${id}`, { reason });
  return response.data;
};

export default {
  createReExamRequest,
  getAllReExamRequests,
  getReExamRequestById,
  getReExamRequestStatus,
  approveReExamRequest,
  rejectReExamRequest,
};
