import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import BlogService from '../../services/blogService';
import BlogCard from '../../components/Blog/BlogCard';
import { FaPen, FaImage, FaCalendarAlt, FaNewspaper } from 'react-icons/fa';

const BlogFeed = () => {
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            const res = await BlogService.getApproved();
            setBlogs(res.data.blogs);
        } catch (err) {
            console.error("Failed to fetch blogs", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: '#f3f2ef', minHeight: '100vh', padding: '20px 0' }}>
            <div style={{ maxWidth: '650px', margin: '0 auto' }}>

                {/* Create Post Widget */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '16px',
                    border: '1px solid #e0e0e0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <img
                            src={user?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                            alt="Profile"
                            style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                            onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
                        />
                        <button
                            onClick={() => navigate('/community/blogs/create')}
                            style={{
                                flex: 1,
                                borderRadius: '35px',
                                border: '1px solid #a8a8a8',
                                backgroundColor: 'white',
                                textAlign: 'left',
                                padding: '0 16px',
                                color: '#666',
                                fontWeight: '600',
                                cursor: 'pointer',
                                height: '48px'
                            }}
                        >
                            Start a post
                        </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
                        <button style={actionButtonStyle} onClick={() => navigate('/community/blogs/create')}>
                            <FaImage color="#378fe9" size={20} /> <span style={{ marginLeft: '8px', color: '#5e5e5e', fontWeight: '600', fontSize: '14px' }}>Media</span>
                        </button>
                        <button style={actionButtonStyle} onClick={() => navigate('/community/blogs/create')}>
                            <FaCalendarAlt color="#c37d16" size={20} /> <span style={{ marginLeft: '8px', color: '#5e5e5e', fontWeight: '600', fontSize: '14px' }}>Event</span>
                        </button>
                        <button style={actionButtonStyle} onClick={() => navigate('/community/blogs/create')}>
                            <FaNewspaper color="#e06847" size={20} /> <span style={{ marginLeft: '8px', color: '#5e5e5e', fontWeight: '600', fontSize: '14px' }}>Write article</span>
                        </button>
                    </div>
                </div>

                {/* Feed */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Loading feed...</div>
                ) : (
                    blogs.map(blog => (
                        <BlogCard key={blog._id} blog={blog} />
                    ))
                )}

                {!loading && blogs.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        <p>No posts yet. Be the first to post!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const actionButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px'
};

export default BlogFeed;
