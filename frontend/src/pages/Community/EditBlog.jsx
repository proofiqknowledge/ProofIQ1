import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaImage, FaTimes, FaInfoCircle, FaVideo } from 'react-icons/fa';
import BlogService from '../../services/blogService';
import api from '../../services/api';
import { toast } from 'react-toastify';

const EditBlog = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useSelector((state) => state.auth);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchBlog();
  }, [id]);

  const fetchBlog = async () => {
    try {
      const res = await BlogService.getById(id);
      const b = res.data.blog;
      setTitle(b.title || '');
      setBody(b.body || '');
      setStatus(b.status || '');
      setRejectReason(b.rejectReason || '');

      // Existing images are URLs; keep previews and no File objects
      if (b.images && Array.isArray(b.images)) {
        setImagePreviews(b.images.map(img => typeof img === 'string' ? img : (img.filename ? `${api.defaults.baseURL?.replace('/api','')}/api/blogs/file/${img.filename}` : '')));
      }

      if (b.video) {
        if (typeof b.video === 'string') setVideo(b.video);
        else if (b.video.filename) setVideo(`${api.defaults.baseURL?.replace('/api','')}/api/blogs/file/${b.video.filename}`);
      }

    } catch (err) {
      console.error('Failed to fetch blog', err);
      toast.error('Failed to load blog');
      navigate('/community/blogs/my');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length + imagePreviews.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setImages([...images, ...files]);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index) => {
    // If removing a new uploaded image
    if (index >= imagePreviews.length - images.length) {
      const removeIdx = index - (imagePreviews.length - images.length);
      const newImages = [...images];
      newImages.splice(removeIdx, 1);
      setImages(newImages);
    }

    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = function () {
        window.URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration > 30) {
          toast.error('Video duration must be 30 seconds or less');
        } else {
          setVideo(file);
        }
      };
      videoElement.src = URL.createObjectURL(file);
    }
  };

  const isEditable = () => {
    const s = String(status || '').toLowerCase().replace(/\s+/g, '_').replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    return ['draft','rejected','changes_requested','pending'].includes(s);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and content are required');
      return;
    }
    if (!isEditable()) {
      toast.error('This blog cannot be edited at this time');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('body', body);

    images.forEach(img => formData.append('images', img));
    if (video && typeof video !== 'string') formData.append('video', video);

    try {
      await BlogService.update(id, formData);
      toast.success('Blog submitted for approval');
      navigate('/community/blogs/my');
    } catch (err) {
      console.error('Update error', err);
      toast.error(err.response?.data?.message || 'Failed to update blog');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;

  return (
    <div style={{ backgroundColor: '#f3f2ef', minHeight: '100vh', padding: '20px 0' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '20px' }}>

        <div style={{ flex: 2, backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '20px', color: '#191919', marginBottom: '6px' }}>Edit post</h2>
          <div style={{ marginBottom: '12px', color: '#666' }}>Status: <strong>{status}</strong></div>
          {rejectReason && (
            <div style={{ marginBottom: '12px', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '6px', color: '#991b1b' }}>
              <strong>Rejection / Feedback:</strong> {rejectReason}
            </div>
          )}

          <input
            type="text"
            placeholder="Title of your post"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!isEditable()}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              marginBottom: '16px',
              outline: 'none'
            }}
          />

          <textarea
            placeholder="What do you want to talk about?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={!isEditable()}
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '10px',
              fontSize: '16px',
              border: 'none',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />

          {imagePreviews.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {imagePreviews.map((src, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={src} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                  {isEditable() && (
                    <button onClick={() => removeImage(idx)} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', border: 'none', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FaTimes size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {video && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', backgroundColor: '#eef3f8', borderRadius: '4px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0a66c2' }}>
                <FaVideo />
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{typeof video === 'string' ? video.split('/').pop() : video.name}</span>
              </div>
              {isEditable() && (
                <button onClick={() => setVideo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                  <FaTimes />
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e0e0e0', paddingTop: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ cursor: isEditable() ? 'pointer' : 'not-allowed', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaImage size={20} />
                <input type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} disabled={!isEditable()} />
              </label>
              <label style={{ cursor: isEditable() ? 'pointer' : 'not-allowed', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaVideo size={20} />
                <input type="file" accept="video/*" onChange={handleVideoChange} style={{ display: 'none' }} disabled={!isEditable()} />
              </label>
            </div>

            <div>
              {isEditable() ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    backgroundColor: submitting ? '#ccc' : '#0a66c2',
                    color: 'white',
                    border: 'none',
                    padding: '8px 24px',
                    borderRadius: '20px',
                    fontWeight: '600',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Submit for Approval
                </button>
              ) : (
                <button disabled style={{ backgroundColor: '#eee', color: '#999', border: 'none', padding: '8px 24px', borderRadius: '20px' }}>Cannot edit</button>
              )}
            </div>
          </div>
        </div>

        {/* Rules Sidebar */}
        <div style={{ flex: 1, height: 'fit-content' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#666' }}>
              <FaInfoCircle />
              <h3 style={{ fontSize: '16px', margin: 0 }}>Do's & Don'ts</h3>
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
              <li>Do keep content professional and constructive.</li>
              <li>Do include sources for any facts or code samples.</li>
              <li>Don't include personal or sensitive company data.</li>
              <li>Don't post promotional or irrelevant links.</li>
              <li>Keep images appropriate and clear.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EditBlog;
