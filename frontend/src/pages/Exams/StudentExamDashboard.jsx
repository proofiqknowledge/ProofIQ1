import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import examService from '../../services/examService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// Small helper for formatting
const formatPercent = (n) => (n === null || n === undefined ? '-' : `${Number(n).toFixed(1)}%`);

const COLORS = {
  completed: '#10B981',
  inProgress: '#F59E0B',
  notStarted: '#EF4444',
  primary: '#9B1C36',
  subtle: '#f3f4f6',
};

export default function StudentExamDashboard({ studentId: propStudentId }) {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const studentId = propStudentId || user?.id;

  const [exams, setExams] = useState([]); // merged list of assigned + results
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!studentId) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch progress (summarized exam results) and assigned exams (to include in-progress / not started)
        const [progressResp, assignedResp] = await Promise.all([
          api.get(`/progress/${studentId}`),
          examService.getAssignedExams().catch((e) => ({ data: { data: [] } })),
        ].map((p) => p.catch ? p : Promise.resolve(p)));

        const progressList = Array.isArray(progressResp?.data?.exams) ? progressResp.data.exams : (Array.isArray(progressResp?.data) ? progressResp.data : []);
        const progressData = progressList.map((r) => ({
          // Keep examResult-like data
          examId: `res_${r.courseName || ''}_${r.module ?? 'final'}_${new Date(r.attemptedAt || r.date || Date.now()).getTime()}`,
          title: r.title || `${r.courseName || 'Course'} — ${r.module ?? 'Final'}`,
          courseId: r.courseId || r.courseId || null,
          courseName: r.courseName || '',
          module: (() => {
            const val = r.module ?? r.week ?? r.moduleName ?? null;
            if (val === null || val === undefined) return null;
            // Try to coerce numeric week values to number, otherwise keep string
            const num = Number(val);
            return Number.isFinite(num) ? num : val;
          })(),
          // Use percentage from server if present; do not compute on the client
          percentage: typeof r.percentage === 'number' ? r.percentage : null,
          attemptedAt: r.attemptedAt || r.date || null,
          status: 'graded',
          passed: !!r.passed,
          source: 'result'
        }));

        const assignedListSource = Array.isArray(assignedResp?.data?.data) ? assignedResp.data.data : (Array.isArray(assignedResp?.data) ? assignedResp.data : []);
        const assignedList = assignedListSource.map((a) => ({
          examId: a.examId,
          title: a.title || `Exam ${a.examId}`,
          courseId: a.courseId || a.course?._id || a.rawExam?.courseId || a.rawExam?.course?._id || null,
          courseName: a.courseName || a.course?.title || '',
          module: typeof a.module === 'number' ? a.module : (a.module || a.week || a.rawExam?.weekNumber || null),
          // Prefer percentage from the server; leave null when not provided so the UI can display '-' or 'Not started'
          percentage: typeof a.percentage === 'number' ? a.percentage : null,
          status: (a.status || 'not_started'),
          attemptedAt: a.submission?.submittedAt || a.submission?.updatedAt || null,
          source: 'assigned',
        })) || [];

        // Also fetch module exams from the student's enrolled courses
        const moduleExamsFromCourses = [];
        const courses = progressResp?.data?.courses || [];
        if (Array.isArray(courses) && courses.length) {
          // fetch module exams for each course in parallel, ignore failures
          const moduleReqs = courses.map((c) => {
            const courseId = c.courseId || c.id || c._id;
            if (!courseId) return Promise.resolve({ data: { data: [] } });
            return examService.getModuleExamsForCourse(courseId).catch((_) => ({ data: { data: [] } }));
          });

          const moduleResponses = await Promise.all(moduleReqs);
          for (let idx = 0; idx < moduleResponses.length; idx++) {
            const mr = moduleResponses[idx];
            const course = courses[idx];
            const courseName = course?.courseName || course?.title || '';
            const courseId = course?.courseId || course?.id || course?._id;
            const items = (mr?.data?.data || mr?.data || []);
            if (Array.isArray(items) && items.length) {
              for (const it of items) {
                moduleExamsFromCourses.push({
                  examId: it.examId,
                  title: it.title,
                  courseName: courseName,
                  module: typeof it.weekNumber === 'number' ? it.weekNumber : (it.weekNumber ?? null),
                  courseId: it.courseId || courseId,
                  percentage: it.percentage ?? 0,
                  status: 'not_started',
                  attemptedAt: null,
                  source: 'module',
                });
              }
            }
          }
        }

        // Merge assigned, module and progress entries: prefer stable keys
        const mergedMap = new Map();
        const assignedById = new Map();
        const assignedByCourseModule = new Map();
        const assignedByTitle = new Map();

        // Put assigned first (these include in_progress / not_started / graded info)
        for (const a of assignedList) {
          const key = a.examId || `${a.title}_${a.attemptedAt || ''}`;
          mergedMap.set(key, { ...a });
          if (a.examId) assignedById.set(String(a.examId), key);
          if (a.courseId && (a.module !== null && a.module !== undefined)) {
            assignedByCourseModule.set(`${String(a.courseId)}|${String(a.module)}`, key);
          }
          if (a.title) assignedByTitle.set(a.title, key);
        }

        // Add module exams (dedupe by examId), and also register course|module keys
        for (const m of moduleExamsFromCourses) {
          if (!m.examId) continue;
          const key = m.examId;
          if (!mergedMap.has(key)) {
            mergedMap.set(key, { ...m });
            if (m.courseId && (m.module !== null && m.module !== undefined)) {
              assignedByCourseModule.set(`${String(m.courseId)}|${String(m.module)}`, key);
            }
            if (m.title) assignedByTitle.set(m.title, key);
          }
        }

        // Add results (some results may not have examId)
        for (const r of progressData) {
          // Try to find match keys in order: courseId|module, exact title, examId
          let foundKey = null;
          if (r.courseId !== null && r.courseId !== undefined && r.module !== null && r.module !== undefined) {
            const cmKey = `${String(r.courseId)}|${String(r.module)}`;
            if (assignedByCourseModule.has(cmKey)) foundKey = assignedByCourseModule.get(cmKey);
          }
          if (!foundKey && r.title && assignedByTitle.has(r.title)) {
            foundKey = assignedByTitle.get(r.title);
          }
          if (!foundKey && r.examId && assignedById.has(String(r.examId))) {
            foundKey = assignedById.get(String(r.examId));
          }
          // last resort: try a loose title match by startsWith (handles "Course — Final")
          if (!foundKey && r.title) {
            for (const [tKey, mapKey] of assignedByTitle.entries()) {
              if (tKey && r.title && tKey.trim().toLowerCase() === r.title.trim().toLowerCase()) {
                foundKey = mapKey;
                break;
              }
            }
          }

          if (foundKey) {
            // update existing assigned record to mark completion and copy details
            const existing = mergedMap.get(foundKey) || {};
            mergedMap.set(foundKey, {
              ...existing,
              percentage: r.percentage ?? existing.percentage ?? 0,
              attemptedAt: existing.attemptedAt || r.attemptedAt,
              status: 'graded',
              source: 'merged',
            });
          } else {
            // Put the result as a standalone entry
            const key = r.examId || `${r.title}_${r.attemptedAt || ''}`;
            mergedMap.set(key, { ...r });
          }
        }

        // Prefer server-supplied percentage values; do not compute percentages from marks on the client
        const merged = Array.from(mergedMap.values())
          .map((m) => ({
            ...m,
            percentage: typeof m.percentage === 'number' ? Number(Number(m.percentage).toFixed(2)) : null,
            attemptedAt: m.attemptedAt ? new Date(m.attemptedAt) : null,
          }))
          .sort((a, b) => {
            // Sort with attemptedAt descending so most recent first
            if (a.attemptedAt && b.attemptedAt) return b.attemptedAt - a.attemptedAt;
            if (a.attemptedAt) return -1;
            if (b.attemptedAt) return 1;
            return 0;
          });

        setExams(merged);
      } catch (err) {
        console.error('Failed to load assessment dashboard data', err);
        setError('Failed to load assessment analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  // Derived stats
  const totalExams = exams.length;
  const completedExams = exams.filter((e) => e.status === 'graded' || e.status === 'submitted').length;
  const percentScores = exams.filter(e => typeof e.percentage === 'number').map(e => Number(e.percentage));
  const avgScore = percentScores.length ? (percentScores.reduce((s, v) => s + v, 0) / percentScores.length) : 0;
  const highScore = percentScores.length ? Math.max(...percentScores) : 0;
  const lowScore = percentScores.length ? Math.min(...percentScores) : 0;

  // Data for charts
  const barData = exams.map((e) => ({ name: e.title, percentage: typeof e.percentage === 'number' ? e.percentage : 0 }));

  const pieDistribution = useMemo(() => {
    const dist = { Completed: 0, 'In Progress': 0, 'Not Started': 0 };
    exams.forEach((e) => {
      if (e.status === 'graded' || e.status === 'submitted') dist.Completed++;
      else if (e.status === 'in_progress') dist['In Progress']++;
      else dist['Not Started']++;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [exams]);

  const lineData = exams
    .filter((e) => e.attemptedAt && typeof e.percentage === 'number')
    .map((e) => ({ date: e.attemptedAt, percentage: e.percentage }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // loading / error states
  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ marginBottom: 12 }} className="muted">Loading analytics...</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', padding: 40, color: 'red' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#f9fafb', minHeight: '100vh' }}>
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#333' }}>My Exams</h1>
          <p style={{ margin: '4px 0 0', color: '#666' }}>Track your assessment progress</p>
        </div>
        <button
          onClick={() => navigate('/student/performance')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(99, 102, 241, 0.3)'
          }}
        >
          📊 View Performance Analytics
        </button>
      </header>
      <p style={{ margin: 0, color: '#64748b' }}>Overview of all your assessments — module, normal and final</p>

      {/* Large Bar Chart at the top — occupies first row (big) */}
      <div style={{ marginBottom: 18, background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>📈 Assessment Scores (All Assessments)</h3>
        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 16, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-40} textAnchor="end" height={70} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} ticks={[0, 25, 50, 75, 100]} />
              <Tooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.96)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      minWidth: '180px'
                    }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                        {data.name}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#666' }}>Score:</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#9B1C36' }}>
                            {data.percentage ? Number(data.percentage).toFixed(1) : 0}%
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
                            backgroundColor: (data.percentage >= 70) ? COLORS.completed : ((data.percentage >= 40) ? COLORS.inProgress : COLORS.notStarted) // Simple logic derived from score
                          }}>
                            {data.percentage >= 70 ? 'Pass' : 'Not Qualified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }} />
              <Bar dataKey="percentage" fill={COLORS.primary} radius={[6, 6, 0, 0]} animationDuration={800}>
                {barData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.primary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Statistic Cards (moved under the bar chart) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 18 }}>
        <div style={{ padding: 16, borderRadius: 12, background: '#fff', boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Total Exams</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{totalExams}</div>
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: '#fff', boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Completed</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{completedExams}</div>
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: '#fff', boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Average Score</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatPercent(avgScore)}</div>
        </div>
        <div style={{ padding: 16, borderRadius: 12, background: '#fff', boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Best / Worst</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{formatPercent(highScore)} / {formatPercent(lowScore)}</div>
        </div>
      </div>

      {/* Next row: Performance Trend, Pie Chart, Recent Exams */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Performance Trend - Line Chart */}
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
          <h3 style={{ margin: 0, marginBottom: 12 }}>📉 Performance Trend</h3>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString()} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} ticks={[0, 25, 50, 75, 100]} />
                <Tooltip labelFormatter={(label) => new Date(label).toLocaleString()} formatter={(value) => [`${Number(value).toFixed(1)}%`]} />
                <Legend />
                <Line type="monotone" dataKey="percentage" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} animationDuration={800} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart - Status Distribution */}
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
          <h3 style={{ margin: 0, marginBottom: 12 }}>🥧 Status Distribution</h3>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {pieDistribution.map((entry, idx) => (
                    <Cell key={`p-${idx}`} fill={entry.name === 'Completed' ? COLORS.completed : entry.name === 'In Progress' ? COLORS.inProgress : COLORS.notStarted} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exam List (tiny) */}
        <div style={{ background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' }}>
          <h3 style={{ margin: 0, marginBottom: 12 }}>📚 Recent Assessments</h3>
          <div style={{ overflow: 'auto', maxHeight: 320 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '8px 6px' }}>Assessment</th>
                  <th style={{ padding: '8px 6px' }}>Module</th>
                  <th style={{ padding: '8px 6px' }}>Status</th>
                  <th style={{ padding: '8px 6px' }}>Score</th>
                  <th style={{ padding: '8px 6px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((ex) => (
                  <tr key={ex.examId} style={{ borderBottom: '1px solid #f7fafc' }}>
                    <td style={{ padding: '8px 6px' }}>{ex.title}</td>
                    <td style={{ padding: '8px 6px' }}>{ex.module ? (typeof ex.module === 'number' ? `Week ${ex.module}` : ex.module) : 'Final'}</td>
                    <td style={{ padding: '8px 6px' }}>{ex.status === 'graded' ? 'Completed' : ex.status === 'in_progress' ? 'In Progress' : 'Not Started'}</td>
                    <td style={{ padding: '8px 6px' }}>{typeof ex.percentage === 'number' ? `${ex.percentage.toFixed(1)}%` : '-'}</td>
                    <td style={{ padding: '8px 6px' }}>{ex.attemptedAt ? new Date(ex.attemptedAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
