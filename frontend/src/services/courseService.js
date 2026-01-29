import api from './api';

// Existing functions
export const fetchCourses = async () => {
  const res = await api.get('/courses');
  return res.data;
};

export const fetchCourseDetail = async (id) => {
  const res = await api.get(`/courses/${id}`);
  return res.data;
};
export const uploadCourseImage = async (courseId, imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await api.post(`/courses/${courseId}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
// ------------------------
// New functions for Assign Batch
// ------------------------

// Fetch all batches
export const getAllBatches = async () => {
  const res = await api.get('/batches'); // your backend route to get batches
  return res.data;
};

// Assign a course to a batch
export const assignCourseToBatch = async (courseId, batchId) => {
  const res = await api.post(`/courses/${courseId}/assign-batch`, {
    batchId,
  });
  return res.data;
};

export const deleteCourse = async (courseId) => {
  const response = await api.delete(`/courses/${courseId}`);
  return response.data;
};

// Update module name (previously week name)
export const updateModuleName = async (courseId, weekNumber, data) => {
  const response = await api.put(
    `/courses/${courseId}/week/${weekNumber}/name`,
    data
  );
  return response.data;
};

// Update a topic (day) in a module
export const updateDayInWeek = async (courseId, weekNumber, dayNumber, data) => {
  const response = await api.put(
    `/courses/${courseId}/week/${weekNumber}/day/${dayNumber}`,
    data
  );
  return response.data;
};

// Update day name
export const updateDayName = async (courseId, weekNumber, dayNumber, data) => {
  const response = await api.put(
    `/courses/${courseId}/week/${weekNumber}/day/${dayNumber}/name`,
    data
  );
  return response.data;
};

// Add new day to week
export const addDayToWeek = async (courseId, weekNumber, data) => {
  const response = await api.post(
    `/courses/${courseId}/week/${weekNumber}/day`,
    data
  );
  return response.data;
};

// Delete day from week
export const deleteDayFromWeek = async (courseId, weekNumber, dayNumber) => {
  const response = await api.delete(
    `/courses/${courseId}/week/${weekNumber}/day/${dayNumber}`
  );
  return response.data;
};

// Get week details
export const getWeekDetails = async (courseId, weekNumber) => {
  const response = await api.get(`/courses/${courseId}/week/${weekNumber}`);
  return response.data;
};

// Update course stay duration (admin only)
export const updateCourseStayDuration = (courseId, data) =>
  api.put(`/courses/${courseId}/stay-duration`, data);

// Reorder days in a week
export const reorderDays = async (courseId, weekNumber, newDayIds) => {
  const response = await api.put(
    `/courses/${courseId}/week/${weekNumber}/reorder-days`,
    { newDayIds }
  );
  return response.data;
};
