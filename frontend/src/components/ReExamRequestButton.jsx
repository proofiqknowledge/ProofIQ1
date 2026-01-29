import React, { useState, useEffect } from 'react';
import reexamService from '../services/reexamService';
import ReExamRequestModal from './ReExamRequestModal';
import './ReExamRequestButton.css';

export default function ReExamRequestButton({
  exam,
  studentId,
  studentName,
  employeeId,
  visible = true,
  onRequestSuccess,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && exam && studentId) {
      checkRequestStatus();
    }
  }, [exam, studentId, visible]);

  const checkRequestStatus = async () => {
    try {
      // Use examId if available (from StudentExamsPage), otherwise use _id (from ExamResultPage)
      const examId = exam.examId || exam._id;
      const response = await reexamService.getReExamRequestStatus(studentId, examId);
      if (response.hasRequest) {
        setRequestStatus(response.data?.status);
      } else {
        setRequestStatus(null);
      }
    } catch (error) {
      console.error('Error checking re-exam status:', error);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleRequestSuccess = () => {
    checkRequestStatus();
    if (onRequestSuccess) onRequestSuccess();
  };

  if (!visible || !exam) return null;

  // Determine if button should be disabled
  const isDisabled = requestStatus === 'pending' || requestStatus === 'approved';

  // Determine button text and appearance
  let buttonText = 'Request Re-Exam';
  let buttonClass = 'reexam-btn-default';

  if (requestStatus === 'pending') {
    buttonText = 'Request Pending';
    buttonClass = 'reexam-btn-pending';
  } else if (requestStatus === 'approved') {
    buttonText = 'Re-Exam Approved';
    buttonClass = 'reexam-btn-approved';
  } else if (requestStatus === 'rejected') {
    buttonText = 'Request Rejected';
    buttonClass = 'reexam-btn-rejected';
  }

  return (
    <>
      <button
        className={`reexam-btn ${buttonClass}`}
        onClick={handleOpenModal}
        disabled={isDisabled}
        title={isDisabled ? 'You have already submitted a request for this exam' : 'Request a re-exam'}
      >
        {buttonText}
      </button>

      <ReExamRequestModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        exam={exam}
        studentId={studentId}
        studentName={studentName}
        employeeId={employeeId}
        onSuccess={handleRequestSuccess}
      />
    </>
  );
}
