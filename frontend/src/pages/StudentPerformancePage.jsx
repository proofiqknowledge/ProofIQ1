import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentPerformancePage() {
    const { user, token } = useSelector(s => s.auth);
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token || !user) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                const userId = user.id || user._id; // Handle both id formats
                if (!userId) {
                    setError("User ID not found. Please log in again.");
                    setLoading(false);
                    return;
                }

                const res = await api.get(`/exams/analytics/student/${userId}/detailed`);
                if (res.data && res.data.success) {
                    setData(res.data.data);
                } else {
                    setError("Failed to load data.");
                }
            } catch (err) {
                console.error("Failed to load performance data", err);
                setError(err.response?.data?.message || "Error loading performance data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, token, navigate]);

    if (loading) return <div style={{ padding: '32px', textAlign: 'center' }}>Loading performance data...</div>;
    if (error) return <div style={{ padding: '32px', textAlign: 'center', color: '#ef4444' }}>{error}</div>;
    if (!data) return <div style={{ padding: '32px', textAlign: 'center' }}>No performance data available.</div>;

    const { summary, strengths, weaknesses, history } = data;

    // Styles
    const containerStyle = { maxWidth: '1200px', margin: '0 auto', padding: '32px', fontFamily: 'Inter, sans-serif' };
    const headerStyle = { fontSize: '24px', fontWeight: 'bold', marginBottom: '32px', color: '#1f2937' };
    const cardStyle = { backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' };
    const labelStyle = { fontSize: '14px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' };
    const valueStyle = { fontSize: '36px', fontWeight: 'bold', margin: 0 };
    const sectionHeaderStyle = { fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' };
    const listStyle = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' };
    const listItemStyle = { display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' };

    return (
        <div style={containerStyle}>
            <button
                onClick={() => navigate('/student')}
                style={{
                    marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px',
                    color: '#4b5563', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px'
                }}
            >
                ← Back to Dashboard
            </button>

            <h1 style={headerStyle}>📈 My Performance Insights</h1>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div style={cardStyle}>
                    <p style={labelStyle}>Average Score</p>
                    <p style={{ ...valueStyle, color: '#2563eb' }}>{summary.avgScore}%</p>
                </div>
                <div style={cardStyle}>
                    <p style={labelStyle}>Exams Passed</p>
                    <p style={{ ...valueStyle, color: '#10b981' }}>{summary.passedExams}<span style={{ fontSize: '20px', color: '#9ca3af' }}>/{summary.totalExamsTaken}</span></p>
                </div>
                <div style={cardStyle}>
                    <p style={labelStyle}>Proficiency Level</p>
                    <p style={{ ...valueStyle, color: '#8b5cf6' }}>
                        {summary.avgScore >= 80 ? 'Advanced' : (summary.avgScore >= 60 ? 'Intermediate' : 'Beginner')}
                    </p>
                </div>
            </div>

            {/* Strengths & Weaknesses Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div style={{ ...cardStyle, borderLeft: '4px solid #4ade80' }}>
                    <h3 style={{ ...sectionHeaderStyle, color: '#166534' }}>
                        💪 Strong Areas (≥ 80%)
                    </h3>
                    {strengths.length > 0 ? (
                        <ul style={listStyle}>
                            {strengths.map((s, i) => (
                                <li key={i} style={listItemStyle}>
                                    <span style={{ fontWeight: 500, color: '#374151' }}>{s.examTitle}</span>
                                    <span style={{ fontWeight: 'bold', color: '#16a34a' }}>{s.score}%</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '14px' }}>Keep practicing to build your strengths!</p>
                    )}
                </div>

                <div style={{ ...cardStyle, borderLeft: '4px solid #f87171' }}>
                    <h3 style={{ ...sectionHeaderStyle, color: '#991b1b' }}>
                        🎯 Focus Areas ({'<'} 50%)
                    </h3>
                    {weaknesses.length > 0 ? (
                        <ul style={listStyle}>
                            {weaknesses.map((s, i) => (
                                <li key={i} style={listItemStyle}>
                                    <span style={{ fontWeight: 500, color: '#374151' }}>{s.examTitle}</span>
                                    <span style={{ fontWeight: 'bold', color: '#dc2626' }}>{s.score}%</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p style={{ color: '#6b7280', fontStyle: 'italic', fontSize: '14px' }}>Great job! No major weak areas detected.</p>
                    )}
                </div>
            </div>

            {/* Score Trend Chart Row - Full Width */}
            <div style={cardStyle}>
                <h3 style={{ ...sectionHeaderStyle, color: '#1f2937' }}>Score History</h3>
                <div style={{ height: '350px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[...history].reverse().slice(0, 15)} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis dataKey="title" tick={{ fontSize: 12, fill: '#6b7280' }} interval={0} angle={-20} textAnchor="end" height={60} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(v) => `${v}%`} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
