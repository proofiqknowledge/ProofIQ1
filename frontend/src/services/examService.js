import api from './api';

// ===== EXAM MANAGEMENT =====

// Get all exams (admin)
export const getAllExams = async () => {
  const res = await api.get('/exams');
  return res.data;
};

// Get exam by ID
export const getExamById = async (examId) => {
  const res = await api.get(`/exams/${examId}`);
  return res.data;
};

// Get admin analytics for exam
export const getExamAnalytics = async (examId) => {
  const res = await api.get(`/admin/exams/${examId}/analytics`);
  return res.data;
};

// Get trainer's analytics for an exam restricted to a batch (trainer only)
export const getExamAnalyticsForTrainer = async (examId, batchId) => {
  const qs = batchId ? `?batchId=${encodeURIComponent(batchId)}` : '';
  const res = await api.get(`/trainers/exams/${examId}/analytics${qs}`);
  return res.data;
};

// Create exam
export const createExam = async (examData) => {
  const res = await api.post('/exams', examData);
  return res.data;
};
export const createPlaceholderExam = async (payload) => {
  const res = await api.post(`/admin/exams/create-placeholder`, payload);
  return res.data;
};

// create a minimal module exam and auto-assign it
export const createModulePlaceholderExam = async (courseId, weekNumber) => {
  const { data } = await api.post('/exams/module-placeholder', {
    courseId,
    weekNumber,
  });
  return data; // backend returns the exam document
};



// Update exam
export const updateExam = async (examId, examData) => {
  const res = await api.put(`/exams/${examId}`, examData);
  return res.data;
};

// Delete exam
export const deleteExam = async (examId) => {
  const res = await api.delete(`/exams/${examId}`);
  return res.data;
};

// Assign exam to users/batches
export const assignExam = async (examId, { userIds = [], batchIds = [] }) => {
  const res = await api.post(`/exams/${examId}/assign`, {
    userIds,
    batchIds,
  });
  return res.data;
};

// ✅ NEW: Un-assign exam from users/batches
export const unassignExam = async (examId, { userIds = [], batchIds = [] }) => {
  const res = await api.delete(`/exams/${examId}/unassign`, {
    data: { userIds, batchIds }
  });
  return res.data;
};

// ✅ NEW: Get exam assignment details
export const getExamAssignments = async (examId) => {
  const res = await api.get(`/exams/${examId}/assignments`);
  return res.data;
};

// ===== STUDENT EXAMS =====

// Get exams assigned to student
export const getAssignedExams = async () => {
  const res = await api.get('/exams/assigned/me');
  return res.data;
};

// Get module exams for a course (student/trainer/admin)
export const getModuleExamsForCourse = async (courseId) => {
  const res = await api.get(`/exams/course/${courseId}/modules`);
  return res.data;
};

// ===== EXAM SUBMISSIONS =====

// Start exam
export const startExam = async (examId) => {
  const res = await api.post(`/exams/${examId}/start`);
  return res.data;
};

// Submit answer to question
export const submitAnswer = async (examId, questionId, answer) => {
  const res = await api.post(`/exams/${examId}/answer/${questionId}`, { answer });
  return res.data;
};

// Submit entire exam
export const submitExam = async (examId, payload = {}) => {
  const res = await api.post(`/exams/${examId}/submit`, payload);
  return res.data;
};

// Get submission status
export const getSubmissionStatus = async (examId) => {
  const res = await api.get(`/exams/${examId}/status`);
  return res.data;
};

// Get exam attempts count for student
export const getExamAttempts = async (examId) => {
  const res = await api.get(`/exams/${examId}/attempts`);
  return res.data;
};

// ===== ADVANCED CODING - TEMPLATE GENERATION =====

/**
 * Generate boilerplate template for advanced coding questions
 * @param {Object} config - Template configuration
 * @returns {Object} Generated template
 */
export const generateTemplate = async (config) => {
  const res = await api.post('/admin/exams/generate-template', config);
  return res.data;
};

export default {
  getAllExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  assignExam,
  unassignExam,  // ✅ NEW
  getExamAssignments,  // ✅ NEW
  getExamAnalytics,
  getExamAnalyticsForTrainer,
  getAssignedExams,
  startExam,
  submitAnswer,
  submitExam,
  getSubmissionStatus,
  getExamAttempts,
  createModulePlaceholderExam,
  getModuleExamsForCourse,
  generateTemplate,
};

