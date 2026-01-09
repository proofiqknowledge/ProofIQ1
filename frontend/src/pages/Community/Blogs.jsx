import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'react-toastify';

const COLORS = {
  primary: '#9B1C36',
  accent: '#ED4747',
  success: '#16a34a',
  danger: '#dc2626',
  bgLight: '#f7f9fb',
  bgCard: '#ffffff',
  secondary: '#6C6E70'
};

export default function Blogs() {
  const formatAuthor = (author) => {
    if (!author) return 'Anonymous';
    const empId = author.employeeId ? ` (${author.employeeId})` : '';
    return `${author.name || 'Anonymous'}${empId}`;
  };

  const { role } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/blogs/approved');
      setBlogs(res.data.blogs || []);
    } catch (err) {
      toast.error('Failed to load blogs');
      console.error('Fetch approved blogs error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteBlog = async (id) => {
    const confirmed = window.confirm('Are you sure you want to permanently delete this blog? This cannot be undone.');
    if (!confirmed) return;
    try {
      await api.delete(`/admin/blogs/${id}`);
      toast.success('Blog deleted successfully');
      fetchBlogs();
    }
    catch (err) { toast.error('Failed to delete blog'); }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.bgLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', system-ui, sans-serif"
      }}>
        <div style={{
          fontSize: '1.2rem',
          color: COLORS.secondary,
          fontWeight: 600
        }}>
          Loading blogs...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.bgLight,
      padding: '48px 32px 40px',
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{
          fontSize: '2.2rem',
          fontWeight: 800,
          color: COLORS.primary,
          margin: '0 0 12px 0',
          letterSpacing: '0.018em'
        }}>
          Community Blogs
        </h1>
        <p style={{
          fontSize: '1rem',
          color: COLORS.secondary,
          margin: 0
        }}>
          Explore approved blog posts from our community
        </p>
      </div>

      {/* Content */}
      {blogs.length === 0 ? (
        <div style={{
          background: COLORS.bgCard,
          borderRadius: 16,
          padding: '60px 40px',
          textAlign: 'center',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
          border: '1.5px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: 700,
            color: COLORS.primary,
            margin: '0 0 8px 0'
          }}>
            No Blogs Yet
          </h2>
          <p style={{
            fontSize: '1rem',
            color: COLORS.secondary,
            margin: 0
          }}>
            Check back soon for community blog posts!
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 24,
          marginBottom: 40
        }}>
          {blogs.map(blog => (
            <div
              key={blog._id}
              style={{
                background: COLORS.bgCard,
                borderRadius: 14,
                border: '1.5px solid #e5e7eb',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transform: expandedId === blog._id ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: expandedId === blog._id 
                  ? '0 20px 30px rgba(0, 0, 0, 0.15)' 
                  : '0 4px 14px rgba(0, 0, 0, 0.05)'
              }}
                          onClick={() => navigate(`/blogs/${blog._id}`)}
            >
              {/* Blog Header */}
              <div style={{
                background: `linear-gradient(135deg, ${COLORS.primary}20, ${COLORS.accent}15)`,
                padding: '24px 20px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h3 style={{
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: COLORS.primary,
                  margin: '0 0 8px 0',
                  wordBreak: 'break-word'
                }}>
                  {blog.title || 'Untitled'}
                </h3>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  color: COLORS.secondary
                }}>
                  <span>Author: {formatAuthor(blog.author)}</span>
                  <span>Published: {formatDate(blog.createdAt)}</span>
                </div>
              </div>

              {/* Blog Content Preview */}
              <div style={{
                padding: '20px',
                flex: 1,
                overflow: 'hidden'
              }}>
                <div style={{
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  color: '#333',
                  maxHeight: expandedId === blog._id ? '500px' : '120px',
                  overflow: expandedId === blog._id ? 'auto' : 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'max-height 0.3s ease'
                }}>
                  {blog.body}
                </div>
                {(blog.body?.length || 0) > 200 && expandedId !== blog._id && (
                  <div style={{
                    fontSize: '0.85rem',
                    color: COLORS.primary,
                    fontWeight: 600,
                    marginTop: 8,
                    textAlign: 'center'
                  }}>
                    ... read more
                  </div>
                )}
              </div>

              {/* Document Badge - if available */}
                {blog.document && (
                <div style={{
                  padding: '12px 20px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderTop: '1px solid #e5e7eb',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '0.9rem',
                  color: '#0066cc',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  Document: {blog.document.split('/').pop()}
                </div>
              )}

              {/* Status Badge */}
              <div style={{
                padding: '16px 20px',
                background: '#f9fafb',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: COLORS.success,
                  color: '#fff',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}>
                  Approved
                </span>
                {role === 'Admin' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteBlog(blog._id); }}
                    style={{
                      padding: '6px 12px',
                      background: COLORS.danger,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.target.style.opacity = '1'}
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Expand Toggle */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
