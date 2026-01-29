import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ClipboardList, User, Calendar, CheckCircle, Clock } from 'lucide-react';

const TrainerExamEvaluationsPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [exams, setExams] = useState([]);
    const [submissions, setSubmissions] = useState({});

    useEffect(() => {
        fetchPendingEvaluations();
    }, []);

    const fetchPendingEvaluations = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

            console.log('Fetching pending evaluations...');
            console.log('Token:', token ? 'Present' : 'Missing');
            console.log('API URL:', `${API_URL}/trainer/evaluation/pending`);

            // Fetch all pending evaluations from the new endpoint
            const response = await axios.get(
                `${API_URL}/trainer/evaluation/pending`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log('Full Response:', response);
            console.log('Response status:', response.status);
            console.log('Response data:', response.data);
            console.log('Response data.success:', response.data.success);
            console.log('Response data.exams:', response.data.exams);

            if (response.data.success) {
                const examsData = response.data.exams || [];
                console.log('Exams data:', examsData);
                console.log('Number of exams:', examsData.length);

                if (examsData.length > 0) {
                    console.log('First exam:', examsData[0]);
                }

                // Directly use the exams and submissions from backend
                setExams(examsData);

                // Create submissions map
                const submissionsMap = {};
                examsData.forEach(exam => {
                    submissionsMap[exam._id] = exam.submissions || [];
                    console.log(`  - Exam ${exam.title}: ${exam.submissions?.length || 0} submissions`);
                });

                setSubmissions(submissionsMap);
                console.log('State updated successfully');
            } else {
                console.warn('Response success is false');
            }
        } catch (error) {
            console.error('Error fetching evaluations:', error);
            console.error('Error response:', error.response);
            console.error('Error message:', error.message);
            toast.error(error.response?.data?.message || 'Failed to load evaluations');
        } finally {
            setLoading(false);
        }
    };

    const handleEvaluate = (submissionId) => {
        navigate(`/trainer/submission/${submissionId}/evaluate`);
    };

    const getPendingCount = (examId) => {
        const examSubmissions = submissions[examId] || [];
        return examSubmissions.filter(sub => !sub.isEvaluated).length;
    };

    const getCompletedCount = (examId) => {
        const examSubmissions = submissions[examId] || [];
        return examSubmissions.filter(sub => sub.isEvaluated).length;
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingContainer}>
                    <div style={styles.spinner}></div>
                    <p style={styles.loadingText}>Loading evaluations...</p>
                </div>
            </div>
        );
    }

    // The exams from backend already have submissions, no need to filter again
    console.log('Exams to display:', exams.length);


    return (
        <div style={styles.container}>
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .exam-card {
          transition: all 0.3s ease;
        }
        .exam-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }
        .submission-row {
          transition: background-color 0.2s;
        }
        .submission-row:hover {
          background-color: #f9fafb;
        }
        .evaluate-btn {
          transition: all 0.2s;
        }
        .evaluate-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
      `}</style>

            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerContent}>
                    <ClipboardList size={32} style={styles.headerIcon} />
                    <div>
                        <h1 style={styles.title}>Exam Evaluations</h1>
                        <p style={styles.subtitle}>Review and evaluate theory exam submissions</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statIcon} className="pending">
                        <Clock size={24} />
                    </div>
                    <div>
                        <div style={styles.statValue}>
                            {exams.reduce((sum, exam) => sum + getPendingCount(exam._id), 0)}
                        </div>
                        <div style={styles.statLabel}>Pending Evaluations</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#d1fae5', color: '#065f46' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <div style={styles.statValue}>
                            {exams.reduce((sum, exam) => sum + getCompletedCount(exam._id), 0)}
                        </div>
                        <div style={styles.statLabel}>Completed</div>
                    </div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statIcon, backgroundColor: '#dbeafe', color: '#1e40af' }}>
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <div style={styles.statValue}>{exams.length}</div>
                        <div style={styles.statLabel}>Total Exams</div>
                    </div>
                </div>
            </div>

            {/* Exams List */}
            {exams.length === 0 ? (
                <div style={styles.emptyState}>
                    <ClipboardList size={64} style={styles.emptyIcon} />
                    <h3 style={styles.emptyTitle}>No Evaluations Available</h3>
                    <p style={styles.emptyText}>
                        There are no theory exam submissions from your batches at the moment.
                    </p>
                </div>
            ) : (
                <div style={styles.examsContainer}>
                    {exams.map((exam) => {
                        const examSubs = submissions[exam._id] || exam.submissions || [];
                        const pending = examSubs.filter(sub => !sub.isEvaluated);
                        const completed = examSubs.filter(sub => sub.isEvaluated);


                        return (
                            <div key={exam._id} style={styles.examCard} className="exam-card">
                                <div style={styles.examHeader}>
                                    <div>
                                        <h3 style={styles.examTitle}>{exam.title}</h3>
                                        <div style={styles.examMeta}>
                                            <span style={styles.metaItem}>
                                                <Calendar size={14} />
                                                Total Questions: {exam.totalQuestionsCount || 0}
                                            </span>
                                            <span style={styles.metaItem}>
                                                Theory Questions: {exam.theoryQuestionsCount || 0}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={styles.examStats}>
                                        <div style={styles.statBadge}>
                                            <span style={styles.badgeValue}>{pending.length}</span>
                                            <span style={styles.badgeLabel}>Pending</span>
                                        </div>
                                        <div style={{ ...styles.statBadge, backgroundColor: '#d1fae5', color: '#065f46' }}>
                                            <span style={styles.badgeValue}>{completed.length}</span>
                                            <span style={styles.badgeLabel}>Done</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Submissions Table */}
                                <div style={styles.submissionsTable}>
                                    <div style={styles.tableHeader}>
                                        <div style={{ ...styles.tableCell, fontWeight: '600' }}>Student</div>
                                        <div style={{ ...styles.tableCell, fontWeight: '600' }}>Submitted</div>
                                        <div style={{ ...styles.tableCell, fontWeight: '600' }}>Status</div>
                                        <div style={{ ...styles.tableCell, fontWeight: '600', textAlign: 'right' }}>Action</div>
                                    </div>
                                    {examSubs.map((submission, idx) => (
                                        <div
                                            key={submission._id}
                                            style={{
                                                ...styles.submissionRow,
                                                backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb'
                                            }}
                                            className="submission-row"
                                        >
                                            <div style={styles.tableCell}>
                                                <div style={styles.studentInfo}>
                                                    <User size={18} style={styles.userIcon} />
                                                    <div>
                                                        <div style={styles.studentName}>{submission.student?.name}</div>
                                                        <div style={styles.studentEmail}>{submission.student?.email}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={styles.tableCell}>
                                                {new Date(submission.submittedAt).toLocaleDateString()}
                                            </div>
                                            <div style={styles.tableCell}>
                                                {submission.isEvaluated ? (
                                                    <span style={styles.statusBadgeCompleted}>
                                                        <CheckCircle size={14} />
                                                        Evaluated
                                                    </span>
                                                ) : (
                                                    <span style={styles.statusBadgePending}>
                                                        <Clock size={14} />
                                                        Pending
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ ...styles.tableCell, textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleEvaluate(submission._id)}
                                                    style={styles.evaluateButton}
                                                    className="evaluate-btn"
                                                >
                                                    {submission.isEvaluated ? 'View Evaluation' : 'Evaluate Now'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: '24px',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
    },
    header: {
        marginBottom: '32px',
    },
    headerContent: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    headerIcon: {
        color: '#6366f1',
    },
    title: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1a1a1a',
        margin: 0,
    },
    subtitle: {
        fontSize: '14px',
        color: '#666',
        margin: '4px 0 0 0',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
    },
    statCard: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    statIcon: {
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fef3c7',
        color: '#92400e',
    },
    statValue: {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1a1a1a',
    },
    statLabel: {
        fontSize: '13px',
        color: '#666',
        marginTop: '2px',
    },
    examsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    examCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
    },
    examHeader: {
        padding: '24px',
        borderBottom: '2px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '16px',
    },
    examTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1a1a1a',
        margin: '0 0 8px 0',
    },
    examMeta: {
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
    },
    metaItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        color: '#666',
    },
    examStats: {
        display: 'flex',
        gap: '12px',
    },
    statBadge: {
        padding: '8px 16px',
        borderRadius: '8px',
        backgroundColor: '#fef3c7',
        color: '#92400e',
        textAlign: 'center',
    },
    badgeValue: {
        display: 'block',
        fontSize: '20px',
        fontWeight: '700',
    },
    badgeLabel: {
        display: 'block',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    submissionsTable: {
        padding: '16px',
    },
    tableHeader: {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr',
        gap: '16px',
        padding: '12px 16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        marginBottom: '8px',
    },
    submissionRow: {
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr',
        gap: '16px',
        padding: '16px',
        borderRadius: '8px',
        alignItems: 'center',
    },
    tableCell: {
        fontSize: '14px',
        color: '#333',
    },
    studentInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    userIcon: {
        color: '#6366f1',
    },
    studentName: {
        fontSize: '14px',
        fontWeight: '600',
        color: '#1a1a1a',
    },
    studentEmail: {
        fontSize: '12px',
        color: '#666',
    },
    statusBadgePending: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: '#fef3c7',
        color: '#92400e',
    },
    statusBadgeCompleted: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: '#d1fae5',
        color: '#065f46',
    },
    evaluateButton: {
        padding: '8px 16px',
        backgroundColor: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
    },
    emptyState: {
        textAlign: 'center',
        padding: '80px 24px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    emptyIcon: {
        color: '#d1d5db',
        marginBottom: '16px',
    },
    emptyTitle: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1a1a1a',
        margin: '0 0 8px 0',
    },
    emptyText: {
        fontSize: '14px',
        color: '#666',
        margin: 0,
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
};

export default TrainerExamEvaluationsPage;
