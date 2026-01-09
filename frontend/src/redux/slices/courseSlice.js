import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  courses: [],
  currentCourse: null,
  currentWeek: null,
  currentDay: null,
  loading: false,
  error: null,
  progress: {}, // Store progress per course
  acknowledgments: {}, // Store acknowledgments per day
};

const courseSlice = createSlice({
  name: 'course',
  initialState,
  reducers: {
    setCourses: (state, action) => {
      state.courses = action.payload;
    },
    updateCourseImage: (state, action) => {
      const { courseId, imageUrl } = action.payload;
      // Update image in courses list
      state.courses = state.courses.map(course => 
        course._id === courseId 
          ? { ...course, imageUrl }
          : course
      );
      // Update image in current course if it's the same course
      if (state.currentCourse && state.currentCourse._id === courseId) {
        state.currentCourse = { ...state.currentCourse, imageUrl };
      }
    },
    setCurrentCourse: (state, action) => {
      state.currentCourse = action.payload;
      state.currentWeek = null;
      state.currentDay = null;
    },
    setCurrentWeek: (state, action) => {
      state.currentWeek = action.payload;
      state.currentDay = null;
    },
    setCurrentDay: (state, action) => {
      state.currentDay = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    updateProgress: (state, action) => {
      const { courseId, progress } = action.payload;
      state.progress[courseId] = progress;
    },
    acknowledgeDay: (state, action) => {
      const { courseId, weekId, dayId } = action.payload;
      if (!state.acknowledgments[courseId]) {
        state.acknowledgments[courseId] = {};
      }
      if (!state.acknowledgments[courseId][weekId]) {
        state.acknowledgments[courseId][weekId] = new Set();
      }
      state.acknowledgments[courseId][weekId].add(dayId);
    },
    // Helper reducer to check if a day is acknowledged
    isDayAcknowledged: (state, action) => {
      const { courseId, weekId, dayId } = action.payload;
      return state.acknowledgments[courseId]?.[weekId]?.has(dayId) || false;
    },
    // Helper reducer to check if all days in a week are acknowledged
    isWeekCompleted: (state, action) => {
      const { courseId, weekId, totalDays } = action.payload;
      const weekAcks = state.acknowledgments[courseId]?.[weekId];
      return weekAcks ? weekAcks.size >= totalDays : false;
    }
  },
});

export const { 
  setCourses, 
  setCurrentCourse,
  setCurrentWeek,
  setCurrentDay,
  setLoading,
  setError,
  updateProgress,
  acknowledgeDay,
  isDayAcknowledged,
  isWeekCompleted
} = courseSlice.actions;

export default courseSlice.reducer;
