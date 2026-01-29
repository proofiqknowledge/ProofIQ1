import api from './api';

// ============================
// 🔹 Fetch progress for a student (used in StudentDashboard)
// ============================
export const fetchStudentProgress = async (studentId) => {
  const response = await api.get(`/progress/${studentId}`);
  return response.data;
};

// ============================
// 🔹 Fetch progress for a specific course (used for detailed view)
// ============================
export const fetchCourseProgress = async (studentId, courseId) => {
  const response = await api.get(`/progress/${studentId}/course/${courseId}`);
  return response.data;
};

// ============================
// 🔹 Fetch progress for all students (Admin Dashboard)
// ============================
export const fetchAllStudentsProgress = async () => {
  const response = await api.get('/progress/admin/all/progress');
  return response.data;
};
