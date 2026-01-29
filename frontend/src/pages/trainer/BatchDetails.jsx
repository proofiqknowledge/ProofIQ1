import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import React, { useState, useEffect } from 'react';

import api from '../../services/api';
import { removeStudent } from '../../services/batchService'; // Import the new service
import BatchAnalyticsDashboard from '../../components/BatchAnalyticsDashboard';

export default function BatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useSelector(s => s.auth);
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState(null);
  const [activeTab, setActiveTab] = useState('trainees'); // 'trainees' | 'analytics'

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
      return;
    }

    const role = (user?.role || '').toLowerCase();
    if (!['trainer', 'admin', 'master'].includes(role)) {
      navigate('/403');
      return;
    }

    const fetchBatch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/batches/${id}`);
        setBatch(res.data);
      } catch (err) {
        console.error('Failed to load batch', err);
        toast.error(err.response?.data?.message || 'Failed to load batch');
      } finally {
        setLoading(false);
      }
    };

    fetchBatch();
  }, [id, token, user, navigate]);

  const computeTotalModules = (course) => {
    if (!course || !Array.isArray(course.weeks)) return 0;
    // Treat each week as a module: module count = number of weeks
    return course.weeks.length || 0;
  };


  const computeStudentPercent = (student, course) => {
    // Backend already computed and returned explicit percentCompleted
    if (student.percentCompleted !== undefined && student.percentCompleted !== null) {
      return Math.min(100, Math.round(student.percentCompleted));
    }

    // Fallback (rare cases)
    if (!student || !Array.isArray(student.enrolledCourses)) return 0;

    const enrolled = student.enrolledCourses.find(ec =>
      String(ec.courseId) === String(course._id)
    );

    if (!enrolled) return 0;

    if (enrolled.percentCompleted !== undefined && enrolled.percentCompleted !== null) {
      return Math.min(100, Math.round(enrolled.percentCompleted));
    }

    return 0;
  };

  // Handler for removing student
  const handleRemoveStudent = async (studentId, studentName) => {
    if (window.confirm(`Are you sure you want to remove ${studentName} from this batch?\n\nTheir progress and work will be preserved, but they will no longer be linked to this batch.`)) {
      try {
        await removeStudent(id, studentId);
        toast.success(`Removed ${studentName} from batch`);
        // Update local state to remove student from list
        setBatch(prev => ({
          ...prev,
          users: prev.users.filter(u => u._id !== studentId)
        }));
      } catch (err) {
        console.error('Failed to remove student', err);
        toast.error(err.response?.data?.message || 'Failed to remove student');
      }
    }
  };

  if (loading) return <div className="page"><h2>Loading batch...</h2></div>;

  if (!batch) return <div className="page"><h2>Batch not found</h2></div>;

  const totalModules = computeTotalModules(batch.course);
  const canRemove = ['admin', 'master'].includes((user?.role || '').toLowerCase());

  return (
    <div className="page" style={{ padding: 18 }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/trainer/batches/progress')}
        style={{
          marginBottom: '16px',
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
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
        onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
      >
        ← Back to Batch Progress
      </button>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0, marginBottom: '8px' }}>{batch.name}</h1>
          <p className="muted" style={{ margin: 0 }}>{batch.course?.title || ''}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#6c6e70' }}>Trainer</div>
          <div style={{ fontWeight: 600 }}>{batch.trainer?.name || '—'}</div>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e0e0e0' }}>
        <button
          onClick={() => setActiveTab('trainees')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'trainees' ? '3px solid #0f172a' : '3px solid transparent',
            fontWeight: 600,
            color: activeTab === 'trainees' ? '#0f172a' : '#64748b',
            cursor: 'pointer',
            fontSize: '15px'
          }}
        >
          👥 Trainees
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            padding: '12px 24px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'analytics' ? '3px solid #0f172a' : '3px solid transparent',
            fontWeight: 600,
            color: activeTab === 'analytics' ? '#0f172a' : '#64748b',
            cursor: 'pointer',
            fontSize: '15px'
          }}
        >
          📊 Performance Analytics
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <BatchAnalyticsDashboard batchId={id} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
          <div>
            <div className="card batch-summary" style={{ padding: 12, borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#6c6e70' }}>Total modules</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{totalModules}</div>
              <div style={{ marginTop: 8, fontSize: 12 }}>
                Trainees: <strong>{(batch.users || []).length}</strong>
              </div>
            </div>
          </div>

          <div>
            <div className="card batch-users" style={{ padding: 12, borderRadius: 8 }}>
              <h3 style={{ marginTop: 0 }}>Trainees</h3>
              {(!batch.users || batch.users.length === 0) ? (
                <div className="muted">No trainees assigned to this batch.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                      <th style={{ padding: '8px 6px' }}>Name</th>
                      <th style={{ padding: '8px 6px' }}>Emp ID</th>
                      <th style={{ padding: '8px 6px' }}>Email</th>
                      <th style={{ padding: '8px 6px' }}>Progress</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center' }}>Action</th>
                      {canRemove && <th style={{ padding: '8px 6px', textAlign: 'center' }}>Manage</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {batch.users.map((u, idx) => (
                      <tr key={u._id} className="list-row" style={{ borderBottom: '1px solid #f6f6f6', transitionDelay: `${idx * 60}ms` }}>
                        <td style={{ padding: '10px 6px' }}>{u.name}</td>
                        <td style={{ padding: '10px 6px' }}>{u.employeeId || '-'}</td>
                        <td style={{ padding: '10px 6px' }}>{u.email}</td>
                        <td style={{ padding: '10px 6px' }}>{computeStudentPercent(u, batch.course)}%</td>
                        <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              navigate(`/trainer/batch/${id}/student/${u._id}/scores`);
                            }}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              background: '#fff',
                              color: '#2563eb',
                              fontSize: '13px',
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                          >
                            View Scores
                          </button>
                        </td>
                        {canRemove && (
                          <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleRemoveStudent(u._id, u.name)}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid #fee2e2',
                                borderRadius: '6px',
                                background: '#fff',
                                color: '#dc2626',
                                fontSize: '13px',
                                cursor: 'pointer',
                                fontWeight: 500
                              }}
                              title="Remove from batch"
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .muted { color: #6c6e70 }
        .card { background: linear-gradient(180deg,#fff,#fbfdff); box-shadow: 0 8px 26px rgba(16,24,40,0.04); transition: transform 220ms ease, box-shadow 220ms ease; border-radius: 10px }
        .batch-summary { will-change: transform; }
        .batch-summary:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(16,24,40,0.08); }
        .batch-users { transition: transform 260ms ease, box-shadow 260ms ease }
        .batch-users table thead th { font-weight: 600; color: #222; font-size: 14px; padding: 8px 6px; }
        .batch-users table tbody tr { transition: background 180ms ease, transform 220ms ease, opacity 360ms ease; opacity: 0; transform: translateY(6px); }
        .batch-users table tbody tr.list-row { opacity: 1; transform: translateY(0); }
        .batch-users table tr:hover { background: rgba(12,20,30,0.02); transform: translateX(4px); }
      `}</style>
    </div >
  );
}
