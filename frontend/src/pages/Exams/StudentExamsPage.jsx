import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import examService from "../../services/examService";
import { toast } from "react-toastify";
import { Calendar, Clock } from "lucide-react";

export default function StudentExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examAttempts, setExamAttempts] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    fetchAssignedExams();
  }, []);

  const fetchAssignedExams = async () => {
    try {
      setLoading(true);
      console.log('Fetching assigned exams...');
      const response = await examService.getAssignedExams();
      const examsData = Array.isArray(response.data) ? response.data : [];
      console.log('Fetched exams data:', examsData);
      setExams(examsData);
      // Fetch attempts for each exam (student view)
      try {
        const attemptsMap = {};
        await Promise.all(
          examsData.map(async (ex) => {
            try {
              const resp = await examService.getExamAttempts(ex.examId);
              attemptsMap[ex.examId] = resp.data || resp;
            } catch (err) {
              // If attempts endpoint fails, default to allowing start (1 attempt)
              attemptsMap[ex.examId] = { attemptsUsed: 0, attemptsRemaining: 1, maxAttempts: 1 };
            }
          })
        );
        setExamAttempts(attemptsMap);
      } catch (err) {
        console.warn('Failed to fetch attempts for exams', err);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.message || "Failed to fetch exams");
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (examId) => {
    // Prevent starting if attempts exhausted
    const attemptsInfo = examAttempts[examId];
    if (attemptsInfo && typeof attemptsInfo.attemptsRemaining === 'number' && attemptsInfo.attemptsRemaining <= 0) {
      toast.error('You have exhausted all attempts for this exam');
      return;
    }
    try {
      await examService.startExam(examId);
      navigate(`/exams/${examId}/take`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start exam");
    }
  };

  const handleContinueExam = (examId) => {
    navigate(`/exams/${examId}/take`);
  };

  const handleViewResult = (examId) => {
    navigate(`/exams/${examId}/result`);
  };

  // Get effective status (use server-provided status)
  const getEffectiveStatus = (exam) => {
    if (exam.status === 'not_started') {
      const now = new Date();
      const start = exam.startDate ? new Date(exam.startDate) : null;
      const end = exam.endDate ? new Date(exam.endDate) : null;

      if (start && now < start) return 'upcoming';
      if (end && now > end) return 'expired';
    }
    return exam.status;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      not_started: {
        label: "Not Started",
        bgColor: "#f3f4f6",
        textColor: "#6b7280",
        borderColor: "#e5e7eb"
      },
      upcoming: {
        label: "Scheduled",
        bgColor: "#eff6ff",
        textColor: "#1d4ed8",
        borderColor: "#bfdbfe"
      },
      expired: {
        label: "Expired",
        bgColor: "#fef2f2",
        textColor: "#b91c1c",
        borderColor: "#fecaca"
      },
      in_progress: {
        label: "In Progress",
        bgColor: "#dbeafe",
        textColor: "#1e40af",
        borderColor: "#93c5fd"
      },
      submitted: {
        label: "Submitted",
        bgColor: "#fef3c7",
        textColor: "#92400e",
        borderColor: "#fcd34d"
      },
      graded: {
        label: "Graded",
        bgColor: "#d1fae5",
        textColor: "#065f46",
        borderColor: "#6ee7b7"
      },
    };

    const config = statusConfig[status] || statusConfig.not_started;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "4px 12px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
          backgroundColor: config.bgColor,
          color: config.textColor,
          border: `1px solid ${config.borderColor}`,
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }}
      >
        {config.label}
      </span>
    );
  };

  const getTotalMarks = (exam) => {
    if (exam?.totalMarks != null) return exam.totalMarks;
    if (exam?.submission?.totalMarksMax != null) return exam.submission.totalMarksMax;
    if (Array.isArray(exam?.questions)) return exam.questions.length;
    if (typeof exam?.questionCount === "number") return exam.questionCount;
    return 0;
  };

  const getExamTypeIcon = (type) => {
    const icons = {
      mcq: "📋",
      coding: "💻",
      theory: "✍️",

    };
    return icons[type] || "📝";
  };

  const pageStyle = {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    padding: "2rem",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  };

  const headerStyle = {
    marginBottom: "2rem"
  };

  const titleStyle = {
    fontSize: "2rem",
    fontWeight: "700",
    color: "#1e293b",
    margin: "0 0 0.5rem 0",
    letterSpacing: "-0.02em"
  };

  const subtitleStyle = {
    fontSize: "1rem",
    color: "#64748b",
    margin: "0",
    fontWeight: "400"
  };

  const loadingContainerStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: "1rem"
  };

  const spinnerStyle = {
    width: "48px",
    height: "48px",
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite"
  };

  const emptyStateStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    textAlign: "center",
    padding: "3rem"
  };

  const emptyIconStyle = {
    fontSize: "4rem",
    marginBottom: "1rem",
    opacity: "0.5"
  };

  const emptyTitleStyle = {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#1e293b",
    margin: "0 0 0.5rem 0"
  };

  const emptyTextStyle = {
    fontSize: "1rem",
    color: "#64748b",
    margin: "0"
  };

  const examsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
    gap: "1.5rem",
    marginTop: "1rem"
  };

  const examCardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "1.5rem",
    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    border: "1px solid #e2e8f0",
    transition: "all 0.3s ease",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden"
  };

  const examCardHoverStyle = {
    ...examCardStyle,
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    transform: "translateY(-2px)",
    borderColor: "#cbd5e1"
  };

  const cardHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem"
  };

  const titleSectionStyle = {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    flex: "1"
  };

  const typeIconStyle = {
    fontSize: "1.75rem",
    lineHeight: "1"
  };

  const examTitleStyle = {
    fontSize: "1.25rem",
    fontWeight: "600",
    color: "#1e293b",
    margin: "0",
    lineHeight: "1.4"
  };

  const detailsStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem",
    padding: "1rem 0",
    borderTop: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0"
  };

  const detailItemStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem"
  };

  const detailLabelStyle = {
    fontSize: "0.75rem",
    color: "#64748b",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  };

  const detailValueStyle = {
    fontSize: "1rem",
    fontWeight: "600",
    color: "#1e293b"
  };

  const detailBadgeStyle = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: "600",
    backgroundColor: "#eff6ff",
    color: "#1e40af",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginTop: "0.25rem"
  };

  const scoreContainerStyle = {
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    padding: "1rem",
    border: "1px solid #e2e8f0"
  };

  const scoreDisplayStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.75rem"
  };

  const scoreValueStyle = {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "#1e293b"
  };

  const scorePercentageStyle = {
    fontSize: "1.125rem",
    fontWeight: "600",
    color: "#64748b"
  };

  const scoreBarStyle = {
    width: "100%",
    height: "8px",
    backgroundColor: "#e2e8f0",
    borderRadius: "4px",
    overflow: "hidden"
  };

  const awaitingStyle = {
    backgroundColor: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    textAlign: "center"
  };

  const scheduleBlockStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    padding: "0.75rem",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    marginBottom: "1rem"
  };

  const scheduleItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.813rem",
    color: "#475569",
    fontWeight: "500"
  };

  const awaitingTextStyle = {
    margin: "0",
    fontSize: "0.875rem",
    color: "#92400e",
    fontWeight: "500"
  };

  const actionsStyle = {
    display: "flex",
    gap: "0.75rem",
    marginTop: "auto"
  };

  const buttonPrimaryStyle = {
    flex: "1",
    padding: "0.75rem 1.5rem",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textTransform: "none",
    letterSpacing: "0"
  };

  const buttonSecondaryStyle = {
    ...buttonPrimaryStyle,
    backgroundColor: "#ffffff",
    color: "#3b82f6",
    border: "1px solid #3b82f6"
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={loadingContainerStyle}>
          <div style={spinnerStyle}></div>
          <p style={{ color: "#64748b", fontSize: "1rem", margin: "0" }}>Loading your exams...</p>
        </div>
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div style={pageStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>My Exams</h1>
        </div>
        <div style={emptyStateStyle}>
          <div style={emptyIconStyle}>📭</div>
          <h3 style={emptyTitleStyle}>No Exams Assigned</h3>
          <p style={emptyTextStyle}>You don't have any exams assigned yet. Check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>My Exams</h1>
        <p style={subtitleStyle}>You have {exams.length} exam(s) assigned</p>
      </div>

      <div style={examsGridStyle}>
        {exams.map((exam) => (
          <div
            key={exam.examId}
            style={hoveredCard === exam.examId ? examCardHoverStyle : examCardStyle}
            onMouseEnter={() => setHoveredCard(exam.examId)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={cardHeaderStyle}>
              <div style={titleSectionStyle}>
                <span style={typeIconStyle}>
                  {getExamTypeIcon(exam.examType || "mcq")}
                </span>
                <div>
                  <h3 style={examTitleStyle}>{exam.title}</h3>
                </div>
              </div>
              <div>{getStatusBadge(getEffectiveStatus(exam))}</div>
            </div>

            <div style={detailsStyle}>
              <div style={detailItemStyle}>
                <span style={detailLabelStyle}>Duration</span>
                <span style={detailValueStyle}>{exam.duration} min</span>
              </div>
              <div style={detailItemStyle}>
                <span style={detailLabelStyle}>Questions</span>
                <span style={detailValueStyle}>{getTotalMarks(exam)}</span>
              </div>
              <div style={detailItemStyle}>
                <span style={detailLabelStyle}>Type</span>
                <span style={detailBadgeStyle}>
                  {(exam.examType || "mcq").toUpperCase()}
                </span>
              </div>
            </div>

            {getEffectiveStatus(exam) === "graded" && exam.submission && (
              <div style={scoreContainerStyle}>
                <div style={scoreDisplayStyle}>
                  {/* For coding exams, show only percentage */}
                  {exam.examType === 'coding' ? (
                    <span style={scoreValueStyle}>
                      {exam.submission.percentageScore?.toFixed(1)}%
                    </span>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={scoreValueStyle}>
                          {exam.submission.totalMarksObtained}/{exam.submission.totalMarksMax}
                        </span>
                        {exam.submission.grade && (
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            color: exam.submission.grade === 'Green' ? '#10b981' : exam.submission.grade === 'Amber' ? '#f59e0b' : '#ef4444',
                            textTransform: 'uppercase'
                          }}>
                            Grade: {exam.submission.grade}
                          </span>
                        )}
                      </div>
                      <span style={scorePercentageStyle}>
                        {exam.submission.percentageScore?.toFixed(1)}%
                      </span>
                    </>
                  )}
                </div>
                <div style={scoreBarStyle}>
                  <div
                    style={{
                      width: `${exam.submission.percentageScore}%`,
                      height: "100%",
                      backgroundColor:
                        exam.submission.percentageScore >= 80
                          ? "#10b981" // Green
                          : exam.submission.percentageScore >= 50
                            ? "#f59e0b" // Amber
                            : "#ef4444", // Red
                      transition: "width 0.3s ease"
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* For coding exams: status changes based on examType, not submission presence */}
            {getEffectiveStatus(exam) === "submitted" && exam.examType === "coding" && (
              <div style={awaitingStyle}>
                <p style={awaitingTextStyle}>Auto-graded - Click "View Result" to see your score</p>
              </div>
            )}

            {/* For theory/MCQ exams awaiting manual grading */}
            {getEffectiveStatus(exam) === "submitted" && (
              <div style={awaitingStyle}>
                <p style={awaitingTextStyle}>
                  {exam.examType === 'theory'
                    ? "⏳ Awaiting evaluation by instructor"
                    : "⏳ Finalizing results... please wait"}
                </p>
              </div>
            )}

            {(exam.startDate || exam.endDate) && (
              <div style={scheduleBlockStyle}>
                <div style={{ fontSize: '0.625rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                  Availability Window
                </div>
                {exam.startDate && (
                  <div style={scheduleItemStyle}>
                    <Calendar size={14} color="#3b82f6" />
                    <span>Starts: <span style={{ color: '#0f172a', fontWeight: '600' }}>{new Date(exam.startDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></span>
                  </div>
                )}
                {exam.endDate && (
                  <div style={scheduleItemStyle}>
                    <Clock size={14} color="#ef4444" />
                    <span>Ends: <span style={{ color: '#0f172a', fontWeight: '600' }}>{new Date(exam.endDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></span>
                  </div>
                )}
              </div>
            )}

            <div style={actionsStyle}>
              {getEffectiveStatus(exam) === "not_started" && (() => {
                const now = new Date();
                const start = exam.startDate ? new Date(exam.startDate) : null;
                const end = exam.endDate ? new Date(exam.endDate) : null;
                const isUpcoming = start && now < start;
                const isExpired = end && now > end;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                    {(isUpcoming || isExpired) && (
                      <div style={{
                        padding: '0.75rem',
                        borderRadius: '8px',
                        backgroundColor: isUpcoming ? '#eff6ff' : '#fef2f2',
                        border: `1px solid ${isUpcoming ? '#bfdbfe' : '#fecaca'}`,
                        fontSize: '0.813rem',
                        color: isUpcoming ? '#1e40af' : '#991b1b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>{isUpcoming ? '🕒 Starts:' : '⌛ Expired:'}</span>
                        <span style={{ fontWeight: '600' }}>
                          {isUpcoming ? start.toLocaleString() : end.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <button
                      style={{
                        ...buttonPrimaryStyle,
                        opacity: (isUpcoming || isExpired) ? 0.6 : 1,
                        cursor: (isUpcoming || isExpired) ? "not-allowed" : "pointer",
                        background: (isUpcoming || isExpired) ? "#94a3b8" : "#3b82f6"
                      }}
                      onClick={() => !isUpcoming && !isExpired && handleStartExam(exam.examId)}
                      disabled={isUpcoming || isExpired || (examAttempts[exam.examId] && examAttempts[exam.examId].attemptsRemaining <= 0)}
                      onMouseEnter={(e) => {
                        if (!isUpcoming && !isExpired) e.currentTarget.style.backgroundColor = "#2563eb";
                      }}
                      onMouseLeave={(e) => {
                        if (!isUpcoming && !isExpired) e.currentTarget.style.backgroundColor = "#3b82f6";
                      }}
                    >
                      {isUpcoming ? 'Scheduled' : isExpired ? 'Expired' : (
                        examAttempts[exam.examId] ? (
                          examAttempts[exam.examId].attemptsRemaining > 0 ?
                            `Start Exam (${examAttempts[exam.examId].attemptsRemaining} / ${examAttempts[exam.examId].maxAttempts} left)` :
                            'No attempts left'
                        ) : 'Start Exam'
                      )}
                    </button>
                  </div>
                );
              })()}

              {getEffectiveStatus(exam) === "in_progress" && (
                <button
                  style={buttonPrimaryStyle}
                  onClick={() => handleContinueExam(exam.examId)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#2563eb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#3b82f6";
                  }}
                >
                  Continue Assessment
                </button>
              )}

              {(getEffectiveStatus(exam) === "submitted" ||
                getEffectiveStatus(exam) === "graded") && (
                  <button
                    style={buttonSecondaryStyle}
                    onClick={() => handleViewResult(exam.examId)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#eff6ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                    }}
                  >
                    View Result
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
