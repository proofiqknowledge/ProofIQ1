import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import { toast } from 'react-toastify';

export default function BatchStudentScores() {
    const { id: batchId, studentId } = useParams();
    const navigate = useNavigate();
    const { user, token } = useSelector(s => s.auth);
    const [loading, setLoading] = useState(true);
    const [studentData, setStudentData] = useState(null);
    const [batchName, setBatchName] = useState('');

    useEffect(() => {
        if (!token || !user) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // We reuse getBatch because it already computes the complex exam results logic
                const res = await api.get(`/batches/${batchId}`);
                const batch = res.data;
                setBatchName(batch.name);

                const student = batch.users.find(u => String(u._id) === String(studentId));
                if (student) {
                    setStudentData(student);
                } else {
                    toast.error('Student not found in this batch');
                }
            } catch (err) {
                console.error('Failed to load batch data', err);
                toast.error('Failed to load scores');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [batchId, studentId, token, user, navigate]);

    if (loading) return <div className="page" style={{ padding: 20 }}><h2>Loading scores...</h2></div>;
    if (!studentData) return <div className="page" style={{ padding: 20 }}><h2>Student not found</h2></div>;

    return (
        <div className="page" style={{ padding: 24, width: '100%', boxSizing: 'border-box' }}>
            <button
                onClick={() => navigate(`/trainer/batch/${batchId}`)}
                style={{
                    marginBottom: '20px',
                    padding: '8px 16px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#374151'
                }}
                onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
                onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
            >
                ← Back to Batch
            </button>

            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                    <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#0f172a' }}>Exam Scores</h1>
                    <div style={{ display: 'flex', gap: '24px', color: '#64748b', fontSize: '14px' }}>
                        <span><strong>Student:</strong> {studentData.name}</span>
                        <span><strong>Batch:</strong> {batchName}</span>
                        <span><strong>Progress:</strong> {studentData.percentCompleted}%</span>
                    </div>
                </div>

                <div style={{ padding: '24px' }}>
                    {(!studentData.examResults || studentData.examResults.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #e2e8f0' }}>
                            <p style={{ color: '#64748b', margin: 0 }}>No exam attempts recorded for this student.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', color: '#475569', textTransform: 'uppercase', fontSize: '12px' }}>Module / Exam</th>
                                        <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#475569', textTransform: 'uppercase', fontSize: '12px' }}>Video Progress</th>
                                        <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#475569', textTransform: 'uppercase', fontSize: '12px' }}>Score</th>
                                        <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600', color: '#475569', textTransform: 'uppercase', fontSize: '12px' }}>Status</th>
                                        <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600', color: '#475569', textTransform: 'uppercase', fontSize: '12px' }}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentData.examResults.map((result, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '16px', color: '#334155' }}>
                                                {result.module ? <span style={{ fontWeight: 600 }}>Module {result.module}</span> : <span style={{ fontWeight: 700, color: '#2563eb' }}>Final Exam</span>}
                                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{result.title}</div>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                                                {result.videoProgress && result.videoProgress.total > 0 ? (
                                                    <div style={{ fontWeight: 600, color: result.videoProgress.watched === result.videoProgress.total ? '#15803d' : '#334155' }}>
                                                        {result.videoProgress.watched} / {result.videoProgress.total}
                                                        <div style={{
                                                            fontSize: '15px',
                                                            color: '#64748b',
                                                            marginTop: '2px',
                                                            fontWeight: 700
                                                        }}>
                                                            {Math.round((result.videoProgress.watched / result.videoProgress.total) * 100)}%
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#cbd5e1' }}>-</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'center', color: '#0f172a' }}>
                                                {result.status === 'NO_EXAM' ? (
                                                    <span style={{ color: '#cbd5e1' }}>--</span>
                                                ) : (
                                                    <>
                                                        {result.status === 'IN_PROGRESS' ? (
                                                            <div style={{ fontWeight: 600, fontSize: '16px', color: '#1d4ed8' }}>
                                                                Pending
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div style={{ fontWeight: 600, fontSize: '16px' }}>
                                                                    {result.score} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '14px' }}>/ {result.totalQuestions}</span>
                                                                </div>
                                                                {result.status !== 'NOT_ATTEMPTED' && (
                                                                    <div style={{
                                                                        fontSize: '15px',
                                                                        marginTop: '4px',
                                                                        color: (result.totalQuestions > 0 && (result.score / result.totalQuestions) >= 0.5) ? '#15803d' : '#b91c1c',
                                                                        fontWeight: 700
                                                                    }}>
                                                                        {result.totalQuestions > 0 ? Math.round((result.score / result.totalQuestions) * 100) : 0}%
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                {result.status === 'NO_EXAM' ? (
                                                    <span style={{
                                                        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                                                        backgroundColor: '#f1f5f9', color: '#64748b',
                                                        display: 'inline-block', minWidth: '80px', textAlign: 'center'
                                                    }}>
                                                        No Exam
                                                    </span>
                                                ) : result.status === 'NOT_ATTEMPTED' ? (
                                                    <span style={{
                                                        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                                                        backgroundColor: '#fef3c7', color: '#d97706',
                                                        display: 'inline-block', minWidth: '100px', textAlign: 'center'
                                                    }}>
                                                        Not Attempted
                                                    </span>
                                                ) : result.status === 'IN_PROGRESS' ? (
                                                    <span style={{
                                                        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                                                        backgroundColor: '#dbeafe', color: '#1d4ed8',
                                                        display: 'inline-block', minWidth: '100px', textAlign: 'center'
                                                    }}>
                                                        In Progress
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                                                        backgroundColor: result.passed ? '#dcfce7' : '#fee2e2',
                                                        color: result.passed ? '#15803d' : '#b91c1c',
                                                        display: 'inline-block', minWidth: '80px', textAlign: 'center'
                                                    }}>
                                                        {result.passed ? 'PASS' : 'FAIL'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right', color: '#64748b' }}>
                                                {result.date ? (
                                                    <>
                                                        {new Date(result.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                                            {new Date(result.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </>
                                                ) : <span style={{ color: '#cbd5e1' }}>--</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
