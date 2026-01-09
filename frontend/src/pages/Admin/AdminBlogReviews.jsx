import React, { useEffect, useState } from 'react';
import BlogService from '../../services/blogService';
import api from '../../services/api';
import { FaCheck, FaTimes, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';

const AdminBlogReviews = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      const res = await BlogService.getPending();
      setRequests(res.data.requests);
    } catch (err) {
      console.error("Failed to fetch pending blogs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (id) => {
    // Just open the modal
    // We can rely on selectedBlog being set because the button is in the detail view
    // But to be safe, if id is passed, we could ensure it matches selectedBlog
    setShowApproveModal(true);
  };

  const handleRequestChanges = async () => {
    if (!selectedBlog) return;
    const reason = prompt('Please provide change request details for the author:');
    if (!reason) return;
    try {
      await BlogService.requestChanges(selectedBlog._id, reason);
      toast.success('Requested changes from author');
      setRequests(requests.filter(r => r._id !== selectedBlog._id));
      setSelectedBlog(null);
    } catch (err) {
      toast.error('Failed to request changes');
    }
  };

  const confirmApprove = async () => {
    if (!selectedBlog) return;
    try {
      await BlogService.approve(selectedBlog._id);
      toast.success("Blog approved");
      setRequests(requests.filter(r => r._id !== selectedBlog._id));
      setShowApproveModal(false);
      setSelectedBlog(null);
    } catch (err) {
      toast.error("Failed to approve");
    }
  };

  const openRejectModal = (blog) => {
    setSelectedBlog(blog);
    setShowRejectModal(true);
    setRejectReason("");
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    try {
      await BlogService.reject(selectedBlog._id, rejectReason);
      toast.success("Blog rejected");
      setRequests(requests.filter(r => r._id !== selectedBlog._id));
      setShowRejectModal(false);
      setSelectedBlog(null);
    } catch (err) {
      toast.error("Failed to reject");
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f3f2ef', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', color: '#191919', marginBottom: '20px' }}>Pending Blog Reviews</h1>

        <div style={{ display: 'flex', gap: '20px' }}>
          {/* List */}
          <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Requests ({requests.length})</h2>
            {loading ? (
              <div>Loading...</div>
            ) : requests.length === 0 ? (
              <div>No pending requests.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {requests.map(req => (
                  <div
                    key={req._id}
                    onClick={() => setSelectedBlog(req)}
                    style={{
                      padding: '12px',
                      border: selectedBlog?._id === req._id ? '2px solid #0a66c2' : '1px solid #e0e0e0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: selectedBlog?._id === req._id ? '#eef3f8' : 'white'
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#191919' }}>{req.title}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>By {req.authorName} • {new Date(req.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail View */}
          <div style={{ flex: 2, backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', minHeight: '500px' }}>
            {selectedBlog ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e0e0e0', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={selectedBlog.authorImage || "https://via.placeholder.com/40"}
                      alt="Author"
                      style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                    />
                    <div>
                      <div style={{ fontWeight: '600' }}>{selectedBlog.authorName}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{new Date(selectedBlog.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Created: {new Date(selectedBlog.createdAt).toLocaleString()}
                    {selectedBlog.lastEditedAt && (
                      <span style={{ marginLeft: 12 }}>Edited: {new Date(selectedBlog.lastEditedAt).toLocaleString()}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleApprove(selectedBlog._id)}
                      style={{ backgroundColor: '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FaCheck /> Approve
                    </button>
                    <button
                      onClick={() => handleRequestChanges()}
                      style={{ backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      Request Changes
                    </button>
                    <button
                      onClick={() => openRejectModal(selectedBlog)}
                      style={{ backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FaTimes /> Reject
                    </button>
                  </div>
                </div>

                <h2 style={{ fontSize: '22px', color: '#191919', marginBottom: '16px' }}>{selectedBlog.title}</h2>
                <div style={{ fontSize: '16px', lineHeight: '1.6', color: '#191919', whiteSpace: 'pre-wrap', marginBottom: '20px' }}>
                  {selectedBlog.body}
                </div>

                {selectedBlog.images && selectedBlog.images.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    {selectedBlog.images.map((img, idx) => {
                      const src = (() => {
                        if (typeof img === 'string') {
                          return img.startsWith('http') ? img : `${api.defaults.baseURL?.replace('/api', '')}${img}`;
                        } else if (img && img.filename) {
                          return `${api.defaults.baseURL?.replace('/api', '')}/api/blogs/file/${img.filename}`;
                        }
                        return '';
                      })();
                      return (
                        <img
                          key={idx}
                          src={src}
                          alt="Content"
                          style={{ maxWidth: '100%', borderRadius: '8px', marginBottom: '8px' }}
                        />
                      );
                    })}
                  </div>
                )}

                {selectedBlog.video && (
                  <div style={{ padding: '12px', backgroundColor: '#f3f2ef', borderRadius: '4px', display: 'inline-block', width: '100%' }}>
                    <video
                      src={(() => {
                        const vid = selectedBlog.video;
                        if (typeof vid === 'string') {
                          return vid.startsWith('http') ? vid : `${api.defaults.baseURL?.replace('/api', '')}${vid}`;
                        } else if (vid && vid.filename) {
                          return `${api.defaults.baseURL?.replace('/api', '')}/api/blogs/file/${vid.filename}`;
                        }
                        return '';
                      })()}
                      controls
                      style={{ width: '100%', borderRadius: '8px', maxHeight: '400px' }}
                    />
                  </div>
                )}

              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', flexDirection: 'column', gap: '12px' }}>
                <FaEye size={48} color="#e0e0e0" />
                <p>Select a blog request to review</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginTop: 0 }}>Reject Blog</h3>
            <p style={{ fontSize: '14px', color: '#666' }}>Please provide a reason for rejection:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ width: '100%', height: '100px', padding: '8px', marginBottom: '16px', borderRadius: '4px', border: '1px solid #e0e0e0' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowRejectModal(false)} style={{ padding: '8px 16px', border: '1px solid #e0e0e0', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleReject} style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h3 style={{ marginTop: 0, color: '#059669' }}>Approve Blog</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
              Are you sure you want to approve this blog? It will be visible to all users.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowApproveModal(false)}
                style={{ padding: '8px 16px', border: '1px solid #e0e0e0', background: 'white', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                style={{ padding: '8px 16px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminBlogReviews;
