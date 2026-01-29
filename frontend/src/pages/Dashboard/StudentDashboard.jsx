import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchUserDashboard } from '../../services/userService';
import { toast } from 'react-toastify';
import StudentProgressDashboard from '../../components/StudentProgressDashboard';
import StudentExamDashboard from '../Exams/StudentExamDashboard';
import ClaimPointsButton from '../../components/ClaimPointsButton';


export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showProgress, setShowProgress] = useState(false);
  const [showExamDashboard, setShowExamDashboard] = useState(false);
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const isLoggingOut =
  sessionStorage.getItem('logout_in_progress') === 'true';

useEffect(() => {
  // 🚫 BLOCK dashboard fetch during logout
  if (isLoggingOut) return;

  if (!token || !user) {
    setError('Authentication required');
    setLoading(false);
    return;
  }

  setLoading(true);
  fetchUserDashboard()
    .then(response => {
      setData(response);
      setError('');
    })
    .catch(err => {
      const message = err.response?.data?.message || 'Could not load dashboard';
      setError(message);
      toast.error(message);
    })
    .finally(() => setLoading(false));
}, [token, user, isLoggingOut]);


  // Listen for progress updates triggered elsewhere (e.g. when a video is acknowledged)
  useEffect(() => {
  const handler = async () => {
    if (sessionStorage.getItem('logout_in_progress') === 'true') return;

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const refreshed = await fetchUserDashboard();
      if (refreshed && refreshed.courses) {
        setData(refreshed);
        setError('');
      }
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
    }
  };

  window.addEventListener('courseProgressUpdated', handler);
  return () => window.removeEventListener('courseProgressUpdated', handler);
}, []);



  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  // Show Progress Dashboard when button is clicked
  if (showProgress) {
    return (
      <div className="student-dashboard">
        <button
          className="back-button"
          onClick={() => setShowProgress(false)}
        >
          ← Back to Dashboard
        </button>
        {/* Pass courses to keep dashboard and chart in sync */}
        <StudentProgressDashboard studentId={user?.id} courses={data.courses} />
      </div>
    );
  }

  // Show Exam Dashboard when button is clicked
  if (showExamDashboard) {
    return (
      <div className="student-dashboard">
        <button
          className="back-button"
          onClick={() => setShowExamDashboard(false)}
        >
          ← Back to Dashboard
        </button>
        <StudentExamDashboard studentId={user?.id} />
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <h1>🎓 Dashboard</h1>
        <p>Welcome back, {user?.name || 'Learner'}!</p>
      </header>


      {/* Reward Points */}
      <section className="reward-card">
        <h2>Reward Points</h2>
        <p className="points">{data.rewardPoints}</p>
      </section>

      {/* Progress Button */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <button
          className="progress-button"
          onClick={() => setShowProgress(true)}
        >
          📊 View Detailed Progress
        </button>
        <button
          className="progress-button"
          style={{ marginLeft: 12 }}
          onClick={() => setShowExamDashboard(true)}
        >
          🧪 Assessment Progress
        </button>
      </div>


      {/* Courses Section */}
      <section className="courses-section">
        <h2>Your Courses & Progress</h2>
        <div className="course-grid">
          {data.courses.map(c => {
            const totalModules = Number.isFinite(+c.totalModules) ? +c.totalModules : (Array.isArray(c.weeks) ? c.weeks.length : undefined);
            const watched = Number.isFinite(+c.watchedCount) ? +c.watchedCount : (Array.isArray(c.completedmodules) ? c.completedmodules.length : (Array.isArray(c.completedWeeks) ? c.completedWeeks.length : 0));
            const percent = typeof c.percentCompleted === 'number' ? Math.max(0, Math.min(100, c.percentCompleted)) : (totalModules ? Math.round((watched / totalModules) * 100) : 0);
            const remaining = (typeof totalModules === 'number' ? Math.max(0, totalModules - watched) : null);
            const completedWeeks = Array.isArray(c.completedWeeks) ? c.completedWeeks.length : (Array.isArray(c.completedmodules) ? c.completedmodules.length : 0);
            const lastActivity = c.lastActivity || c.lastWatchedAt || c.updatedAt || 'Not yet';

            return (
              <div
                key={c.courseId}
                className="course-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/courses/${c.courseId}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/courses/${c.courseId}`); }}
                onMouseMove={(e) => {
                  const el = e.currentTarget;
                  const rect = el.getBoundingClientRect();
                  const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
                  const py = (e.clientY - rect.top) / rect.height - 0.5;
                  const rx = (-py * 6).toFixed(2);
                  const ry = (px * 8).toFixed(2);
                  el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
                  el.style.boxShadow = '0 26px 64px rgba(16,24,40,0.16)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = '';
                  el.style.boxShadow = '';
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="course-card-inner">
                  <div className="left">
                    <div className="progress-circle" aria-hidden>
                      <svg viewBox="0 0 36 36">
                        <path className="circle-bg" d="M18 2.0845a15.9155 15.9155 0 1 0 0 31.831a15.9155 15.9155 0 1 0 0-31.831" />
                        <path className="circle" strokeDasharray={`${percent}, 100`} d="M18 2.0845a15.9155 15.9155 0 1 0 0 31.831a15.9155 15.9155 0 1 0 0-31.831" />
                        <text x="18" y="20.35" className="circle-text">{percent}%</text>
                      </svg>
                    </div>
                  </div>
                  <div className="right">
                    <h3>{c.title}</h3>
                    <p className="small muted">{c.subtitle || c.instructor || ''}</p>

                    <div className="stat-grid">
                      <div className="stat-card">
                        <div className="stat-value">{totalModules ? `${watched} / ${totalModules}` : `${watched}`}</div>
                        <div className="stat-label">Topics watched</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{remaining === null ? '—' : remaining}</div>
                        <div className="stat-label">Remaining</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">{completedWeeks}</div>
                        <div className="stat-label">Completed modules</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value small-value">{lastActivity}</div>
                        <div className="stat-label">Last activity</div>
                      </div>
                    </div>
                    {/* Claim points area: show total claimed points for this course */}
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {(() => {
                        const claimedArr = Array.isArray(c.completedWeeksPointsClaimed) ? c.completedWeeksPointsClaimed : [];
                        const claimedCount = claimedArr.length;
                        const totalClaimedPoints = claimedCount * 100;
                        if (claimedCount > 0) {
                          return (
                            <div className="claim-pill claimed" style={{ display: 'inline-flex', alignItems: 'center' }}>
                              {totalClaimedPoints} Points Claimed
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>


      {/* Exams Section */}
      <section className="exams-section">
        <h2>Assessments Attempted</h2>
        <div className="table-wrapper">
          <table className="exam-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>module</th>
                <th>Score</th>
                <th>Total</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {data.exams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="no-exams">
                    No assessments attempted yet.
                  </td>
                </tr>
              ) : (
                data.exams.map((e, i) => (
                  <tr key={i}>
                    <td>{e.course?.title || '-'}</td>
                    <td>{e.module || 'Final'}</td>
                    <td>{e.score}</td>
                    <td>{e.totalQuestions}</td>
                    <td>
                      <span className={`grade-badge ${(e.grade || (e.passed ? 'Green' : 'Red')).toLowerCase()}`}>
                        {e.grade || (e.passed ? 'Green' : 'Red')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>


      {/* Inline Styles with Brand Colors */}
      <style>{`
        /* === General Layout === */
        .student-dashboard {
          font-family: 'Segoe UI', Roboto, sans-serif;
          background: #FFFFFF;
          min-height: 100vh;
          padding: 30px 20px;
          color: #1A1A1A;
        }


        .dashboard-header {
          text-align: center;
          margin-bottom: 30px;
        }


        .dashboard-header h1 {
          font-size: 2.2rem;
          margin-bottom: 5px;
          color: #9B1C36;
          font-weight: 800;
          letter-spacing: -0.5px;
        }


        .dashboard-header p {
          color: #6C6E70;
          font-size: 1rem;
          font-weight: 400;
        }


        /* === Reward Points === */
        .reward-card {
          background: linear-gradient(135deg, #9B1C36 0%, #B83B52 100%);
          color: #FFFFFF;
          padding: 30px;
          border-radius: 14px;
          text-align: center;
          margin-bottom: 30px;
          box-shadow: 0 8px 24px rgba(155, 28, 54, 0.25);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .reward-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 300px;
          height: 300px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          z-index: 1;
        }

        .reward-card h2 {
          font-size: 1.2rem;
          margin-bottom: 10px;
          font-weight: 600;
          position: relative;
          z-index: 2;
          color: #FFFFFF;  /* ← WHITE TEXT */
        }

        .reward-card .points {
          font-size: 2.8rem;
          font-weight: 800;
          position: relative;
          z-index: 2;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          color: #FFFFFF;  /* ← WHITE TEXT */
        }

        .reward-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 36px rgba(155, 28, 54, 0.35);
        }



        /* === Courses Section === */
        .courses-section h2 {
          font-size: 1.5rem;
          color: #1A1A1A;
          margin-bottom: 20px;
          font-weight: 700;
        }


        .course-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }


        .course-card {
          background: #FFFFFF;
          padding: 24px;
          border-radius: 12px;
          border: 2px solid #E5E7EB;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: transform 320ms cubic-bezier(.2,.9,.3,1), box-shadow 220ms ease, border-color 180ms ease;
          transform-style: preserve-3d;
          transform-origin: center;
        }


        .course-card:hover {
          transform: translateY(-12px) perspective(900px) rotateX(2deg);
          box-shadow: 0 26px 64px rgba(16,24,40,0.12);
          border-color: #9B1C36;
        }


        .course-card h3 {
          font-size: 1.15rem;
          color: #1A1A1A;
          margin-bottom: 8px;
          font-weight: 700;
        }

        /* Inner layout for improved trainer / student progress card */
        .course-card-inner {
          display: flex;
          gap: 18px;
          align-items: center;
        }

        .course-card .left {
          flex: 0 0 92px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .course-card .right {
          flex: 1 1 auto;
        }

        .claim-pill {
          background: #16a34a;
          color: white;
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.9rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          border: none;
        }

        .claim-pill.claimed {
          background: rgba(16,163,74,0.12);
          color: #065f46;
          border: 1px solid rgba(16,163,74,0.18);
        }

        .progress-circle svg {
          width: 72px;
          height: 72px;
          transform: rotate(-90deg);
          overflow: visible;
        }

        .progress-circle .circle-bg {
          fill: none;
          stroke: #f1f5f9;
          stroke-width: 3.6;
        }

        .progress-circle .circle {
          fill: none;
          stroke: url(#);
          stroke-linecap: round;
          stroke-width: 3.6;
          stroke: linear-gradient(90deg, #9B1C36, #B83B52);
          stroke: #9B1C36;
          transition: stroke-dasharray 0.6s ease;
        }

        .progress-circle .circle-text {
          font-size: 8px;
          text-anchor: middle;
          fill: #0b7285;
          transform: rotate(90deg);
        }

        .stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .stat-card {
          background: #FBFDFF;
          border: 1px solid #EEF2F6;
          padding: 10px 12px;
          border-radius: 10px;
          box-shadow: 0 6px 18px rgba(16,24,40,0.04);
        }

        .stat-value {
          font-weight: 700;
          color: #0b7285;
          font-size: 1rem;
        }

        .stat-label {
          margin-top: 6px;
          color: #6C6E70;
          font-size: 0.78rem;
        }

        .small.muted { color: #6C6E70; margin-top: 2px; }



        .progress-text {
          color: #6C6E70;
          font-size: 0.9rem;
          margin-bottom: 12px;
          font-weight: 500;
        }


        .progress-bar {
          width: 100%;
          background: #E5E7EB;
          border-radius: 8px;
          height: 10px;
          overflow: hidden;
        }


        .progress-fill {
          height: 10px;
          background: linear-gradient(90deg, #9B1C36 0%, #B83B52 100%);
          border-radius: 8px;
          transition: width 0.5s ease;
          box-shadow: 0 0 8px rgba(155, 28, 54, 0.3);
        }


        .modules {
          margin-top: 12px;
          font-size: 0.85rem;
          color: #6C6E70;
          font-weight: 500;
        }


        /* === Exams Table === */
        .exams-section h2 {
          font-size: 1.5rem;
          margin: 40px 0 20px 0;
          color: #1A1A1A;
          font-weight: 700;
        }


        .table-wrapper {
          overflow-x: auto;
          background: #FFFFFF;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #E5E7EB;
        }


        .exam-table {
          width: 100%;
          border-collapse: collapse;
        }


        .exam-table th, .exam-table td {
          padding: 14px 16px;
          text-align: left;
          border-bottom: 1px solid #E5E7EB;
          font-size: 0.95rem;
        }


        .exam-table th {
          background: #F8FAFC;
          color: #1A1A1A;
          font-weight: 600;
          border-bottom: 2px solid #9B1C36;
        }


        .exam-table tbody tr {
          transition: background-color 0.2s ease;
        }


        .exam-table tbody tr:hover td {
          background: #F8FAFC;
        }


        .exam-table td {
          color: #1A1A1A;
        }


        .grade-badge {
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          display: inline-block;
          font-size: 0.85rem;
          text-transform: capitalize;
        }
        .grade-badge.green {
          color: #2ECC71;
          background: rgba(46, 204, 113, 0.1);
        }
        .grade-badge.amber {
          color: #F39C12;
          background: rgba(243, 156, 18, 0.1);
        }
        .grade-badge.red {
          color: #E74C3C;
          background: rgba(231, 76, 60, 0.1);
        }


        .no-exams {
          text-align: center;
          color: #6C6E70;
          padding: 20px;
          font-weight: 500;
        }


        /* === Utility Styles === */
        .loading {
          text-align: center;
          margin-top: 100px;
          font-size: 1.2rem;
          color: #9B1C36;
          font-weight: 600;
        }

        /* .back-button moved to global stylesheet (src/index.css) */

        .progress-button {
          padding: 12px 32px;
          background: linear-gradient(135deg, #9B1C36 0%, #B83B52 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(155, 28, 54, 0.25);
        }

        .progress-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(155, 28, 54, 0.35);
        }

        .progress-button:active {
          transform: translateY(0);
        }

        .error {
          text-align: center;
          margin-top: 100px;
          font-size: 1.2rem;
          color: #dc2626;
          font-weight: 600;
          padding: 20px;
          background: #FFEBEE;
          border-radius: 10px;
          border-left: 4px solid #dc2626;
        }


        /* === Responsive Design === */
        @media (max-width: 768px) {
          .student-dashboard {
            padding: 20px 10px;
          }


          .dashboard-header h1 {
            font-size: 1.8rem;
          }


          .reward-card .points {
            font-size: 2.2rem;
          }


          .reward-card {
            padding: 20px;
          }


          .course-grid {
            grid-template-columns: 1fr;
          }


          .exam-table th, .exam-table td {
            padding: 10px 8px;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}
