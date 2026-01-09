import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = {
    pass: '#10B981',
    fail: '#EF4444',
    avg: '#3B82F6'
};

export default function BatchAnalyticsDashboard({ batchId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!batchId) return;

        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/exams/analytics/batch/${batchId}/performance`);
                if (res.data && res.data.success) {
                    setData(res.data.data);
                } else {
                    setError("Failed to load analytics data");
                }
            } catch (err) {
                console.error("Error fetching batch analytics:", err);
                setError("Error loading analytics. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [batchId]);

    if (loading) return <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading analytics...</div>;
    if (error) return <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>{error}</div>;
    if (!data) return <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No data available.</div>;

    const { overview, modulePerformance, leaderboard, atRiskStudents } = data;

    const passFailData = [
        { name: 'Passed', value: overview.passCount },
        { name: 'Failed', value: overview.failCount }
    ];

    return (
        <div style={{ background: '#f9fafb', padding: '24px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: '#1f2937' }}>📊 Batch Performance Analytics</h2>

            {/* Overview Cards */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <div className="analytics-card" style={cardStyle}>
                    <p style={cardLabelStyle}>Avg Batch Score</p>
                    <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>{overview.avgBatchScore}%</p>
                </div>
                <div className="analytics-card" style={cardStyle}>
                    <p style={cardLabelStyle}>Pass Rate</p>
                    <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#10b981', margin: 0 }}>
                        {overview.totalSubmissions > 0 ? ((overview.passCount / overview.totalSubmissions) * 100).toFixed(0) : 0}%
                    </p>
                </div>
            </div>

            {/* Charts Section */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                {/* Pass vs Fail */}
                <div style={{ ...chartSectionStyle, flex: 1, minWidth: '350px' }}>
                    <h3 style={sectionHeaderStyle}>Pass vs Fail Distribution</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={passFailData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {passFailData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Passed' ? COLORS.pass : COLORS.fail} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Module Performance */}
                <div style={{ ...chartSectionStyle, flex: 1.5, minWidth: '350px' }}>
                    <h3 style={sectionHeaderStyle}>Average Performance per Module</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={modulePerformance} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="moduleTitle" hide /> {/* Hide overly long module names */}
                                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#f3f4f6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="avgScore" name="Avg Score" fill={COLORS.avg} radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '-10px' }}>Modules (Hover for details)</p>
                </div>
            </div>

            {/* Lists Section */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {/* Leaderboard */}
                <div style={{ ...chartSectionStyle, flex: 1, minWidth: '350px' }}>
                    <h3 style={sectionHeaderStyle}>🏆 Top Performers</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <th style={{ ...thStyle, textAlign: 'left', width: '120px' }}>Rank</th>
                                    <th style={{ ...thStyle, textAlign: 'left' }}>Student</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Avg Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((student, idx) => (
                                    <tr key={student.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ ...tdStyle, color: '#4b5563', fontWeight: 500, textAlign: 'left' }}>#{idx + 1}</td>
                                        <td style={{ ...tdStyle, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 500, color: '#1f2937' }}>{student.name}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{student.email}</div>
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: '#2563eb' }}>{student.avgScore}%</td>
                                    </tr>
                                ))}
                                {leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>No data available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* At Risk Students */}
                <div style={{ ...chartSectionStyle, flex: 1, minWidth: '350px', borderLeft: '4px solid #f87171' }}>
                    <h3 style={{ ...sectionHeaderStyle, color: '#dc2626' }}>⚠️ At Risk Students (Avg {'<'} 50%)</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <th style={{ ...thStyle, textAlign: 'left' }}>Student</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Avg Score</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {atRiskStudents.map((student) => (
                                    <tr key={student.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ ...tdStyle, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 500, color: '#1f2937' }}>{student.name}</div>
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>{student.avgScore}%</td>
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                            <button style={{
                                                fontSize: '12px',
                                                background: '#fef2f2',
                                                color: '#dc2626',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: '1px solid #fecaca',
                                                cursor: 'pointer'
                                            }}>
                                                Notify
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {atRiskStudents.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ padding: '16px', textAlign: 'center', color: '#10b981', fontWeight: 500 }}>🎉 No students at risk!</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
                .analytics-card:hover {
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
}

// Inline Styles
const cardStyle = {
    flex: 1,
    minWidth: '200px',
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s ease-in-out'
};

const cardLabelStyle = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '8px',
    margin: 0
};

const chartSectionStyle = {
    background: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    border: '1px solid #f3f4f6'
};

const sectionHeaderStyle = {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '20px',
    color: '#374151',
    margin: '0 0 20px 0'
};

const thStyle = {
    padding: '12px 0',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const tdStyle = {
    padding: '12px 0',
    fontSize: '14px'
};
