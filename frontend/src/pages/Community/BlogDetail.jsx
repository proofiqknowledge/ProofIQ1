import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaArrowLeft, FaThumbsUp, FaRegThumbsUp, FaCommentDots, FaShare, FaPaperPlane, FaFileDownload, FaEye } from 'react-icons/fa';
import BlogService from '../../services/blogService';
import api from '../../services/api';
import './BlogDetail.css';
import ImageCarousel from '../../components/Blog/ImageCarousel';

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    fetchBlog();
  }, [id]);

  const fetchBlog = async () => {
    try {
      const res = await BlogService.getById(id);
      setBlog(res.data.blog);
      setIsLiked(res.data.blog.likes.includes(user?._id));
      setLikesCount(res.data.blog.likes.length);
    } catch (err) {
      console.error("Failed to fetch blog", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const res = await BlogService.like(id);
      setIsLiked(res.data.liked);
      setLikesCount(res.data.likesCount);
    } catch (err) {
      console.error("Failed to like", err);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      const res = await BlogService.comment(id, { text: commentText });
      setBlog(prev => ({ ...prev, comments: res.data.comments }));
      setCommentText("");
    } catch (err) {
      console.error("Failed to comment", err);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  if (!blog) return <div style={{ textAlign: 'center', padding: '40px' }}>Blog not found</div>;

  return (
    <div style={{ backgroundColor: '#f3f2ef', minHeight: '100vh', padding: '20px 0' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button
            onClick={() => navigate(-1)}
          style={{
            marginBottom: '16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#666',
            fontWeight: '600'
          }}
        >
          <FaArrowLeft /> Back to Feed
          </button>

          {/* Edit button for author when allowed statuses (normalize status) */}
          {user && blog && String(user._id) === String(blog.author) && (() => {
            const s = String(blog.status || '').toLowerCase().replace(/\s+/g, '_').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
            return ['draft','rejected','changes_requested'].includes(s) ? (
              <button onClick={() => navigate(`/community/blogs/${blog._id}/edit`)} style={{ backgroundColor: '#0a66c2', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer' }}>Edit</button>
            ) : null;
          })()}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

          {/* Author Header */}
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center' }}>
            <img
              src={blog.authorImage || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
              alt={blog.authorName}
              style={{ width: '56px', height: '56px', borderRadius: '50%', marginRight: '12px', objectFit: 'cover' }}
              onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
            />
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#191919' }}>{blog.authorName}</h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                {new Date(blog.createdAt).toLocaleDateString()} • {blog.views || 0} views
              </p>
            </div>
          </div>

          {/* Content */}
          <div style={{ padding: '0 20px 20px' }}>
            <h1 style={{ fontSize: '24px', color: '#191919', marginBottom: '16px' }}>{blog.title}</h1>
            <div style={{ fontSize: '16px', color: '#191919', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {blog.body}
            </div>
          </div>

          {/* Images */}
          {blog.images && blog.images.length > 0 && (
            <div style={{ width: '100%', marginTop: '16px' }}>
              <ImageCarousel images={blog.images} />
            </div>
          )}

          {/* Video */}
          {blog.video && (
            <div style={{ padding: '0 20px 20px' }}>
              <video
                src={(() => {
                  const vid = blog.video;
                  if (typeof vid === 'string') {
                    return vid.startsWith('http') ? vid : `${api.defaults.baseURL?.replace('/api', '')}${vid}`;
                  } else if (vid && vid.filename) {
                    return `${api.defaults.baseURL?.replace('/api', '')}/api/blogs/file/${vid.filename}`;
                  }
                  return '';
                })()}
                controls
                style={{ width: '100%', borderRadius: '8px', maxHeight: '500px' }}
              />
            </div>
          )}

          {/* Stats Bar */}
          <div style={{ padding: '12px 20px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
            <span>{likesCount} likes</span>
            <span>{blog.comments?.length || 0} comments</span>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', borderTop: '1px solid #e0e0e0', padding: '4px 12px' }}>
            <button
              onClick={handleLike}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: isLiked ? '#0a66c2' : '#666',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              {isLiked ? <FaThumbsUp size={20} /> : <FaRegThumbsUp size={20} />} Like
            </button>
            <button style={{ flex: 1, padding: '12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#666', fontWeight: '600', fontSize: '14px' }}>
              <FaCommentDots size={20} /> Comment
            </button>
            <button style={{ flex: 1, padding: '12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#666', fontWeight: '600', fontSize: '14px' }}>
              <FaShare size={20} /> Share
            </button>
          </div>

          {/* Comment Section */}
          <div style={{ backgroundColor: '#f9fafb', padding: '20px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <img
                src={user?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                alt="Me"
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
              />
              <div style={{ flex: 1 }}>
                <div style={{ border: '1px solid #e0e0e0', borderRadius: '20px', backgroundColor: 'white', padding: '4px 12px' }}>
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    style={{ width: '100%', border: 'none', outline: 'none', padding: '8px', fontSize: '14px' }}
                  />
                </div>
                {commentText && (
                  <button
                    onClick={handleComment}
                    style={{
                      marginTop: '8px',
                      padding: '6px 16px',
                      backgroundColor: '#0a66c2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '12px',
                      float: 'right'
                    }}
                  >
                    Post
                  </button>
                )}
              </div>
            </div>

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {blog.comments?.map((comment, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '12px' }}>
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/149/149071.png"
                    alt={comment.userName}
                    style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                  />
                  <div style={{ backgroundColor: '#f2f2f2', padding: '10px 14px', borderRadius: '0 12px 12px 12px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#191919', marginBottom: '4px' }}>
                      {comment.userName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                      {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : ''}
                    </div>
                    <div style={{ fontSize: '14px', color: '#191919' }}>
                      {comment.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BlogDetail;
