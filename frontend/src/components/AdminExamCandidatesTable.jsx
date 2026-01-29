import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import CheatingDetailsModal from './CheatingDetailsModal'; // ✅ Import

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  evaluated: 'Evaluated',
};

const DEFAULT_THRESHOLDS = {
  green: 80,
  amber: 50,
};

const formatDate = (dateValue) => {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDuration = (seconds) => {
  if (!seconds && seconds !== 0) return '—';
  const totalSeconds = Number(seconds);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '—';

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  }

  if (minutes > 0) {
    return `${minutes}m${remainingSeconds ? ` ${remainingSeconds}s` : ''}`;
  }

  return `${remainingSeconds}s`;
};

const normalizeString = (value) => (value || '').toString().toLowerCase();

const getScoreColors = (percentage, thresholds = DEFAULT_THRESHOLDS) => {
  if (percentage === null || percentage === undefined || Number.isNaN(percentage)) {
    return { text: '#64748b', background: '#e2e8f0' };
  }

  const numericScore = Number(percentage);
  if (!Number.isFinite(numericScore)) {
    return { text: '#64748b', background: '#e2e8f0' };
  }

  const greenThreshold = thresholds.excellentMin || thresholds.green || 80;
  const amberThreshold = thresholds.goodMin || thresholds.amber || 50;

  if (numericScore >= greenThreshold) {
    return { text: '#2ECC71', background: '#dcfce7' };
  }
  if (numericScore >= amberThreshold) {
    return { text: '#F39C12', background: '#fef08a' };
  }
  return { text: '#E74C3C', background: '#fee2e2' };
};

const sortValues = {
  name: (candidate) => normalizeString(candidate.name),
  email: (candidate) => normalizeString(candidate.email),
  status: (candidate) => normalizeString(candidate.status),
  joinedAt: (candidate) => new Date(candidate.joinedAt || 0).getTime(),
  submittedAt: (candidate) => new Date(candidate.submittedAt || 0).getTime(),
  timeTaken: (candidate) => candidate.timeTaken ?? Number.NEGATIVE_INFINITY,
  percentage: (candidate) => candidate.percentage ?? Number.NEGATIVE_INFINITY,
  cheatingDetected: (candidate) => candidate.cheatingDetected ? 1 : 0,
};

const AdminExamCandidatesTable = ({
  candidates = [],
  thresholds = DEFAULT_THRESHOLDS,
  onApproveCandidate = () => { },
  onFlagCandidate = () => { },
  onViewReport = () => { },
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [collapsedBatches, setCollapsedBatches] = useState(new Set());
  const [selectedCheatCandidate, setSelectedCheatCandidate] = useState(null); // ✅ State for modal

  const toggleBatch = (batchId) => {
    setCollapsedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  // Group candidates by batch
  const candidatesByBatch = useMemo(() => {
    const groups = {};
    candidates.forEach(candidate => {
      const batchKey = candidate.batchId || 'unassigned';
      const batchName = candidate.batchName || 'Unassigned';
      if (!groups[batchKey]) {
        groups[batchKey] = {
          batchId: batchKey,
          batchName: batchName,
          candidates: []
        };
      }
      groups[batchKey].candidates.push(candidate);
    });
    return Object.values(groups);
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    const term = normalizeString(searchTerm);
    if (!term) return candidates;

    return candidates.filter((candidate) => {
      const nameMatch = normalizeString(candidate.name).includes(term);
      const emailMatch = normalizeString(candidate.email).includes(term);
      return nameMatch || emailMatch;
    });
  }, [candidates, searchTerm]);

  const sortedCandidates = useMemo(() => {
    const sortableCandidates = [...filteredCandidates];
    const { key, direction } = sortConfig;

    const extractor = sortValues[key];
    if (!extractor) {
      return sortableCandidates;
    }

    sortableCandidates.sort((a, b) => {
      const valueA = extractor(a);
      const valueB = extractor(b);

      if (valueA === valueB) return 0;
      if (valueA === undefined || valueA === null) return 1;
      if (valueB === undefined || valueB === null) return -1;

      const comparison = valueA > valueB ? 1 : -1;
      return direction === 'asc' ? comparison : -comparison;
    });

    return sortableCandidates;
  }, [filteredCandidates, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const iconForSort = (key) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const handleExportJson = () => {
    const payload = sortedCandidates.map((candidate) => ({
      ...candidate,
      joinedAt: candidate.joinedAt ? new Date(candidate.joinedAt).toISOString() : null,
      submittedAt: candidate.submittedAt ? new Date(candidate.submittedAt).toISOString() : null,
    }));

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exam-candidates.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (!sortedCandidates.length) {
      handleExportJson();
      return;
    }

    const headers = ['Batch', 'Name', 'Email', 'Status', 'Joined', 'Submitted', 'Time Taken (s)', 'Final Score (%)', 'Grade', 'Qualified', 'Cheating Detected'];
    const rows = sortedCandidates.map((candidate) => [
      candidate.batchName || 'Unassigned',
      candidate.name,
      candidate.email,
      STATUS_LABELS[candidate.status] || 'Pending',
      candidate.joinedAt ? new Date(candidate.joinedAt).toISOString() : '',
      candidate.submittedAt ? new Date(candidate.submittedAt).toISOString() : '',
      candidate.timeTaken ?? '',
      candidate.percentage ?? '',
      candidate.grade ?? '',
      candidate.qualified ? 'Yes' : 'No',
      candidate.cheatingDetected ? 'Yes' : 'No',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'exam-candidates.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 12px 30px -15px rgba(15, 23, 42, 0.25)', border: '1px solid #e2e8f0' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Candidates</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Track assessment completion, performance, and proctoring indicators in real time.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px', maxWidth: '320px' }}>
            <input
              type="search"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: '1px solid #cbd5f5',
                fontSize: '0.95rem',
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportJson}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                border: '1px solid #cbd5f5',
                backgroundColor: '#ffffff',
                color: '#1d4ed8',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              JSON Export
            </button>
            <button
              onClick={handleExportCsv}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                border: '1px solid #1d4ed8',
                backgroundColor: '#1d4ed8',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              CSV Export
            </button>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              {[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'status', label: 'Status' },
                { key: 'joinedAt', label: 'Joined' },
                { key: 'timeTaken', label: 'Time Taken' },
                { key: 'percentage', label: 'Final Score' },
                { key: 'grade', label: 'Grade' },
                { key: 'cheatingDetected', label: 'Cheating' },
                { key: 'actions', label: 'Actions', sortable: false },
              ].map((column) => (
                <th
                  key={column.key}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                  style={{
                    textAlign: column.key === 'actions' ? 'center' : 'left',
                    padding: '1rem 1.25rem',
                    fontSize: '0.75rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#64748b',
                    fontWeight: 700,
                    cursor: column.sortable === false ? 'default' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    {column.label}
                    {column.sortable === false ? null : (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{iconForSort(column.key)}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedCandidates.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem' }}>
                  No candidates found for the current filters.
                </td>
              </tr>
            ) : (
              candidatesByBatch.map((batch) => {
                const batchCandidates = batch.candidates.filter(candidate =>
                  sortedCandidates.some(sc => sc.userId === candidate.userId)
                );

                if (batchCandidates.length === 0) return null;

                const isCollapsed = collapsedBatches.has(batch.batchId);

                return (
                  <React.Fragment key={batch.batchId}>
                    {/* Batch Header Row */}
                    <tr
                      onClick={() => toggleBatch(batch.batchId)}
                      style={{
                        backgroundColor: '#f8fafc',
                        borderTop: '2px solid #e2e8f0',
                        borderBottom: '2px solid #e2e8f0',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    >
                      <td colSpan={9} style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
                            {isCollapsed ? '▶' : '▼'}
                          </span>
                          <span>{batch.batchName}</span>
                          <span style={{
                            fontSize: '0.85rem',
                            color: '#64748b',
                            fontWeight: 500,
                            backgroundColor: '#e2e8f0',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '999px'
                          }}>
                            {batchCandidates.length} {batchCandidates.length === 1 ? 'candidate' : 'candidates'}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Candidate Rows */}
                    {!isCollapsed && batchCandidates.map((candidate) => {
                      const statusLabel = STATUS_LABELS[candidate.status] || STATUS_LABELS.pending;
                      const scoreColors = getScoreColors(candidate.percentage, thresholds);

                      return (
                        <tr
                          key={candidate.submissionId || candidate.userId || candidate.email}
                          style={{ borderBottom: '1px solid #f1f5f9' }}
                        >
                          <td style={{ padding: '1.15rem 1.25rem', fontWeight: 600, color: '#0f172a' }}>{candidate.name}</td>
                          <td style={{ padding: '1.15rem 1.25rem', color: '#334155' }}>{candidate.email || '—'}</td>
                          <td style={{ padding: '1.15rem 1.25rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              padding: '0.35rem 0.7rem',
                              borderRadius: '999px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                            }}>
                              {statusLabel}
                            </span>
                          </td>
                          <td style={{ padding: '1.15rem 1.25rem', color: '#475569' }}>{formatDate(candidate.joinedAt)}</td>
                          <td style={{ padding: '1.15rem 1.25rem', color: '#475569' }}>{formatDuration(candidate.timeTaken)}</td>
                          <td style={{ padding: '1.15rem 1.25rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '72px',
                              padding: '0.35rem 0.75rem',
                              borderRadius: '999px',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: scoreColors.text,
                              backgroundColor: scoreColors.background,
                            }}>
                              {candidate.percentage !== null && candidate.percentage !== undefined
                                ? `${Number(candidate.percentage).toFixed(0)}%`
                                : '—'}
                            </span>
                          </td>
                          <td style={{ padding: '1.15rem 1.25rem' }}>
                            {candidate.grade ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.35rem 0.7rem',
                                borderRadius: '999px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                backgroundColor: candidate.grade === 'Green' ? '#dcfce7' : candidate.grade === 'Amber' ? '#fef3c7' : '#fee2e2',
                                color: candidate.grade === 'Green' ? '#2ECC71' : candidate.grade === 'Amber' ? '#F39C12' : '#E74C3C',
                                textTransform: 'uppercase'
                              }}>
                                {candidate.grade}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '1.15rem 1.25rem' }}>
                            <span
                              // ✅ Updated onClick
                              onClick={() => {
                                if (candidate.cheatingDetected) {
                                  setSelectedCheatCandidate(candidate);
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.35rem 0.6rem', // ✅ Matched size
                                borderRadius: '999px',
                                fontSize: '0.8rem', // ✅ Matched font size
                                fontWeight: 700,
                                color: candidate.cheatingDetected ? '#b91c1c' : '#15803d', // Red text for cheating, Green for clean
                                backgroundColor: candidate.cheatingDetected ? '#fef2f2' : '#dcfce7', // Light red bg
                                border: candidate.cheatingDetected ? '1px solid #fecaca' : 'none', // Subtle border
                                boxShadow: 'none', // Removed shadow
                                cursor: candidate.cheatingDetected ? 'pointer' : 'default',
                              }}>
                              {candidate.cheatingDetected ? 'CHEATING DETECTED' : '🛡️ Not detected'}
                            </span>
                          </td>
                          <td style={{ padding: '1.15rem 1.25rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                onClick={() => onApproveCandidate(candidate)}
                                title="Mark as approved"
                                style={{
                                  border: 'none',
                                  background: '#f1f5f9',
                                  borderRadius: '8px',
                                  width: '36px',
                                  height: '36px',
                                  cursor: 'pointer',
                                  fontSize: '1.1rem',
                                }}
                              >
                                👍
                              </button>
                              <button
                                onClick={() => onFlagCandidate(candidate)}
                                title="Flag candidate"
                                style={{
                                  border: 'none',
                                  background: '#fef2f2',
                                  color: '#b91c1c',
                                  borderRadius: '8px',
                                  width: '36px',
                                  height: '36px',
                                  cursor: 'pointer',
                                  fontSize: '1.1rem',
                                }}
                              >
                                👎
                              </button>
                              <button
                                onClick={() => onViewReport(candidate)}
                                title="View detailed report"
                                style={{
                                  border: '1px solid #1d4ed8',
                                  background: '#1d4ed8',
                                  color: '#ffffff',
                                  borderRadius: '8px',
                                  padding: '0.35rem 0.85rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                }}
                              >
                                View Report
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Render Modal */}
      <CheatingDetailsModal
        isOpen={!!selectedCheatCandidate}
        onClose={() => setSelectedCheatCandidate(null)}
        candidate={selectedCheatCandidate}
      />
    </div>
  );
};

AdminExamCandidatesTable.propTypes = {
  candidates: PropTypes.arrayOf(PropTypes.shape({
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    name: PropTypes.string,
    email: PropTypes.string,
    batchName: PropTypes.string,
    batchId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    status: PropTypes.string,
    joinedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    submittedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
    timeTaken: PropTypes.number,
    percentage: PropTypes.number,
    grade: PropTypes.string,
    qualified: PropTypes.bool,
    cheatingDetected: PropTypes.bool,
    submissionId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  })),
  thresholds: PropTypes.shape({
    qualificationPercentage: PropTypes.number,
    excellentMin: PropTypes.number,
    goodMin: PropTypes.number,
    averageMin: PropTypes.number,
  }),
  onApproveCandidate: PropTypes.func,
  onFlagCandidate: PropTypes.func,
  onViewReport: PropTypes.func,
};

export default AdminExamCandidatesTable;
