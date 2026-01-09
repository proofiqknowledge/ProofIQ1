import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BarChart, PieChart, Bar, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// 🎨 Chart Colors
const COLORS = {
  completed: '#10B981',
  inProgress: '#F59E0B',
  notStarted: '#EF4444',
  bar: '#9B1C36',
};

const StudentProgressDashboard = ({ studentId, courses }) => {
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('both'); // 'both', 'bar', 'pie'

  useEffect(() => {
    // Use provided prop if present; else fetch as before
    if (Array.isArray(courses) && courses.length) {
      // Normalize shape for chart needs: { courseName, completionPercent, status }
      setProgressData(
        courses.map(c => ({
          courseName: c.courseName || c.title || c.course?.title || 'Untitled',
          completionPercent: c.percentCompleted ?? c.completionPercent ?? c.completion ?? 0,
          // Granular data for tooltips
          watchedCount: Number.isFinite(Number(c.watchedCount))
            ? Number(c.watchedCount)
            : (Array.isArray(c.completedmodules)
              ? c.completedmodules.length
              : (Array.isArray(c.completedWeeks) ? c.completedWeeks.length : 0)),
          totalModules: Number.isFinite(Number(c.totalModules))
            ? Number(c.totalModules)
            : (Array.isArray(c.weeks)
              ? c.weeks.reduce((acc, w) => acc + (Array.isArray(w.days) ? w.days.length : 0), 0)
              : 0),
          status: c.status || (c.percentCompleted === 100 || c.completionPercent === 100 || c.completion === 100 ? 'Completed' : (c.percentCompleted > 0 || c.completionPercent > 0 || c.completion > 0 ? 'In Progress' : 'Not Started'))
        }))
      );
      setLoading(false);
      setError(null);
      return;
    }
    if (!studentId) return;
    const loadProgress = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(`/progress/${studentId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const fetched = (res?.data?.courses || []).map((c) => ({
          courseName: c.courseName || c.title || c.course?.title || 'Untitled',
          completionPercent: c.percentCompleted ?? c.completionPercent ?? c.completion ?? 0,
          // Granular data for tooltips
          watchedCount: Number.isFinite(Number(c.watchedCount))
            ? Number(c.watchedCount)
            : (Array.isArray(c.completedmodules)
              ? c.completedmodules.length
              : (Array.isArray(c.completedWeeks) ? c.completedWeeks.length : 0)),
          totalModules: Number.isFinite(Number(c.totalModules))
            ? Number(c.totalModules)
            : (Array.isArray(c.weeks)
              ? c.weeks.reduce((acc, w) => acc + (Array.isArray(w.days) ? w.days.length : 0), 0)
              : 0),
          status: c.status || (c.percentCompleted === 100 || c.completionPercent === 100 || c.completion === 100 ? 'Completed' : (c.percentCompleted > 0 || c.completionPercent > 0 || c.completion > 0 ? 'In Progress' : 'Not Started'))
        }));
        setProgressData(fetched);
        setError(null);
      } catch (err) {
        setError('Unable to fetch progress data');
      } finally {
        setLoading(false);
      }
    };
    loadProgress();
  }, [studentId, courses]);


  // Pie chart: count of courses by status
  const calculateStatusDistribution = () => {
    const distribution = {
      Completed: 0,
      'In Progress': 0,
      'Not Started': 0,
    };
    progressData.forEach((c) => {
      if (distribution[c.status] !== undefined) {
        distribution[c.status]++;
      }
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  };

  const statusDistribution = calculateStatusDistribution();
  const statusColors = {
    Completed: COLORS.completed,
    'In Progress': COLORS.inProgress,
    'Not Started': COLORS.notStarted,
  };

  // Custom tooltips
  const CustomBarTooltip = ({ active, payload }) =>
    active && payload && payload.length ? (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        minWidth: '200px'
      }}>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
          {payload[0].payload.courseName}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>Progress:</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#9B1C36' }}>
              {payload[0].value}%
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>Modules:</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>
              {payload[0].payload.watchedCount ?? 0} / {payload[0].payload.totalModules ?? '?'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>Status:</span>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'white',
              padding: '2px 8px',
              borderRadius: '99px',
              backgroundColor: payload[0].payload.status === 'Completed' ? COLORS.completed : (payload[0].payload.status === 'In Progress' ? COLORS.inProgress : COLORS.notStarted)
            }}>
              {payload[0].payload.status}
            </span>
          </div>
        </div>
      </div>
    ) : null;

  const CustomPieTooltip = ({ active, payload }) =>
    active && payload && payload.length ? (
      <div style={{
        backgroundColor: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #e0e0e0',
      }}>
        <p style={{ fontSize: '12px', fontWeight: 600 }}>
          {payload[0].name}: {payload[0].value}
        </p>
      </div>
    ) : null;

  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px' }}>Loading progress...</div>;
  if (error) return <div style={{ textAlign: 'center', color: 'red', marginTop: '100px' }}>{error}</div>;
  if (!progressData.length) return <div style={{ textAlign: 'center', marginTop: '100px' }}>No assigned courses yet.</div>;

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      fontFamily: 'Roboto, Lato, sans-serif',
    }}>
      <h2 style={{ textAlign: 'center', color: '#1a1a1a', fontSize: '28px', fontWeight: 700 }}>
        📊 Trainee Progress Dashboard
      </h2>
      <p style={{ textAlign: 'center', color: '#6c6e70', marginBottom: '24px' }}>
        Track your progress across {progressData.length} course{progressData.length !== 1 ? 's' : ''}.
      </p>

      {/* Chart toggles */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '24px' }}>
        {['both', 'bar', 'pie'].map((type) => (
          <button
            key={type}
            onClick={() => setChartType(type)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              backgroundColor: chartType === type ? '#9B1C36' : '#e8eaed',
              color: chartType === type ? 'white' : '#1a1a1a',
            }}
          >
            {type === 'both' ? '📊 Both Charts' : type === 'bar' ? '📈 Bar Chart' : '🥧 Pie Chart'}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: chartType === 'both' ? '1fr 1fr' : '1fr',
        gap: '24px',
      }}>
        {(chartType === 'both' || chartType === 'bar') && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>📈 Course Completion %</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="courseName" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend />
                <Bar dataKey="completionPercent" fill={COLORS.bar} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {(chartType === 'both' || chartType === 'pie') && (
          <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>🥧 Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={index} fill={statusColors[entry.name]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
};

export default StudentProgressDashboard;
