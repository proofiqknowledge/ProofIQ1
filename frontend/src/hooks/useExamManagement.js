import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
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
} from '../redux/slices/examSlice';
import api from '../services/api';

export const useExamManagement = () => {
  const dispatch = useDispatch();
  const {
    currentExam,
    loading,
    error,
    activeQuestion,
    answers,
    timeRemaining,
    examStatus,
    examResults
  } = useSelector((state) => state.exam);

  // Load exam details
  const fetchExam = useCallback(async (courseId, examType, moduleId = null) => {
    dispatch(setLoading(true));
    try {
      const endpoint = moduleId
        ? `/exams/modulely/${courseId}/${moduleId}`
        : `/exams/final/${courseId}`;

      const response = await api.get(endpoint);
      // Backend returns { success: true, data: exam }
      dispatch(setCurrentExam(response.data.data || response.data));
      dispatch(setError(null));
    } catch (err) {
      dispatch(setError('Failed to fetch exam'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  // Start the exam
  const initiateExam = useCallback((duration) => {
    dispatch(startExam(duration * 60)); // Convert minutes to seconds
  }, [dispatch]);

  // Navigate questions
  const navigateToQuestion = useCallback((questionIndex) => {
    dispatch(setActiveQuestion(questionIndex));
  }, [dispatch]);

  // Save answer
  const saveAnswer = useCallback((questionId, answer) => {
    dispatch(setAnswer({ questionId, answer }));
  }, [dispatch]);

  // Submit exam
  const handleSubmitExam = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await api.post(`/exams/${currentExam._id}/submit`, {
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer
        }))
      });

      dispatch(submitExam());
      dispatch(setExamResult({
        examId: currentExam._id,
        result: response.data
      }));

      return response.data;
    } catch (err) {
      dispatch(setError('Failed to submit exam'));
      throw err;
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, currentExam, answers]);

  // Timer management
  useEffect(() => {
    let timer;
    if (examStatus === 'in-progress' && timeRemaining > 0) {
      timer = setInterval(() => {
        dispatch(updateTimeRemaining(timeRemaining - 1));
      }, 1000);
    } else if (timeRemaining === 0 && examStatus === 'in-progress') {
      handleSubmitExam();
    }
    return () => clearInterval(timer);
  }, [timeRemaining, examStatus, handleSubmitExam, dispatch]);

  // Check if all questions are answered
  const isExamComplete = useCallback(() => {
    if (!currentExam?.questions) return false;
    return currentExam.questions.every(q => answers[q._id]);
  }, [currentExam, answers]);

  // Format remaining time
  const formatTimeRemaining = useCallback(() => {
    if (!timeRemaining) return '--:--';
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  // Clean up exam state
  const cleanupExam = useCallback(() => {
    dispatch(resetExamState());
  }, [dispatch]);

  return {
    currentExam,
    loading,
    error,
    activeQuestion,
    answers,
    timeRemaining,
    examStatus,
    examResults,
    fetchExam,
    initiateExam,
    navigateToQuestion,
    saveAnswer,
    handleSubmitExam,
    isExamComplete,
    formatTimeRemaining,
    cleanupExam
  };
};