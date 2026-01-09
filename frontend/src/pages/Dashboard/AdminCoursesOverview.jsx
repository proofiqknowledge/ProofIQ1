import React, { useEffect, useState, useMemo } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';

const COLORS = {
  primary: '#9B1C36',
  secondary: '#6C6E70',
  accent: '#ED4747',
  bgCard: '#fff',
  bgLight: '#f7f9fb',
  bgInput: '#f2f2f7'
};

const FONT = {
  family: "'Inter', 'Segoe UI', Arial, sans-serif",
};

const BORDER_RADIUS = 12;
const CARD_RADIUS = 18;

function SortableHeader({ label, sortKey, currentSort, onSort }) {
  const active = currentSort.key === sortKey;
  const dir = active ? currentSort.dir : null;
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '16px 18px',
        cursor: 'pointer',
        color: active ? COLORS.primary : COLORS.secondary,
        background: COLORS.bgLight,
        fontWeight: active ? 700 : 600,
        fontFamily: FONT.family,
        letterSpacing: '0.01em',
        fontSize: 17,
        userSelect: 'none'
      }}
      title={`Sort by ${label}`}
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      <span style={{
        marginLeft: 10,
        fontSize: '1em',
        verticalAlign: 'middle',
        transition: 'color 0.25s',
        color: active ? COLORS.primary : '#bbb'
      }}>
        {active ? (dir === 'asc' ? '▲' : '▼') : '▲'}
      </span>
    </th>
  );
}

export default function AdminCoursesOverview() {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState('');
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [enrolledUsersCache, setEnrolledUsersCache] = useState({});

  useEffect(() => { fetchOverview(); }, []);

  const fetchOverview = async () => {
    try {
      const res = await api.get('/courses/admin/overview');
      setCourses(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch courses overview');
    }
  };

  const toggleCardDetails = (courseId) => {
    setExpandedCardId((cur) => (cur === courseId ? null : courseId));
    if (!enrolledUsersCache[courseId]) {
      api.get(`/courses/${courseId}/enrolled-users`)
        .then((res) =>
          setEnrolledUsersCache((prev) => ({ ...prev, [courseId]: res.data || [] }))
        )
        .catch(() => toast.error('Failed to load enrolled users for course'));
    }
  };

  const toggleBatch = (course, batchId) => {
    setExpandedBatches((prev) => {
      return prev.includes(batchId)
        ? prev.filter((id) => id !== batchId)
        : [...prev, batchId];
    });
    if (!enrolledUsersCache[course._id]) {
      api.get(`/courses/${course._id}/enrolled-users`)
        .then((res) =>
          setEnrolledUsersCache((prev) => ({ ...prev, [course._id]: res.data || [] }))
        )
        .catch(() => toast.error('Failed to fetch enrolled users for course'));
    }
  };

  const handleUnenroll = async (courseId, userId) => {
    if (!window.confirm('Remove this user from the course?')) return;
    try {
      await api.delete(`/courses/${courseId}/unenroll-user/${userId}`);
      toast.success('User unenrolled');
      setEnrolledUsersCache((prev) => {
        const updated = { ...prev };
        updated[courseId] = updated[courseId].filter((u) => String(u._id) !== String(userId));
        return updated;
      });
      setCourses((prev) =>
        prev.map((c) =>
          c._id === courseId
            ? { ...c, studentCount: Math.max(0, (c.studentCount || 0) - 1) }
            : c
        )
      );
    } catch {
      toast.error('Failed to unenroll user');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? courses.filter(
          (c) =>
            (c.title || '').toLowerCase().includes(q) ||
            String(c.batchCount).includes(q) ||
            String(c.studentCount).includes(q)
        )
      : courses;
  }, [courses, query]);

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bgLight,
      fontFamily: FONT.family,
      padding: '48px 32px 40px'
    }}>
      <div style={{
        marginBottom: 40
      }}>
        <h2 style={{
          color: COLORS.primary,
          fontFamily: FONT.family,
          fontWeight: 800,
          fontSize: '2.2rem',
          marginBottom: 24,
          letterSpacing: '0.018em'
        }}>
          Manage Courses
        </h2>

        <div style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <input
            placeholder="Search courses by name, batches, or students..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              padding: '12px 18px',
              borderRadius: BORDER_RADIUS,
              border: '1.5px solid #e3e3e3',
              background: COLORS.bgInput,
              flex: 1,
              minWidth: 280,
              fontSize: '0.95rem',
              color: COLORS.secondary,
              fontWeight: 500,
              fontFamily: FONT.family,
              transition: 'all 0.2s'
            }}
          />
          <button 
            onClick={fetchOverview}
            style={{
              padding: '11px 24px',
              borderRadius: BORDER_RADIUS,
              border: 'none',
              background: COLORS.primary,
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: 600,
              fontFamily: FONT.family,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: `0 2px 8px ${COLORS.primary}40`
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          background: COLORS.bgCard,
          borderRadius: CARD_RADIUS,
          padding: '60px 40px',
          textAlign: 'center',
          boxShadow: `0 2px 12px ${COLORS.secondary}15`
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: 16
          }}>📚</div>
          <div style={{
            fontSize: '1.2rem',
            fontWeight: 600,
            color: COLORS.primary,
            marginBottom: 8
          }}>
            No courses found
          </div>
          <div style={{
            fontSize: '1rem',
            color: COLORS.secondary
          }}>
            {query ? 'Try adjusting your search criteria' : 'Create a new course to get started'}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 28,
          marginBottom: 40
        }}>
          {filtered.map(course => (
            <div
              key={course._id}
              style={{
                background: COLORS.bgCard,
                borderRadius: CARD_RADIUS,
                border: '1.5px solid #e5e7eb',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                transform: expandedCardId === course._id ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: expandedCardId === course._id 
                  ? '0 20px 30px rgba(0, 0, 0, 0.15)' 
                  : '0 4px 14px rgba(0, 0, 0, 0.05)'
              }}
            >
              {/* Card Header */}
              <div style={{
                background: `linear-gradient(135deg, ${COLORS.primary}20, ${COLORS.accent}15)`,
                padding: '24px 20px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  margin: '0 0 8px 0',
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: COLORS.primary,
                  fontFamily: FONT.family
                }}>
                  {course.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: COLORS.secondary,
                  fontFamily: FONT.family
                }}>
                  Course Management
                </p>
              </div>

              {/* Card Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                padding: '20px'
              }}>
                <div style={{
                  background: COLORS.bgLight,
                  padding: '16px',
                  borderRadius: 10,
                  textAlign: 'center',
                  border: '1px solid #ececec'
                }}>
                  <div style={{
                    fontSize: '1.8rem',
                    fontWeight: 800,
                    color: COLORS.primary,
                    marginBottom: 4
                  }}>
                    {course.batchCount || 0}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: COLORS.secondary,
                    fontWeight: 600
                  }}>
                    Batches
                  </div>
                </div>
                <div style={{
                  background: COLORS.bgLight,
                  padding: '16px',
                  borderRadius: 10,
                  textAlign: 'center',
                  border: '1px solid #ececec'
                }}>
                  <div style={{
                    fontSize: '1.8rem',
                    fontWeight: 800,
                    color: COLORS.accent,
                    marginBottom: 4
                  }}>
                    {course.studentCount || 0}
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: COLORS.secondary,
                    fontWeight: 600
                  }}>
                    Students
                  </div>
                </div>
              </div>

              {/* Expand Button */}
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  onClick={() => toggleCardDetails(course._id)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: expandedCardId === course._id ? COLORS.primary : COLORS.bgLight,
                    color: expandedCardId === course._id ? '#fff' : COLORS.primary,
                    border: expandedCardId === course._id ? 'none' : `1.5px solid ${COLORS.primary}`,
                    borderRadius: 8,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    fontFamily: FONT.family,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  {expandedCardId === course._id ? '△ Hide Details' : '▼ View Details'}
                </button>
              </div>

              {/* Expanded Details */}
              {expandedCardId === course._id && (
                <div style={{
                  padding: '20px',
                  background: COLORS.bgLight,
                  borderTop: '2px solid #e5e7eb',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  {/* Batches Section */}
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{
                      margin: '0 0 12px 0',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: COLORS.primary,
                      fontFamily: FONT.family
                    }}>
                      📚 Batches ({course.batchCount})
                    </h4>
                    {course.batches && course.batches.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {course.batches.map(b => (
                          <div key={b._id} style={{
                            background: '#fff',
                            padding: '12px',
                            borderRadius: 8,
                            border: '1px solid #e3e3e3',
                            fontSize: '0.9rem'
                          }}>
                            <div style={{ fontWeight: 600, color: COLORS.secondary, marginBottom: 6 }}>
                              {b.name}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#888' }}>
                              {b.students?.length || 0} students
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.9rem', color: COLORS.secondary }}>
                        No batches assigned yet
                      </div>
                    )}
                  </div>

                  {/* Enrolled Users Section */}
                  {enrolledUsersCache[course._id] && (
                    <div>
                      <h4 style={{
                        margin: '0 0 12px 0',
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: COLORS.primary,
                        fontFamily: FONT.family
                      }}>
                        👥 Enrolled Students ({enrolledUsersCache[course._id].length})
                      </h4>
                      {enrolledUsersCache[course._id].length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {enrolledUsersCache[course._id].map(u => (
                            <div key={String(u._id)} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: '#fff',
                              padding: '10px',
                              borderRadius: 6,
                              border: '1px solid #e3e3e3',
                              fontSize: '0.9rem'
                            }}>
                              <span style={{ fontWeight: 500 }}>{u.name}</span>
                              <button
                                onClick={() => handleUnenroll(course._id, u._id)}
                                style={{
                                  padding: '4px 12px',
                                  background: '#fee',
                                  color: '#c33',
                                  border: 'none',
                                  borderRadius: 4,
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.9rem', color: COLORS.secondary }}>
                          No students enrolled
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
