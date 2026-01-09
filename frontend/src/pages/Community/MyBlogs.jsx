import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BlogService from '../../services/blogService';
import api from '../../services/api';
import { FaClock, FaCheckCircle, FaTimesCircle, FaPlus, FaTrash, FaCoins } from 'react-icons/fa';
import { toast } from 'react-toastify';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';

const MyBlogs = () => {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // all, pending, approved, rejected
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, blogId: null, blogTitle: '' });

  useEffect(() => {
    fetchMyBlogs();
  }, []);

  const fetchMyBlogs = async () => {
    try {
      const res = await BlogService.getMy();
      setBlogs(res.data.blogs);
    } catch (err) {
      console.error("Failed to fetch my blogs", err);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (blogId, blogTitle) => {
    setDeleteModal({ isOpen: true, blogId, blogTitle });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, blogId: null, blogTitle: '' });
  };

  const handleDelete = async () => {
    const { blogId } = deleteModal;

    try {
      await BlogService.delete(blogId);
      // Remove the deleted blog from the state
      setBlogs(blogs.filter(blog => blog._id !== blogId));
      closeDeleteModal();
      toast.success('Blog deleted successfully!');
    } catch (err) {
      console.error("Failed to delete blog", err);
      toast.error(err.response?.data?.message || 'Failed to delete blog');
      closeDeleteModal();
    }
  };

  const handleClaimPoints = async (blogId) => {
    // Manual claiming removed: points are awarded automatically on approval.
  };

  const filteredBlogs = blogs.filter(blog => {
    if (activeTab === 'all') return true;
    return blog.status === activeTab;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span style={{ ...badgeStyle, backgroundColor: '#d1fae5', color: '#065f46' }}>Approved</span>;
      case 'rejected': return <span style={{ ...badgeStyle, backgroundColor: '#fee2e2', color: '#991b1b' }}>Rejected</span>;
      case 'draft': return <span style={{ ...badgeStyle, backgroundColor: '#e6f0ff', color: '#0a66c2' }}>Draft</span>;
      case 'changes_requested': return <span style={{ ...badgeStyle, backgroundColor: '#fff7ed', color: '#92400e' }}>Changes Requested</span>;
      default: return <span style={{ ...badgeStyle, backgroundColor: '#fef3c7', color: '#92400e' }}>Pending</span>;
    }
  };

  // Helper function to get proper image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    if (typeof imagePath === 'string') {
      if (imagePath.startsWith('http')) return imagePath;
      return `${api.defaults.baseURL?.replace('/api', '')}${imagePath}`;
    } else if (imagePath && imagePath.filename) {
      return `${api.defaults.baseURL?.replace('/api', '')}/api/blogs/file/${imagePath.filename}`;
    }
    return "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  };

  return (
    <div style={{ backgroundColor: '#f3f2ef', minHeight: '100vh', padding: '20px 0' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', color: '#191919', margin: 0 }}>My Posts</h1>
          <button
            onClick={() => navigate('/community/blogs/create')}
            style={{
              backgroundColor: '#0a66c2',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '20px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FaPlus size={12} /> Create New
          </button>
        </div>

        {/* Tabs */}
        <div style={{ backgroundColor: 'white', borderRadius: '8px 8px 0 0', borderBottom: '1px solid #e0e0e0', padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: '24px' }}>
            {['all', 'pending', 'approved', 'rejected'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '16px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: activeTab === tab ? '#0a66c2' : '#666',
                  borderBottom: activeTab === tab ? '2px solid #0a66c2' : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={{ backgroundColor: 'white', borderRadius: '0 0 8px 8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', minHeight: '400px' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Loading...</div>
          ) : filteredBlogs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No posts found.</div>
          ) : (
            <div>
              {filteredBlogs.map(blog => (
                <div key={blog._id} style={{ padding: '16px 20px', borderBottom: '1px solid #f3f2ef', display: 'flex', gap: '16px' }}>
                  <img
                    src={getImageUrl(blog.images?.[0])}
                    alt="Thumbnail"
                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', backgroundColor: '#f3f2ef' }}
                    onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#191919' }}>{blog.title}</h3>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {getStatusBadge(blog.status)}

                        {/* Edit button: normalize status to handle variations like 'changesRequested' or 'Changes Requested' */}
                        {(() => {
                          const s = String(blog.status || '').toLowerCase().replace(/\s+/g, '_').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
                          // Allow edit for draft, rejected, changes requested, and pending
                          return ['draft', 'rejected', 'changes_requested', 'pending'].includes(s) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/community/blogs/${blog._id}/edit`);
                              }}
                              style={{
                                backgroundColor: '#0a66c2',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}
                              title="Edit this blog"
                            >
                              Edit
                            </button>
                          ) : null;
                        })()}

                        {/* Manual claim removed; points awarded automatically on approval */}

                        {/* Points Claimed Badge */}
                        {blog.pointsClaimed && (
                          <span style={{
                            ...badgeStyle,
                            backgroundColor: '#fef3c7',
                            color: '#92400e'
                          }}>
                            <FaCoins /> Points Claimed
                          </span>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(blog._id, blog.title);
                          }}
                          style={{
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                          title="Delete this blog"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
                      {blog.body.substring(0, 100)}...
                    </p>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Posted on {new Date(blog.createdAt).toLocaleDateString()} • {blog.views || 0} views
                    </div>
                    {blog.status === 'rejected' && blog.rejectReason && (
                      <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: '13px', color: '#991b1b' }}>
                        <strong>Rejection Reason:</strong> {blog.rejectReason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={handleDelete}
          blogTitle={deleteModal.blogTitle}
        />

      </div>
    </div>
  );
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: '600'
};

export default MyBlogs;
