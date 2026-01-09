import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import examService from "../../services/examService";
import ReExamRequestButton from "../../components/ReExamRequestButton";
import { toast } from "react-toastify";

export default function ExamResultPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResult = async () => {
      try {
        setLoading(true);
        const [examResponse, submissionResponse] = await Promise.all([
          examService.getExamById(examId),
          examService.getSubmissionStatus(examId),
        ]);

        let examData = examResponse?.data || examResponse;
        const submissionData = submissionResponse?.data || submissionResponse;

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
          console.warn('Failed to apply questionOrder in results:', e);
        }

        setExam(examData);
        setSubmission(submissionData);
      } catch (err) {
        console.error('Error loading result:', err);
        toast.error(err.response?.data?.message || "Failed to load assessment result");
        navigate("/exams");
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [examId, navigate]);

  const getQuestionById = (questionId) => {
    const normalizedId = String(questionId);
    return exam.questions?.find(
      (q) => String(q.id || q._id || '') === normalizedId
    ) || exam.questions?.[parseInt(questionId, 10)] || null;
  };

  const getAnswerForQuestion = (questionId) => {
    const normalizedId = String(questionId);
    return submission.answers?.find(
      (a) => String(a.questionId || a.questionId) === normalizedId
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'graded':
      case 'evaluated':
        return '#10b981';
      case 'submitted':
        return '#3b82f6';
      default:
        return '#64748b';
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return '#2ECC71'; // Green
    if (percentage >= 50) return '#F39C12'; // Amber
    return '#E74C3C'; // Red
  };

  const pageStyle = {
    padding: '24px',
    background: '#f9fafb',
    minHeight: '100vh',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  };

  const loadingContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px'
  };

  const spinnerStyle = {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  const errorContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px',
    textAlign: 'center'
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={loadingContainerStyle}>
          <div style={spinnerStyle}></div>
          <p>Loading results...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!exam || !submission) {
    return (
      <div style={pageStyle}>
        <div style={errorContainerStyle}>
          <h3 style={{ color: '#ef4444', margin: 0, fontSize: '18px' }}>Result not found</h3>
          <button
            onClick={() => navigate("/exams")}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  // Calculate test case based score
  const calculateTestCaseScore = () => {
    let totalTestCases = 0;
    let passedTestCases = 0;

    submission.answers?.forEach(answer => {
      if (answer.testCaseResults && Array.isArray(answer.testCaseResults)) {
        totalTestCases += answer.testCaseResults.length;
        passedTestCases += answer.testCaseResults.filter(tc => tc.passed === true).length;
      }
    });

    return { passedTestCases, totalTestCases };
  };

  const { passedTestCases, totalTestCases } = calculateTestCaseScore();

  // Use submission's stored percentage score if available (works for MCQ, theory, and coding)
  // Fall back to test case calculation only if no percentage is stored
  const testCasePercentage = submission.percentageScore !== undefined && submission.percentageScore !== null
    ? submission.percentageScore
    : (totalTestCases > 0 ? (passedTestCases / totalTestCases) * 100 : 0);

  const statusColor = getStatusColor(submission.status);
  const scoreColor = getScoreColor(testCasePercentage);

  return (
    <div style={pageStyle}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{exam.title}</h1>
          <div style={{
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: statusColor + '20',
            color: statusColor
          }}>
            {submission.status === 'graded' || submission.status === 'evaluated' ? '✓ Evaluated' : 'Submitted'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <ReExamRequestButton
            exam={exam}
            studentId={user?.id}
            studentName={user?.name}
            employeeId={user?.employeeId}
            visible={submission.status === 'submitted' || submission.status === 'graded' || submission.status === 'evaluated'}
          />
          <button
            onClick={() => {
              if (exam.isInModule && exam.courseId) {
                navigate(`/courses/${exam.courseId}`);
              } else {
                navigate("/exams");
              }
            }}
            style={{
              padding: '10px 20px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
            onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
          >
            {exam.isInModule ? "← Back to Module" : "← Back to Exams"}
          </button>
        </div>
      </div>

      {/* Evaluation Status Banner for Theory Exams */}
      {exam.questions?.some(q => q.type === 'theory') && !submission.isEvaluated && (
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          padding: '20px 24px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            ⏳
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
              Awaiting Trainer Evaluation
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              Your exam contains theory questions that require manual evaluation by your trainer. Results will be available once the evaluation is complete.
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Complete Banner */}
      {submission.isEvaluated && submission.evaluatedBy && (
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          padding: '20px 24px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
              Evaluation Complete
            </div>
            <div style={{ fontSize: '14px', opacity: 0.9 }}>
              Evaluated on {new Date(submission.evaluatedAt).toLocaleDateString()} at {new Date(submission.evaluatedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Qualification & Grade Summary */}
      <div style={{
        background: 'white',
        padding: '16px',
        borderRadius: '12px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        display: 'grid',
        gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(3, 1fr)',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Percentage</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: scoreColor }}>{testCasePercentage.toFixed(2)}%</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Grade</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: submission.grade === 'Green' ? '#2ECC71' : submission.grade === 'Amber' ? '#F39C12' : '#E74C3C' }}>
            {submission.grade || '—'}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Qualification</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: submission.qualified ? '#2ECC71' : '#E74C3C' }}>{submission.qualified ? 'Qualified' : 'Not Qualified'}</span>
        </div>
      </div>

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        display: 'grid',
        gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 2fr',
        gap: '24px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
            {/* For coding exams, hide the fractional score and just show percentage as main score */}
            {(!exam.type || exam.type !== 'coding') && (
              <div style={{ fontSize: '48px', fontWeight: 700, lineHeight: 1, color: scoreColor }}>
                {submission.totalMarksObtained !== undefined && submission.totalMarksObtained !== null
                  ? `${submission.totalMarksObtained}/${submission.totalMarksMax || 0}`
                  : `${passedTestCases}/${totalTestCases}`
                }
              </div>
            )}
            <div style={{ fontSize: (exam.type === 'coding') ? '48px' : '24px', fontWeight: 600, color: scoreColor }}>
              {testCasePercentage.toFixed(1)}%
            </div>
          </div>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>Your Score</div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(2, 1fr)',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Questions</span>
            <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: 600 }}>{exam.questions?.length || 0}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Answered</span>
            <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: 600 }}>{submission.answers?.length || 0}</span>
          </div>
          {submission.submittedAt && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted At</span>
              <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: 600 }}>
                {new Date(submission.submittedAt).toLocaleString()}
              </span>
            </div>
          )}
          {submission.timeSpent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time Spent</span>
              <span style={{ fontSize: '16px', color: '#0f172a', fontWeight: 600 }}>
                {Math.floor(submission.timeSpent / 60)}m {submission.timeSpent % 60}s
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Question Breakdown</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {exam.questions?.map((question, idx) => {
            const questionId = question.id || question._id || String(idx);
            const answer = getAnswerForQuestion(questionId);
            const isCorrect = answer?.isCorrect;
            const marksObtained = answer?.marksObtained ?? (isCorrect === null ? undefined : 0);
            const marksMax = answer?.marksMax || question.marks || 1;

            // For theory questions, check if manually graded (has marks assigned)
            // For other questions, use isCorrect
            const isManuallyGraded = question.type === 'theory' && marksObtained !== undefined && marksObtained !== null;
            const hasStatus = isManuallyGraded || isCorrect !== null;

            // Color coding: green for graded/correct, red for incorrect, yellow for pending
            const badgeBg = (isManuallyGraded || isCorrect === true) ? '#d1fae5' : isCorrect === false ? '#fee2e2' : '#fef3c7';
            const badgeColor = (isManuallyGraded || isCorrect === true) ? '#065f46' : isCorrect === false ? '#991b1b' : '#92400e';
            const statusText = isManuallyGraded ? `${marksObtained}/${marksMax}` : (isCorrect === true ? '✓ Correct' : isCorrect === false ? '✗ Incorrect' : '⏳ Pending');

            return (
              <div
                key={question._id || question.id || idx}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '20px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Question {idx + 1}</div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#0f172a', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {question.title || question.question || 'Question text not available'}
                  </h3>

                  {question.type === 'mcq' && (
                    <div>
                      <div>
                        {(() => {
                          const sel = answer?.selectedOption;
                          if (sel === undefined || sel === null) {
                            return <span style={{ color: '#64748b', fontStyle: 'italic' }}>Not answered</span>;
                          }
                          const selectedOpt = question.options?.[sel];
                          if (!selectedOpt) {
                            return <span>Not answered</span>;
                          }
                          return (
                            <span style={{ color: isCorrect ? '#065f46' : '#991b1b', fontWeight: 600 }}>
                              {selectedOpt.optionLabel}. {selectedOpt.text}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {question.type === 'coding' && (
                    <div style={{ marginTop: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Your Code:</div>
                      <pre style={{
                        background: '#1e293b',
                        color: '#e2e8f0',
                        padding: '16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: "'Courier New', monospace",
                        overflowX: 'auto',
                        margin: '8px 0',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}>{answer?.code || 'No code submitted'}</pre>
                      {answer?.language && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                          Language: <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{answer.language}</span>
                        </div>
                      )}
                      {answer?.judge0Status && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '12px',
                          padding: '6px 12px',
                          background: answer.judge0Status === 'Accepted' ? '#d1fae5' : answer.judge0Status.includes('error') ? '#fee2e2' : '#fef3c7',
                          color: answer.judge0Status === 'Accepted' ? '#065f46' : answer.judge0Status.includes('error') ? '#991b1b' : '#92400e',
                          borderRadius: '6px',
                          display: 'inline-block',
                          fontWeight: '600'
                        }}>
                          Judge0: {answer.judge0Status}
                        </div>
                      )}
                      {answer?.judge0Output && (
                        <div style={{ marginTop: '12px', padding: '12px', background: '#1e293b', borderRadius: '6px' }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Output:</div>
                          <pre style={{ color: '#e2e8f0', fontSize: '12px', fontFamily: "'Courier New', monospace", margin: 0, whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>{answer.judge0Output}</pre>
                        </div>
                      )}
                      {(() => {
                        // Derive robust test case counts, falling back to testCaseResults length
                        const passedFromSummary = typeof answer?.testCasesPassed === 'number' ? answer.testCasesPassed : null;
                        const failedFromSummary = typeof answer?.testCasesFailed === 'number' ? answer.testCasesFailed : null;
                        const resultsArray = Array.isArray(answer?.testCaseResults) ? answer.testCaseResults : [];

                        let passed = passedFromSummary ?? resultsArray.filter(t => t.passed).length;
                        let failed = failedFromSummary ?? (resultsArray.length ? resultsArray.length - passed : 0);
                        let total = passed + failed;

                        if (!total && resultsArray.length) {
                          total = resultsArray.length;
                        }

                        if (!total) return null;

                        return (
                          <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                            <span style={{ color: '#15803d' }}>Passed: {passed}</span>
                            <span style={{ color: '#b91c1c' }}>Failed: {failed}</span>
                            <span style={{ color: '#2563eb' }}>
                              Total: {total}
                            </span>
                          </div>
                        );
                      })()}
                      {Array.isArray(answer?.testCaseResults) && answer.testCaseResults.length > 0 && (
                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Test Case Breakdown
                          </div>
                          {answer.testCaseResults.map((testCase, testIndex) => {
                            // ✅ CRITICAL FIX: Check testCase.passed first (new data), fallback to status for old data
                            // testCase.passed is the boolean from new backend (post-fix)
                            // testCase.status === "accepted" is for old data compatibility
                            const passed = testCase.passed === true || (testCase.passed === undefined && testCase.status === "accepted");

                            // Get original test case definition from exam question to fetch Input/Expected values
                            let isHidden = false;
                            let inputValue = testCase.input || '';
                            let expectedValue = testCase.expectedOutput || '';

                            try {
                              const origQuestion = exam.questions?.find(
                                q => String(q.id || q._id || '') === String(questionId)
                              );
                              if (origQuestion && Array.isArray(origQuestion.testCases)) {
                                const origTc =
                                  origQuestion.testCases.find(tc => String(tc._id) === String(testCase.testCaseId)) ||
                                  origQuestion.testCases[testIndex];

                                // Get values from original test case if available
                                if (origTc) {
                                  isHidden = !!origTc.isHidden;
                                  inputValue = origTc.input || inputValue;
                                  expectedValue = origTc.expectedOutput || expectedValue;
                                }
                              }
                            } catch (e) {
                              isHidden = false;
                            }
                            return (
                              <div
                                key={testIndex}
                                style={{
                                  borderRadius: '8px',
                                  padding: '12px',
                                  background: passed ? '#ecfdf5' : '#fef2f2',
                                  border: `1px solid ${passed ? '#bbf7d0' : '#fecaca'}`,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                  fontSize: '12px',
                                  color: passed ? '#047857' : '#b91c1c',
                                }}
                              >
                                <div style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{isHidden ? `Hidden Case ${testIndex + 1}` : `Case ${testIndex + 1}`}</span>
                                  <span>{passed ? 'Passed' : 'Failed'}</span>
                                </div>

                                {/* ALWAYS show details after submission (even for hidden test cases) */}
                                <>
                                  <div style={{ color: '#0f172a' }}>
                                    <span style={{ fontWeight: 600 }}>Input:</span>{' '}
                                    <code style={{ background: 'rgba(15,23,42,0.08)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'pre-wrap', display: 'inline-block' }}>
                                      {String(inputValue)}
                                    </code>
                                  </div>
                                  <div style={{ color: '#0f172a' }}>
                                    <span style={{ fontWeight: 600 }}>Expected:</span>{' '}
                                    <code style={{ background: 'rgba(15,23,42,0.08)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'pre-wrap', display: 'inline-block' }}>
                                      {String(expectedValue)}
                                    </code>
                                  </div>

                                  {testCase.stderr && (
                                    <div style={{ color: '#b91c1c' }}>
                                      <span style={{ fontWeight: 600 }}>StdErr:</span>{' '}
                                      <code style={{ background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                        {String(testCase.stderr)}
                                      </code>
                                    </div>
                                  )}
                                </>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        marginTop: '8px',
                        background: badgeBg,
                        color: badgeColor
                      }}>
                        {typeof answer?.testCasesPassed === 'number'
                          ? `Test Cases: ${answer.testCasesPassed}/${(answer.testCasesPassed || 0) + (answer.testCasesFailed || 0)}`
                          : statusText}
                      </div>
                    </div>
                  )}

                  {question.type === 'theory' && (
                    <div style={{ marginTop: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Your Answer:</div>
                      <div style={{
                        padding: '12px',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        lineHeight: 1.6,
                        color: '#0f172a',
                        whiteSpace: 'pre-wrap'
                      }}>{answer?.textAnswer || 'No answer submitted'}</div>
                      <div style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        marginTop: '8px',
                        background: badgeBg,
                        color: badgeColor
                      }}>
                        {statusText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div >
  );
}
