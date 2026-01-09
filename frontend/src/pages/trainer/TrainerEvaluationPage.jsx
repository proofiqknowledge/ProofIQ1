import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ArrowLeft, CheckCircle, Clock, User } from 'lucide-react';

const TrainerEvaluationPage = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submission, setSubmission] = useState(null);
    const [scores, setScores] = useState({});

    useEffect(() => {
        fetchSubmission();
    }, [submissionId]);

    const fetchSubmission = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            const response = await axios.get(
                `${API_URL}/trainer/evaluation/submission/${submissionId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                const submissionData = response.data.submission;
                setSubmission(submissionData);

                // Initialize scores with existing marks if already evaluated
                const initialScores = {};
                submissionData.questions.forEach((q, index) => {
                    // Use index as key to handle duplicate questions
                    initialScores[index] = q.marksObtained || 0;
                });
                setScores(initialScores);
            }
        } catch (error) {
            console.error('Error fetching submission:', error);
            toast.error(error.response?.data?.message || 'Failed to load submission');
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    const handleScoreChange = (index, value, maxMarks) => {
        const numValue = parseFloat(value) || 0;

        if (numValue < 0) {
            toast.error('Score cannot be negative');
            return;
        }

        if (numValue > maxMarks) {
            toast.error(`Score cannot exceed ${maxMarks} marks`);
            return;
        }

        setScores(prev => ({
            ...prev,
            [index]: numValue
        }));
    };

    const handleSubmitEvaluation = async () => {
        try {
            // Validate that all questions have scores
            const allQuestionsScored = submission.questions.every((q, index) =>
                scores[index] !== undefined && scores[index] !== null
            );

            if (!allQuestionsScored) {
                toast.error('Please assign marks to all questions');
                return;
            }

            setSubmitting(true);
            const token = localStorage.getItem('token');
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            const scoresArray = submission.questions.map((q, index) => ({
                questionId: q.questionId,
                score: scores[index],
                index: index // ✅ Send index to backend to identify correct answer
            }));

            const response = await axios.post(
                `${API_URL}/trainer/evaluation/submission/${submissionId}/evaluate`,
                { scores: scoresArray },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                toast.success('Evaluation submitted successfully!');
                navigate(-1);
            }
        } catch (error) {
            console.error('Error submitting evaluation:', error);
            toast.error(error.response?.data?.message || 'Failed to submit evaluation');
        } finally {
            setSubmitting(false);
        }
    };

    const calculateTotalScore = () => {
        return Object.values(scores).reduce((sum, score) => sum + (score || 0), 0);
    };

    const calculateTotalMaxMarks = () => {
        return submission?.questions.reduce((sum, q) => sum + q.marksMax, 0) || 0;
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner}></div>
                    <p style={styles.loadingText}>Loading submission...</p>
                </div>
            </div>
        );
    }

    if (!submission) {
        return (
            <div style={styles.container}>
                <div style={styles.errorContainer}>
                    <p>Submission not found</p>
                </div>
            </div>
        );
    }

    const totalScore = calculateTotalScore();
    const totalMaxMarks = calculateTotalMaxMarks();

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <button onClick={() => navigate(-1)} style={styles.backButton}>
                    <ArrowLeft size={20} />
                    <span style={styles.backButtonText}>Back</span>
                </button>
                <h1 style={styles.title}>Evaluate Submission</h1>
            </div>

            {/* Student Info Card */}
            <div style={styles.infoCard}>
                <div style={styles.infoRow}>
                    <div style={styles.infoItem}>
                        <User size={18} style={styles.infoIcon} />
                        <div>
                            <p style={styles.infoLabel}>Student</p>
                            <p style={styles.infoValue}>{submission.student.name}</p>
                            <p style={styles.infoSubtext}>{submission.student.email}</p>
                        </div>
                    </div>
                    <div style={styles.infoItem}>
                        <Clock size={18} style={styles.infoIcon} />
                        <div>
                            <p style={styles.infoLabel}>Submitted</p>
                            <p style={styles.infoValue}>
                                {new Date(submission.submittedAt).toLocaleDateString()}
                            </p>
                            <p style={styles.infoSubtext}>
                                {new Date(submission.submittedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                </div>
                <div style={styles.examTitle}>
                    <p style={styles.infoLabel}>Exam</p>
                    <p style={styles.infoValue}>{submission.exam.title}</p>
                </div>
            </div>

            {/* Status Badge */}
            {submission.isEvaluated && (
                <div style={styles.evaluatedBadge}>
                    <CheckCircle size={18} />
                    <span>Already Evaluated</span>
                    <span style={styles.badgeDate}>
                        on {new Date(submission.evaluatedAt).toLocaleDateString()}
                    </span>
                </div>
            )}

            {/* Questions */}
            <div style={styles.questionsContainer}>
                {submission.questions.map((question, index) => (
                    // Use index combined with questionId for key to be safe, but rely on index for logic
                    <div key={`${question.questionId}-${index}`} style={styles.questionCard}>
                        <div style={styles.questionHeader}>
                            <h3 style={styles.questionNumber}>Question {index + 1}</h3>
                            <span style={styles.maxMarks}>Max: {question.marksMax} marks</span>
                        </div>

                        <div style={styles.questionTitle}>
                            {question.title}
                        </div>

                        <div style={styles.answerSection}>
                            <p style={styles.answerLabel}>Student's Answer:</p>
                            <div style={styles.answerBox}>
                                {question.textAnswer || <em style={styles.noAnswer}>No answer provided</em>}
                            </div>
                        </div>

                        <div style={styles.scoreSection}>
                            <label style={styles.scoreLabel}>
                                Assign Marks:
                            </label>
                            <div style={styles.scoreInputGroup}>
                                <input
                                    type="number"
                                    min="0"
                                    max={question.marksMax}
                                    step="0.5"
                                    onWheel={(e) => e.target.blur()}
                                    value={scores[index] !== undefined ? scores[index] : 0}
                                    onChange={(e) => handleScoreChange(index, e.target.value, question.marksMax)}
                                    style={styles.scoreInput}
                                />
                                <span style={styles.scoreMax}>/ {question.marksMax}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary Card */}
            <div style={styles.summaryCard}>
                <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Total Score:</span>
                    <span style={styles.summaryValue}>
                        {totalScore.toFixed(1)} / {totalMaxMarks}
                    </span>
                </div>
                <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Percentage:</span>
                    <span style={styles.summaryValue}>
                        {totalMaxMarks > 0 ? ((totalScore / totalMaxMarks) * 100).toFixed(2) : 0}%
                    </span>
                </div>
                <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Grade Preview:</span>
                    <span style={{
                        ...styles.summaryValue,
                        color: (totalMaxMarks > 0 && (totalScore / totalMaxMarks) * 100 >= 80)
                            ? '#d1fae5'
                            : (totalMaxMarks > 0 && (totalScore / totalMaxMarks) * 100 >= 50)
                                ? '#fef3c7'
                                : '#fee2e2'
                    }}>
                        {(totalMaxMarks > 0 && (totalScore / totalMaxMarks) * 100 >= 80)
                            ? 'Green'
                            : (totalMaxMarks > 0 && (totalScore / totalMaxMarks) * 100 >= 50)
                                ? 'Amber'
                                : 'Red'}
                    </span>
                </div>
            </div>

            {/* Submit Button */}
            <div style={styles.submitContainer}>
                <button
                    onClick={handleSubmitEvaluation}
                    disabled={submitting}
                    style={{
                        ...styles.submitButton,
                        ...(submitting ? styles.submitButtonDisabled : {})
                    }}
                >
                    {submitting ? 'Submitting...' : 'Submit Evaluation'}
                </button>
            </div>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
    },
    header: {
        marginBottom: '24px',
    },
    backButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        color: '#333',
        marginBottom: '16px',
        transition: 'all 0.2s',
    },
    backButtonText: {
        fontWeight: '500',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1a1a1a',
        margin: 0,
    },
    infoCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    infoRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px',
        marginBottom: '20px',
    },
    infoItem: {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
    },
    infoIcon: {
        color: '#6366f1',
        marginTop: '2px',
    },
    infoLabel: {
        fontSize: '12px',
        color: '#666',
        margin: '0 0 4px 0',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    infoValue: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#1a1a1a',
        margin: '0 0 2px 0',
    },
    infoSubtext: {
        fontSize: '14px',
        color: '#888',
        margin: 0,
    },
    examTitle: {
        borderTop: '1px solid #e0e0e0',
        paddingTop: '16px',
    },
    evaluatedBadge: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: '#10b981',
        color: 'white',
        borderRadius: '8px',
        marginBottom: '24px',
        fontSize: '14px',
        fontWeight: '500',
    },
    badgeDate: {
        marginLeft: 'auto',
        fontSize: '13px',
        opacity: 0.9,
    },
    questionsContainer: {
        marginBottom: '24px',
    },
    questionCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    questionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '2px solid #f0f0f0',
    },
    questionNumber: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#6366f1',
        margin: 0,
    },
    maxMarks: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#666',
        backgroundColor: '#f0f0f0',
        padding: '4px 12px',
        borderRadius: '12px',
    },
    questionTitle: {
        fontSize: '16px',
        fontWeight: '500',
        color: '#1a1a1a',
        marginBottom: '20px',
        lineHeight: '1.6',
    },
    answerSection: {
        marginBottom: '20px',
    },
    answerLabel: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '8px',
    },
    answerBox: {
        backgroundColor: '#f9fafb',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px',
        fontSize: '14px',
        color: '#333',
        lineHeight: '1.6',
        minHeight: '80px',
        whiteSpace: 'pre-wrap',
    },
    noAnswer: {
        color: '#999',
    },
    scoreSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #e0e0e0',
    },
    scoreLabel: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#333',
    },
    scoreInputGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    scoreInput: {
        width: '100px',
        padding: '8px 12px',
        fontSize: '16px',
        fontWeight: '600',
        border: '2px solid #6366f1',
        borderRadius: '8px',
        textAlign: 'center',
        outline: 'none',
    },
    scoreMax: {
        fontSize: '16px',
        fontWeight: '600',
        color: '#666',
    },
    summaryCard: {
        backgroundColor: '#6366f1',
        color: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
    },
    summaryRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
    },
    summaryLabel: {
        fontSize: '16px',
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: '24px',
        fontWeight: '700',
    },
    submitContainer: {
        display: 'flex',
        justifyContent: 'center',
    },
    submitButton: {
        padding: '16px 48px',
        fontSize: '16px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: '#10b981',
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    },
    submitButtonDisabled: {
        backgroundColor: '#999',
        cursor: 'not-allowed',
        boxShadow: 'none',
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '16px',
    },
    spinner: {
        width: '48px',
        height: '48px',
        border: '4px solid #f0f0f0',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    loadingText: {
        fontSize: '16px',
        color: '#666',
    },
    errorContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        fontSize: '18px',
        color: '#666',
    },
};

export default TrainerEvaluationPage;
