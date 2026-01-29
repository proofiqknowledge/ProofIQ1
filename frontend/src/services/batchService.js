import api from './api';

// Get all batches
export const getAllBatches = async () => {
  const res = await api.get('/batches');
  return res.data;
};

// Get batches for the logged-in trainer
export const getTrainerBatches = async () => {
  const res = await api.get('/trainers/batches');
  return res.data;
};

// Get batches with student counts
export const getBatchesWithCount = async () => {
  const res = await api.get('/batches/with-counts');
  return res.data;
};

// Get single batch
export const getBatch = async (batchId) => {
  const res = await api.get(`/batches/${batchId}`);
  return res.data;
};

// Get batch students
export const getBatchStudents = async (batchId) => {
  const res = await api.get(`/batches/${batchId}/students`);
  return res.data;
};

// Create batch
export const createBatch = async (batchData) => {
  const res = await api.post('/batches', batchData);
  return res.data;
};

// Update batch
export const updateBatch = async (batchId, batchData) => {
  const res = await api.put(`/batches/${batchId}`, batchData);
  return res.data;
};

// Delete batch
export const deleteBatch = async (batchId) => {
  const res = await api.delete(`/batches/${batchId}`);
  return res.data;
};

// Assign user to batch
export const assignUserToBatch = async (batchId, userId) => {
  const res = await api.post(`/batches/${batchId}/assign-user`, { userId });
  return res.data;
};

// Remove user from batch
export const removeUserFromBatch = async (batchId, userId) => {
  const res = await api.post(`/batches/${batchId}/remove-user`, { userId });
  return res.data;
};

// Create batch from Excel
export const createBatchFromExcel = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/batches/create-with-excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

// Add students to batch from Excel
export const addStudentsFromExcel = async (batchId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post(`/batches/${batchId}/add-from-excel`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

// Remove student from batch
export const removeStudent = async (batchId, studentId) => {
  const res = await api.put(`/batches/${batchId}/remove-student`, { studentId });
  return res.data;
};

export default {
  getAllBatches,
  getBatchesWithCount,
  getBatch,
  getBatchStudents,
  createBatch,
  updateBatch,
  deleteBatch,
  assignUserToBatch,
  removeUserFromBatch,
  createBatchFromExcel,
  addStudentsFromExcel,
  removeStudent,
};
