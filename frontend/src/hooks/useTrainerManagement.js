import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';

export const useTrainerManagement = () => {
  const { token } = useSelector(state => state.auth);
  const auth = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [courseContent, setCourseContent] = useState(null);
  const [trainerCourses, setTrainerCourses] = useState([]);

  // ✅ Common auth check
  const ensureAuth = () => {
    if (!token) {
      setError('No authentication token available');
      console.error('❌ Missing token');
      return false;
    }
    return true;
  };

  // ============================
  // 📦 Fetch trainer's assigned batches
  // ============================
  const fetchTrainerBatches = useCallback(async () => {
    if (!ensureAuth()) return;
    setLoading(true);
    try {
      const response = await api.get('/trainers/batches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBatches(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching trainer batches:', err);
      setError('Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ============================
  // 🎓 Fetch trainer's assigned courses
  // ============================
  const fetchTrainerCourses = useCallback(async () => {
    if (!ensureAuth()) return;
    setLoading(true);
    try {
      const response = await api.get('/trainers/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrainerCourses(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching trainer courses:', err);
      setError('Failed to fetch trainer courses');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ============================
  // 👩‍🎓 Fetch students of a batch
  // ============================
  const fetchBatchStudents = useCallback(async (batchId) => {
    if (!ensureAuth()) return;
    setLoading(true);
    try {
      const response = await api.get(`/trainers/batches/${batchId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBatchStudents(response.data || []);
      setSelectedBatch(batchId);
      setError(null);
    } catch (err) {
      console.error('Error fetching batch students:', err);
      setError('Failed to fetch batch students');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ============================
  // 📤 Propose new content (Module/Topic based)
  // ============================
  const proposeContent = useCallback(async (courseId, week, day, file, overview, title) => {
    // Mapping: courseId -> course, week -> week number, day -> day number
    if (!ensureAuth()) return { success: false, error: 'No authentication token available' };

    setLoading(true);
    try {
      const formData = new FormData();
      if (file) formData.append('document', file);
      // Required fields for backend
      formData.append('course', courseId);
      if (week !== undefined && week !== null) formData.append('week', String(week));
      if (day !== undefined && day !== null) formData.append('day', String(day));
      if (title) formData.append('title', title);
      if (overview) formData.append('overview', overview);

      const response = await api.post(`/course-content-proposals/propose`, formData);

      console.log('✅ Proposal created:', response.data);
      setError(null);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('❌ Proposal error:', err.response?.data || err.message);
      setError('Failed to propose content');
      return { success: false, error: err.response?.data?.message || 'Failed to propose content' };
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ============================
  // 📚 Fetch course content (Module/Topic)
  // ============================
  const fetchCourseContent = useCallback(async (courseId) => {
    if (!ensureAuth()) return;
    setLoading(true);
    try {
      const response = await api.get(`/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourseContent(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching course content:', err);
      setError('Failed to fetch course content');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ============================
  // 📈 Get student progress (for trainer)
  // ============================
  const getStudentProgress = useCallback(async (studentId, courseId) => {
    if (!ensureAuth()) return null;
    try {
      const response = await api.get(
  `/progress/${studentId}/course/${courseId}`,
  {
    headers: { Authorization: `Bearer ${auth.token}` }
  }
);

      return response.data;
    } catch (err) {
      console.error('Failed to fetch student progress:', err.response?.data || err.message);
      return null;
    }
  }, [token]);

  // ============================
  // ✏️ Update existing course content
  // ============================
  const updateContent = useCallback(async (courseId, moduleId, topicId, contentData) => {
    if (!ensureAuth()) return false;
    setLoading(true);
    try {
      await api.put(
        `/trainers/courses/${courseId}/modules/${moduleId}/topics/${topicId}/content`,
        contentData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setError(null);
      return true;
    } catch (err) {
      console.error('Error updating content:', err);
      setError('Failed to update content');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ============================
  // 🗑️ Delete course content
  // ============================
  const deleteContent = useCallback(async (courseId, moduleId, topicId, contentType) => {
    if (!ensureAuth()) return false;
    setLoading(true);
    try {
      await api.delete(
        `/trainers/courses/${courseId}/modules/${moduleId}/topics/${topicId}/content/${contentType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setError(null);
      return true;
    } catch (err) {
      console.error('Error deleting content:', err);
      setError('Failed to delete content');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // ============================
  // 🔗 Get content URL
  // ============================
  const getContentUrl = useCallback(async (courseId, moduleId, topicId, contentType) => {
    if (!ensureAuth()) return null;
    try {
      const response = await api.get(
        `/trainers/courses/${courseId}/modules/${moduleId}/topics/${topicId}/content/${contentType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data.url;
    } catch (err) {
      console.error('Error getting content URL:', err);
      setError('Failed to get content URL');
      return null;
    }
  }, [token]);

  // ✅ Return all trainer functions and state
  return {
    loading,
    error,
    batches,
    selectedBatch,
    batchStudents,
    courseContent,
    trainerCourses,
    fetchTrainerBatches,
    fetchBatchStudents,
    proposeContent,
    fetchCourseContent,
    fetchTrainerCourses,
    getStudentProgress,
    updateContent,
    deleteContent,
    getContentUrl,
  };
};
