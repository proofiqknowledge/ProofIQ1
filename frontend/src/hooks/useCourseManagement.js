import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setCourses,
  setCurrentCourse,
  setCurrentWeek,
  setCurrentDay,
  setLoading,
  setError,
  updateProgress,
  acknowledgeDay,
} from "../redux/slices/courseSlice";
import api from "../services/api";

export const useCourseManagement = () => {
  const dispatch = useDispatch();

  const {
    courses,
    currentCourse,
    currentWeek,
    currentDay,
    loading,
    error,
    progress,
    acknowledgments,
  } = useSelector((state) => state.course);

  /**
   * Fetch all available courses
   */
  const fetchCourses = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      console.log("📡 Fetching courses...");
      const response = await api.get("/courses", {
        params: { t: Date.now() } // Add timestamp to prevent caching
      });

      if (Array.isArray(response.data)) {
        dispatch(setCourses(response.data));
        dispatch(setError(null));
        console.log("✅ Courses loaded:", response.data.length);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("❌ Error fetching courses:", err);
      dispatch(setError(err.message || "Failed to fetch courses"));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  /**
   * Fetch details for a specific course
   */
  const fetchCourseDetail = useCallback(
    async (courseId) => {
      // Clear previous errors before fetching
      dispatch(setError(null));
      dispatch(setLoading(true));
      try {
        console.log(`📡 Fetching course detail for ID: ${courseId}`);
        const response = await api.get(`/courses/${courseId}`);

        if (!response.data) throw new Error("Empty response from server");

        dispatch(setCurrentCourse(response.data));
        dispatch(setError(null));
        console.log("✅ Course detail loaded:", response.data.title);
      } catch (err) {
        console.error("❌ Error fetching course detail:", err);
        // Clear any stale course data on error (e.g., expired access)
        dispatch(setCurrentCourse(null));
        const serverMessage = err?.response?.data?.message || err.message || "Failed to fetch course details";
        dispatch(setError(serverMessage));
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  /**
   * Select a week within a course
   */
  const selectWeek = useCallback(
    (weekId) => {
      dispatch(setCurrentWeek(weekId));
    },
    [dispatch]
  );

  /**
   * Select a day within a week
   */
  const selectDay = useCallback(
    (dayId) => {
      dispatch(setCurrentDay(dayId));
    },
    [dispatch]
  );

  /**
   * Student acknowledgment of a day
   */
  const handleAcknowledgment = useCallback(
    async (courseId, weekId, dayId) => {
      try {
        const resp = await api.post(`/courses/${courseId}/week/${weekId}/day/${dayId}/acknowledge`);

        // Update local store with returned progress if available
        if (resp && resp.data && typeof resp.data.progress === 'number') {
          dispatch(updateProgress({ courseId, progress: resp.data.progress }));
        }

        // Mark acknowledgment in UI store
        dispatch(acknowledgeDay({ courseId, weekId, dayId }));

        return true;
      } catch (err) {
        console.error("❌ Acknowledgment failed:", err);
        dispatch(setError("Failed to acknowledge day completion"));
        return false;
      }
    },
    [dispatch]
  );

  /**
   * Check eligibility for weekly exam
   */
  const checkWeekExamEligibility = useCallback(
    (courseId, weekId) => {
      if (!acknowledgments[courseId]?.[weekId]) return false;
      const requiredDays = new Set(["1", "2", "3", "4"]);
      const acknowledgedDays = new Set(acknowledgments[courseId][weekId]);
      return [...requiredDays].every((day) => acknowledgedDays.has(day));
    },
    [acknowledgments]
  );

  // Return all hook values and functions
  return {
    courses,
    currentCourse,
    courseDetail: currentCourse, // alias for backward compatibility
    currentWeek,
    currentDay,
    loading,
    error,
    progress,
    acknowledgments,
    fetchCourses,
    fetchCourseDetail, // correct naming used in CourseDetail.jsx
    selectWeek,
    selectDay,
    handleAcknowledgment,
    checkWeekExamEligibility,
  };
};
