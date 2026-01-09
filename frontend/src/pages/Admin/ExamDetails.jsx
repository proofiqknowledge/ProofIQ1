import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import * as examService from '../../services/examService';
import AdminExamCandidatesTable from '../../components/AdminExamCandidatesTable';

const pageStyle = {
  minHeight: '100vh',
  padding: '1.5rem',
  backgroundColor: '#f1f5f9',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const breadcrumbButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  background: 'transparent',
  border: 'none',
  color: '#1d4ed8',
  fontWeight: 600,
  cursor: 'pointer',
  marginBottom: '1.5rem',
  fontSize: '0.95rem',
};

const summaryCardStyle = {
  background: 'linear-gradient(135deg, rgba(59,130,246,0.09), rgba(15,118,110,0.07))',
  borderRadius: '16px',
  padding: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.rem',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  boxShadow: '0 20px 45px -30px rgba(30, 64, 175, 0.35)'
};

const statsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '1.25rem',
};

const statTileStyle = {
  backgroundColor: 'rgba(255,255,255,0.75)',
  borderRadius: '12px',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
  border: '1px solid rgba(226, 232, 240, 0.8)',
  backdropFilter: 'blur(6px)'
};

const statValueStyle = {
  fontSize: '1.6rem',
  fontWeight: 700,
  color: '#0f172a',
  letterSpacing: '-0.04em',
};

const statLabelStyle = {
  fontSize: '0.85rem',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontWeight: 600,
};

const rowDividerStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '1rem',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderTop: '1px solid rgba(148, 163, 184, 0.2)',
  paddingTop: '1rem',
};

const metaPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  backgroundColor: 'rgba(15, 118, 110, 0.1)',
  color: '#0f766e',
  padding: '0.5rem 1rem',
  borderRadius: '999px',
  fontWeight: 600,
  fontSize: '0.9rem',
};

const openButtonStyle = {
  padding: '0.75rem 1.5rem',
  borderRadius: '14px',
  border: '1px solid rgba(30, 64, 175, 0.5)',
  backgroundColor: '#1d4ed8',
  color: '#ffffff',
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '0.95rem',
  cursor: 'pointer',
  boxShadow: '0 18px 30px -20px rgba(29, 78, 216, 0.55)'
};

const analyticsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '1rem',
  marginTop: '1.5rem',
};

const analyticsCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '1.15rem',
  border: '1px solid #e2e8f0',
  boxShadow: '0 12px 30px -18px rgba(15, 23, 42, 0.2)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const analyticsLabelStyle = {
  fontSize: '0.8rem',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontWeight: 600,
};

const analyticsValueStyle = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#0f172a',
  letterSpacing: '-0.02em',
};

const gradeListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const gradeRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.6rem 0.85rem',
  borderRadius: '10px',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  fontWeight: 600,
  color: '#0f172a',
};

const gradeBadgeStyle = (color) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.35rem 0.7rem',
  borderRadius: '999px',
  fontSize: '0.78rem',
  fontWeight: 600,
  color,
  backgroundColor: `${color}1A`,
});

const LoadingState = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    padding: '6rem 0',
    color: '#64748b',
  }}>
    <div style={{
      width: '52px',
      height: '52px',
      borderRadius: '50%',
      border: '4px solid #e2e8f0',
      borderTopColor: '#1d4ed8',
      animation: 'spin 1s linear infinite',
    }} />
    <p style={{ margin: 0, fontSize: '0.95rem' }}>Loading analytics...</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const EmptyState = ({ title, description }) => (
  <div style={{
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '3rem',
    border: '1px dashed #cbd5f5',
    textAlign: 'center',
    color: '#64748b',
  }}>
    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', color: '#0f172a' }}>{title}</h3>
    <p style={{ margin: 0 }}>{description}</p>
  </div>
);

const AdminExamDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { examId } = useParams();
  const { user } = useSelector((state) => state.auth);

  // Check if we navigated from a course/module page
  const backPath = location.state?.from;
  const backLabel = backPath && backPath.includes('/courses/') ? '← Back to Course' : '← Back to Exams';

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate('/admin/exams');
    }
  };

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (!examId) return;

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await examService.getExamAnalytics(examId);
        setAnalytics(response.data || response);
      } catch (error) {
        const message = error.response?.data?.message || 'Failed to load exam analytics';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [examId]);

  useEffect(() => {
    if (user && !["admin", "master"].includes(user.role?.toLowerCase())) {
      toast.error('You are not authorized to view this page.');
    }
  }, [user]);

  // ... (lines 259-274 are definitions)
  const examTitle = analytics?.exam?.title || 'Exam Analytics';
  const questionCount = analytics?.exam?.questions?.length || 0;
  const qualificationPercentage = analytics?.exam?.qualificationPercentage ?? 65;
  const excellentMin = analytics?.exam?.excellentMin ?? 90;
  const goodMin = analytics?.exam?.goodMin ?? 80;
  const averageMin = analytics?.exam?.averageMin ?? 65;

  const passFailSummary = analytics?.passFail || { qualified: 0, notQualified: 0 };
  const gradeDistribution = analytics?.gradeDistribution || { green: 0, amber: 0, red: 0 };

  const gradeMetadata = useMemo(() => ([
    { label: 'Green', value: gradeDistribution.green, color: '#2ECC71', threshold: `≥ ${excellentMin}%` },
    { label: 'Amber', value: gradeDistribution.amber, color: '#F39C12', threshold: `≥ ${goodMin}%` },
    { label: 'Red', value: gradeDistribution.red, color: '#E74C3C', threshold: `< ${goodMin}%` },
  ]), [gradeDistribution, excellentMin, goodMin]);

  if (!user || !["admin", "master"].includes(user.role?.toLowerCase())) {
    return (
      <div style={pageStyle}>
        <button type="button" onClick={() => navigate('/admin/exams')} style={breadcrumbButtonStyle}>
          ← Back to Assessments
        </button>
        <EmptyState title="Access Restricted" description="Only administrators can view exam analytics." />
      </div>
    );
  }

  const invited = analytics?.assignedCount ?? 0;
  // Fix to work with both old and new backend
  const attempted = analytics?.submittedCount
    ?? analytics?.attemptedCount
    ?? 0;
  const qualified = analytics?.qualifiedCount ?? 0;
  const qualifyingRate = analytics?.percentageQualified ?? 0;

  const candidateThresholds = {
    qualificationPercentage,
    excellentMin,
    goodMin,
    averageMin,
  };

  return (
    <div style={pageStyle}>
      <button type="button" onClick={handleBack} style={breadcrumbButtonStyle}>
        {backLabel}
      </button>

      {loading ? (
        <LoadingState />
      ) : !analytics ? (
        <EmptyState title="No Analytics Available" description="We couldn’t find analytics for this exam just yet." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div style={summaryCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>{examTitle}</h1>
                <p style={{ margin: '0.35rem 0 0', color: '#475569', fontSize: '0.95rem' }}>
                  Comprehensive overview of candidate performance and exam engagement.
                </p>
              </div>
            </div>

            <div style={statsGridStyle}>
              <div style={statTileStyle}>
                <span style={statLabelStyle}>Qualifying</span>
                <span style={statValueStyle}>{qualifyingRate ? `${Number(qualifyingRate).toFixed(0)}%` : '0%'}</span>
                <span style={{ color: '#0f766e', fontSize: '0.85rem', fontWeight: 600 }}>Qualified vs Attempted</span>
              </div>
              <div style={statTileStyle}>
                <span style={statLabelStyle}>Questions</span>
                <span style={statValueStyle}>{questionCount}</span>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Total published</span>
              </div>
            </div>

            <div style={rowDividerStyle}>
              <span style={{ color: '#334155', fontWeight: 600, fontSize: '0.95rem' }}>
                {invited} invited / {attempted} assessed / {qualified} qualified
              </span>
              <span style={metaPillStyle}>
                🎯 Qualification target: {qualificationPercentage}%
              </span>
            </div>
          </div>

          <div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Analytics Overview</h2>
            <div style={analyticsGridStyle}>
              <div style={analyticsCardStyle}>
                <span style={analyticsLabelStyle}>Total Assigned</span>
                <span style={analyticsValueStyle}>{invited}</span>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  Learners who have this assessment scheduled.
                </p>
              </div>
              <div style={analyticsCardStyle}>
                <span style={analyticsLabelStyle}>Total Attempted</span>
                <span style={analyticsValueStyle}>{attempted}</span>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  Marked as submitted or graded.
                </p>
              </div>
              <div style={analyticsCardStyle}>
                <span style={analyticsLabelStyle}>Qualified</span>
                <span style={analyticsValueStyle}>{qualified}</span>
                <p style={{ margin: 0, color: '#0f766e', fontWeight: 600, fontSize: '0.9rem' }}>
                  Pass rate of {qualifyingRate ? `${Number(qualifyingRate).toFixed(1)}%` : '0%'}
                </p>
              </div>
              <div style={analyticsCardStyle}>
                <span style={analyticsLabelStyle}>Pass / Fail</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ color: '#15803d', fontWeight: 600, fontSize: '1.1rem' }}> {passFailSummary.qualified} Qualified</span>
                  <span style={{ color: '#b91c1c', fontWeight: 600, fontSize: '1.1rem' }}> {passFailSummary.notQualified} Not Qualified</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>Grade Distribution</h2>
            <div style={gradeListStyle}>
              {gradeMetadata.map((grade) => (
                <div key={grade.label} style={gradeRowStyle}>
                  <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', color: '#0f172a' }}>
                    <span style={gradeBadgeStyle(grade.color)}>{grade.label}</span>
                    <small style={{ color: '#64748b', fontWeight: 500 }}>Threshold {grade.threshold}</small>
                  </span>
                  <span style={{ fontSize: '1.1rem' }}>{grade.value}</span>
                </div>
              ))}
            </div>
          </div>

          <AdminExamCandidatesTable
            candidates={analytics.candidates || []}
            thresholds={candidateThresholds}
            onApproveCandidate={(candidate) => toast.success(`${candidate.name} marked as approved`)}
            onFlagCandidate={(candidate) => toast.warn(`${candidate.name} flagged for review`)}
            onViewReport={(candidate) => {
              if (!candidate?.submissionId) {
                toast.info('No submission available to review yet.');
                return;
              }
              navigate(`/admin/exams/${examId}/report/${candidate.submissionId}`);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AdminExamDetails;
