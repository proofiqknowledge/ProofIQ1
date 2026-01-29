import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExamManagement } from '../../hooks/useExamManagement';
import { toast } from 'react-toastify';
import { FaClock, FaCheck, FaTimes, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

export default function FinalExam() {
  const { courseId } = useParams();
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

  useEffect(() => {
    fetchExam(courseId, 'final');
    return () => cleanupExam();
  }, [courseId, fetchExam, cleanupExam]);

  const handleStart = () => {
    if (currentExam?.duration) {
      initiateExam(currentExam.duration);
    }
  };

  const handleNext = () => {
    if (activeQuestion < (currentExam?.questions?.length || 0) - 1) {
      navigateToQuestion(activeQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (activeQuestion > 0) {
      navigateToQuestion(activeQuestion - 1);
    }
  };

  const handleAnswerSelect = (answer) => {
    if (examStatus === 'in-progress' && currentExam?.questions[activeQuestion]) {
      saveAnswer(currentExam.questions[activeQuestion]._id, answer);
    }
  };

  const handleSubmit = async () => {
    if (!isExamComplete()) {
      toast.warning('Please answer all questions before submitting');
      return;
    }

    try {
      const result = await handleSubmitExam();
      if (result.passed) {
        toast.success(`Congratulations! You passed with ${result.score}%`);
      } else {
        toast.error(`You scored ${result.score}%. Required: 60%`);
      }
      // Navigate to results or course page after 3 seconds
      setTimeout(() => navigate(`/courses/${courseId}`), 3000);
    } catch (err) {
      toast.error('Failed to submit exam');
    }
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

  const currentQuestion = currentExam.questions[activeQuestion];

  return (
    <div className="container mx-auto px-4 py-8">
      {examStatus === 'not-started' ? (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Final Exam: {currentExam.title}</h2>
          <div className="mb-6">
            <p className="text-gray-600 mb-4">{currentExam.description}</p>
            <ul className="space-y-2 text-gray-600">
              <li>• Duration: {currentExam.duration} minutes</li>
              <li>• Total Questions: {currentExam.questions.length}</li>
              <li>• Passing Score: 60%</li>
            </ul>
          </div>
          <button
            onClick={handleStart}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Assessment
          </button>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto">
          {/* Timer and Progress */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex justify-between items-center">
            <div className="flex items-center">
              <FaClock className="text-blue-500 mr-2" />
              <span className="font-mono text-xl">{formatTimeRemaining()}</span>
            </div>
            <div className="text-gray-600">
              Question {activeQuestion + 1} of {currentExam.questions.length}
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">{currentQuestion.text}</h3>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  className={`w-full p-4 text-left rounded-lg border transition-all ${
                    answers[currentQuestion._id] === option
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={activeQuestion === 0}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              <FaArrowLeft className="mr-2" /> Previous
            </button>

            {activeQuestion === currentExam.questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <FaCheck className="mr-2" /> Submit Exam
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next <FaArrowRight className="ml-2" />
              </button>
            )}
          </div>

          {/* Question Navigation */}
          <div className="mt-6 bg-white rounded-lg shadow-md p-4">
            <div className="grid grid-cols-8 gap-2">
              {currentExam.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => navigateToQuestion(index)}
                  className={`p-2 rounded ${
                    index === activeQuestion
                      ? 'bg-blue-600 text-white'
                      : answers[currentExam.questions[index]._id]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
