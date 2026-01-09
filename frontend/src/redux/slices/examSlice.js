import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  exams: [],
  currentExam: null,
  examResults: {},
  loading: false,
  error: null,
  activeQuestion: 0,
  answers: {},
  timeRemaining: null,
  examStatus: 'not-started', // 'not-started', 'in-progress', 'submitted', 'graded'
};

const examSlice = createSlice({
  name: 'exam',
  initialState,
  reducers: {
    setExams: (state, action) => {
      state.exams = action.payload;
    },
    setCurrentExam: (state, action) => {
      state.currentExam = action.payload;
      state.activeQuestion = 0;
      state.answers = {};
      state.examStatus = 'not-started';
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setActiveQuestion: (state, action) => {
      state.activeQuestion = action.payload;
    },
    setAnswer: (state, action) => {
      const { questionId, answer } = action.payload;
      state.answers[questionId] = answer;
    },
    startExam: (state, action) => {
      state.examStatus = 'in-progress';
      state.timeRemaining = action.payload; // time in seconds
    },
    updateTimeRemaining: (state, action) => {
      state.timeRemaining = action.payload;
    },
    submitExam: (state) => {
      state.examStatus = 'submitted';
      state.timeRemaining = null;
    },
    setExamResult: (state, action) => {
      const { examId, result } = action.payload;
      state.examResults[examId] = result;
      state.examStatus = 'graded';
    },
    resetExamState: (state) => {
      state.currentExam = null;
      state.activeQuestion = 0;
      state.answers = {};
      state.timeRemaining = null;
      state.examStatus = 'not-started';
    }
  },
});

export const { 
  setExams,
  setCurrentExam,
  setLoading,
  setError,
  setActiveQuestion,
  setAnswer,
  startExam,
  updateTimeRemaining,
  submitExam,
  setExamResult,
  resetExamState
} = examSlice.actions;

export default examSlice.reducer;
