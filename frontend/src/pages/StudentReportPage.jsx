import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import axios from 'axios'; // Removed axios
import api from '../services/api';

export default function StudentReportPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [exam, setExam] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [submissionId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setLoading(true);
      // const token = localStorage.getItem('token'); // Handled by api service
      const response = await api.get(`/exams/submissions/${submissionId}/report`);

      if (response.data.success) {
        let examData = response.data.data.exam;
        const submissionData = response.data.data.submission;

        // ✅ FIX: Reorder exam questions to match shuffled order student saw
        try {
          const qOrder = submissionData?.questionOrder;
          if (Array.isArray(qOrder) && qOrder.length && Array.isArray(examData?.questions)) {
            const ordered = [];
            qOrder.forEach((qid) => {
              const found = (examData.questions || []).find((q) => {
                const questionId = String(q.id || q._id || '');
                return questionId && questionId === String(qid);
              });
              if (found) ordered.push(found);
            });

            // Append any missing questions (fallback)
            if (ordered.length !== (examData.questions || []).length) {
              (examData.questions || []).forEach((q) => {
                const id = String(q.id || q._id || '');
                if (id && !ordered.find(o => String(o.id || o._id || '') === id)) {
                  ordered.push(q);
                }
              });
            }
            examData = { ...examData, questions: ordered };
          }
        } catch (e) {
          console.warn('Failed to apply questionOrder in admin report:', e);
        }

        setSubmission(submissionData);
        setExam(examData);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      alert('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get student's selected option display
  const getStudentAnswer = (question, answer) => {
    if (!answer || answer.selectedOption === undefined) return 'Not Answered';
    const opt = question.options?.[answer.selectedOption];
    if (!opt) return 'Not Answered';
    return `${opt.optionLabel}. ${opt.text}`;
  };

  // Helper function to get correct answer display
  const getCorrectAnswer = (question) => {
    if (!question.options || !Array.isArray(question.options)) {
      return 'N/A';
    }

    const correct = question.options.find(opt => opt.isCorrect);
    if (!correct) return 'N/A';

    return `${correct.optionLabel}. ${correct.text}`;
  };

  // Helper function to match question with answer
  const findAnswer = (question, idx, answers) => {
    return answers.find(a => {
      // For coding questions, check 'id' field first (timestamp-based)
      // Then check '_id' (MongoDB ObjectId) for MCQ/theory
      const questionId = question.id || question._id || idx;
      const answerId = a.questionId;

      // Convert both to strings for comparison (handles MongoDB ObjectId)
      return String(answerId) === String(questionId);
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading report...</p>
      </div>
    );
  }

  if (!submission || !exam) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Report not found</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const {
    student,
    totalMarksObtained,
    totalMarksMax,
    percentageScore,
    qualified,
    grade,
    timeSpent,
    submittedAt,
    cheatingDetected,
    answers
  } = submission;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '0.5rem 1rem',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          ← Back to Candidates
        </button>
        <h1 style={{ fontSize: '1.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Assessment Report
        </h1>
        <p style={{ color: '#64748b' }}>
          {exam.title}
        </p>
      </div>

      {/* Student Info Card */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Student Information
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Name</p>
            <p style={{ fontWeight: '600' }}>{student.name}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Email</p>
            <p style={{ fontWeight: '600' }}>{student.email}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Submitted At</p>
            <p style={{ fontWeight: '600' }}>{submittedAt ? new Date(submittedAt).toLocaleString() : 'Not Submitted'}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Time Spent</p>
            <p style={{ fontWeight: '600' }}>{Math.floor(timeSpent / 60)}m {timeSpent % 60}s</p>
          </div>
        </div>
      </div>

      {/* Score Card */}
      {!submittedAt ? (
        <div style={{
          background: '#f8fafc',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          border: '2px dashed #cbd5e1',
          textAlign: 'center',
          color: '#64748b'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Not Yet Attempted
          </h2>
          <p>The student has not submitted this assessment yet.</p>
        </div>
      ) : (
        <div style={{
          background: grade === 'Green' ? '#dcfce7' : grade === 'Amber' ? '#fef9c3' : '#fee2e2',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '1.5rem',
          border: `2px solid ${grade === 'Green' ? '#16a34a' : grade === 'Amber' ? '#ca8a04' : '#ef4444'}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              {/* For coding exams, don't show fractional score (1/1), only percentage */}
              {exam.type !== 'coding' && (
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                  Score: {totalMarksObtained}/{totalMarksMax}
                </h2>
              )}
              <p style={{ fontSize: '2rem', fontWeight: '800', color: grade === 'Green' ? '#16a34a' : grade === 'Amber' ? '#ca8a04' : '#ef4444' }}>
                {percentageScore.toFixed(2)}%
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>Grade</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: grade === 'Green' ? '#16a34a' : grade === 'Amber' ? '#ca8a04' : '#ef4444' }}>{grade}</p>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', marginTop: '0.5rem', color: qualified ? '#16a34a' : '#ef4444' }}>
                {qualified ? 'Qualified' : 'Not Qualified'}
              </p>
            </div>
          </div>

          {cheatingDetected && (
            <div style={{
              background: '#fef2f2',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '2px solid #ef4444',
              marginTop: '1rem'
            }}>
              <p style={{ color: '#dc2626', fontWeight: '600' }}>
                ⚠️ Cheating Detected
              </p>
            </div>
          )}
        </div>
      )}

      {/* Question-wise Answers */}
      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Question-wise Performance
        </h2>

        {exam.questions.map((question, idx) => {
          const answer = findAnswer(question, idx, answers);

          // For coding questions with proportional marking, check if they got any marks
          // For MCQ/theory, use isCorrect field
          let isCorrect;
          if (question.type === 'coding') {
            // Coding: consider correct if got marks (supports partial credit)
            isCorrect = answer?.marksObtained > 0;
          } else {
            // MCQ/Theory: use isCorrect field
            isCorrect = answer?.isCorrect;
          }

          return (
            <div
              key={question._id || question.id || idx}
              style={{
                padding: '0.75rem',
                marginBottom: '0.75rem',
                borderRadius: '8px',
                // For coding and theory questions, use neutral styling; for MCQ, use color coding
                border: (question.type === 'coding' || question.type === 'theory') ? '2px solid #e2e8f0' : `2px solid ${isCorrect ? '#16a34a' : '#ef4444'}`,
                background: (question.type === 'coding' || question.type === 'theory') ? '#f9fafb' : (isCorrect ? '#f0fdf4' : '#fef2f2')
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <p style={{ fontWeight: '600' }}>Question {idx + 1}</p>
                {/* For coding questions, show test case score instead of correct/incorrect */}
                {question.type === 'coding' ? (
                  answer?.testCasesPassed !== undefined && (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: '#e0e7ff',
                      color: '#4f46e5'
                    }}>
                      {answer.testCasesPassed}/{answer.testCaseResults?.length || 0} Passed
                    </span>
                  )
                ) : question.type === 'theory' ? (
                  // Theory: No badge, just marks at bottom
                  null
                ) : (
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    background: isCorrect ? '#dcfce7' : '#fee2e2',
                    color: isCorrect ? '#16a34a' : '#ef4444'
                  }}>
                    {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                )}
              </div>

              <p style={{ marginBottom: '0.75rem', color: '#334155', whiteSpace: 'pre-wrap' }}>
                {question.title || question.question}
              </p>

              {question.type === 'mcq' && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Student Answer: <span style={{ fontWeight: '600', color: '#1e293b' }}>
                      {getStudentAnswer(question, answer)}
                    </span>
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: '600' }}>
                    Correct Answer: {getCorrectAnswer(question)}
                  </p>
                </div>
              )}

              {question.type === 'theory' && (
                <div>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                    Student Answer:
                  </p>
                  <p style={{
                    padding: '0.75rem',
                    background: 'white',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    border: '1px solid #e2e8f0'
                  }}>
                    {answer?.textAnswer || 'Not Answered'}
                  </p>
                </div>
              )}

              {question.type === 'coding' && answer?.code && (
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Submitted Code:
                  </p>
                  <pre style={{
                    padding: '1rem',
                    background: '#1e293b',
                    color: '#e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    overflow: 'auto',
                    margin: '0',
                    fontFamily: "'Courier New', Courier, monospace",
                    lineHeight: '1.5'
                  }}>
                    <code>{answer.code}</code>
                  </pre>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                    Language: <span style={{ fontWeight: '600' }}>{answer.language || 'python'}</span>
                    {answer.testCasesPassed !== undefined && (
                      <> | Test Cases: <span style={{
                        fontWeight: '600',
                        color: answer.testCasesPassed === answer.testCaseResults?.length ? '#16a34a' : '#f59e0b'
                      }}>
                        {answer.testCasesPassed}/{answer.testCaseResults?.length || 0} Passed
                      </span></>
                    )}
                  </p>
                </div>
              )}

              {/* Only show marks for MCQ and theory questions, not for coding (test cases shown above) */}
              {question.type !== 'coding' && (
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Marks: {answer?.marksObtained || 0}/{question.marks || 1}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
