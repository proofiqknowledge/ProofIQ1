import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaThumbsUp, FaRegThumbsUp, FaCommentDots, FaShare, FaEye, FaFileDownload } from 'react-icons/fa';
import api from '../../services/api';
import './BlogCard.css';
import ImageCarousel from './ImageCarousel';

// BlogCard Component
const BlogCard = ({ blog, onLike }) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false); // Optimistic UI, should be passed from parent ideally or checked against user ID
  const [likesCount, setLikesCount] = useState(blog.likes?.length || 0);

  // Helper to format date like LinkedIn (e.g., "2d", "1w")
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const res = await api.post(`/blogs/${blog._id}/like`);
      setIsLiked(res.data.liked);
      setLikesCount(res.data.likesCount);
      if (onLike) onLike(blog._id, res.data.liked);
    } catch (err) {
      console.error("Failed to like blog", err);
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    e.preventDefault();
    // Simple copy to clipboard for now
    navigator.clipboard.writeText(`${window.location.origin}/community/blogs/${blog._id}`);
    alert("Link copied to clipboard!");
  };

  const goToDetail = () => {
    navigate(`/community/blogs/${blog._id}`);
  };

  return (
    <div className="blog-card" onClick={goToDetail} style={{ cursor: 'pointer' }}>
      {/* Header */}
      <div className="blog-header">
        <img
          src={blog.authorImage || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
          alt={blog.authorName}
          className="author-avatar"
          onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
        />
        <div className="author-info">
          <h3 className="author-name">{blog.authorName || "Unknown Author"}</h3>
          <p className="post-time">{formatTime(blog.createdAt)} • <FaEye /> {blog.views || 0} views</p>
        </div>
      </div>

      {/* Content */}
      <div className="blog-content">
        <h4 className="blog-title">{blog.title}</h4>
        <p className="blog-text">
          {blog.body?.length > 150 ? (
            <>
              {blog.body.substring(0, 150)}...
              <span className="see-more">see more</span>
            </>
          ) : (
            blog.body
          )}
        </p>
      </div>

      {/* Images */}
      {blog.images && blog.images.length > 0 && (
        <div className="blog-images">
          <ImageCarousel images={blog.images} />
        </div>
      )}

      {/* Video */}
      {blog.video && (
        <div style={{ marginTop: '8px' }}>
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
            style={{ width: '100%', borderRadius: '8px', maxHeight: '400px' }}
          />
        </div>
      )}

      {/* Stats */}
      <div className="blog-stats">
        <div className="stats-left">
          <FaThumbsUp color="#0a66c2" />
          <span>{likesCount}</span>
        </div>
        <div className="stats-right">
          <span>{blog.comments?.length || 0} comments</span>
        </div>
      </div>

      {/* Actions */}
      <div className="blog-actions">
        <button className={`action-btn ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
          {isLiked ? <FaThumbsUp className="action-icon" /> : <FaRegThumbsUp className="action-icon" />}
          <span>Like</span>
        </button>
        <button className="action-btn">
          <FaCommentDots className="action-icon" />
          <span>Comment</span>
        </button>
        <button className="action-btn" onClick={handleShare}>
          <FaShare className="action-icon" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
};

export default BlogCard;
