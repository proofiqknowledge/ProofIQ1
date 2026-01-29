import api from './api';

// Base path for backend course-content-proposals endpoints (api baseURL already contains /api)
const API_URL = "/course-content-proposals";



/**
 * Fetch all pending content proposals (Admin use)
 */
export const getPendingProposals = async () => {
  const response = await axios.get(`${API_URL}/pending`);
  return response.data;
};

/**
 * Fetch a single proposal by ID (for “View” modal)
 */
export const getProposalById = async (id) => {
  if (!id) throw new Error("Proposal ID is required");
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

/**
 * Review a proposal (accept/reject)
 * @param {{ proposalId: string, status: "accepted" | "rejected" }} payload
 */
export const reviewProposal = async (payload) => {
  // payload: { proposalId, status, feedback? }
  const response = await api.post(`${API_URL}/admin/review`, payload);
  return response.data;
};

/**
 * Trainer submits a new content proposal
 */
export const proposeCourseContent = async (payload) => {
  // payload may be FormData (with file); use api instance so interceptors set headers correctly
  const response = await api.post(`${API_URL}/propose`, payload);
  return response.data;
};
