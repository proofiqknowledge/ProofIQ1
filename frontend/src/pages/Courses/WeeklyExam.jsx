import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamManagement } from '../../hooks/useExamManagement';
import { toast } from 'react-toastify';
import { FaClock, FaCheck, FaArrowLeft, FaArrowRight, FaTrophy } from 'react-icons/fa';

export default function modulelyExam() {
  // Map 'id' from route to 'courseId'
  const { id: courseId, weekNumber } = useParams();
  const navigate = useNavigate();

  const {
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
  } = useExamManagement();

  // 🔥 NEW: Track remaining attempts
  const [attemptsRemaining, setAttemptsRemaining] = React.useState(null);

  // Fetch exam details
  useEffect(() => {
    if (courseId && weekNumber) {
      // Pass 'weekly' as type and weekNumber implies the ID/Topic
      // Note: The hook/backend might need 'weekly' handling, or we use 'modulely' but pass weekNumber if backend treats them consistently?
      // Assuming backend exam structure: exams/modulely/:courseId/:moduleId
      // But here we have Week.
      // If backend logic for `fetchExam` (in hook) calls `/exams/modulely/${courseId}/${moduleId}`, 
      // passing `weekNumber` as `moduleId` might work IF the backend treats weeks as modules or if we change the URL construction.
      // Let's check the hook again:
      // const endpoint = moduleId ? `/exams/modulely/${courseId}/${moduleId}` : ...
      // If I pass weekNumber as 3rd arg, it goes to `/exams/modulely/${courseId}/${weekNumber}`.
      // If the backend expects module ID (string) vs week number (number), this might be risky.
      // Only the user knows if "Module Assessment: Week 1" uses ID "1" or a mongoID.
      // Given the file name `WeeklyExam.jsx` and route `week/:weekNumber`, it's likely we send the number.
      fetchExam(courseId, 'weekly', weekNumber);
    }
    return () => cleanupExam();
  }, [courseId, weekNumber]);

  // 🔥 Fetch attempt status
  useEffect(() => {
    if (!currentExam?._id) return;

    fetch(`/api/exams/${currentExam._id}/attempts`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setAttemptsRemaining(data?.data?.attemptsRemaining ?? 0))
      .catch(() => setAttemptsRemaining(0));
  }, [currentExam]);

  const handleStart = () => {
    if (attemptsRemaining === 0) {
      toast.error("You have already attempted this exam.");
      return;
    }

    // Navigate to the dedicated exam taking page
    navigate(`/exams/${currentExam._id}/take`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 text-center">
          <div className="text-xl font-bold mb-2">Error</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  if (!currentExam) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Module {weekNumber} Assessment: {currentExam.title}
        </h2>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">{currentExam.description}</p>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <div className="flex">
              <FaTrophy className="h-5 w-5 text-blue-500" />
              <div className="ml-3 text-sm text-blue-700">
                Score 95% or higher to earn 100 reward points!
              </div>
            </div>
          </div>

          <ul className="space-y-2 text-gray-600">
            <li>• Duration: {currentExam.duration} minutes</li>
            <li>• Total Questions: {currentExam.questions ? currentExam.questions.length : 0}</li>
            <li>• Passing Score: 60% (required to proceed to next module)</li>
            <li>• Bonus: 100 reward points for scoring ≥95%</li>
            <li className="text-red-600 font-bold">
              • Attempts Remaining: {attemptsRemaining}
            </li>
          </ul>
        </div>

        {/* 🔥 UPDATED START BUTTON */}
        <button
          onClick={handleStart}
          disabled={attemptsRemaining === 0}
          className={`w-full py-3 rounded-lg transition-colors ${attemptsRemaining === 0
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
        >
          {attemptsRemaining === 0 ? "Attempt Used" : "Start Assessment"}
        </button>
      </div>
    </div>
  );
}
