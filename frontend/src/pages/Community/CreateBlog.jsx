import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FaImage, FaFileAlt, FaTimes, FaInfoCircle, FaVideo } from 'react-icons/fa';
import BlogService from '../../services/blogService';
import { toast } from 'react-toastify';

const CreateBlog = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [video, setVideo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    setImages([...images, ...files]);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);

    const newPreviews = [...imagePreviews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate duration
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = function () {
        window.URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration > 30) {
          toast.error("Video duration must be 30 seconds or less");
          setVideo(null);
        } else {
          setVideo(file);
        }
      };
      videoElement.src = URL.createObjectURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('body', body);

    images.forEach(img => {
      formData.append('images', img);
    });

    if (video) {
      formData.append('video', video);
    }

    try {
      await BlogService.create(formData);
      toast.success("Blog submitted for approval!");
      navigate('/community/blogs/my');
    } catch (err) {
      console.error("Create blog error", err);
      toast.error("Failed to create blog");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#f3f2ef', minHeight: '100vh', padding: '20px 0' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '20px' }}>

        {/* Main Form */}
        <div style={{ flex: 2, backgroundColor: 'white', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: '20px', color: '#191919', marginBottom: '20px' }}>Create a post</h2>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <img
              src={user?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
              alt="Profile"
              style={{ width: '48px', height: '48px', borderRadius: '50%', marginRight: '12px', objectFit: 'cover' }}
              onError={(e) => e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
            />
            <span style={{ fontWeight: '600', fontSize: '16px' }}>{user?.name || "User"}</span>
          </div>

          <input
            type="text"
            placeholder="Title of your post"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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

          {/* Previews */}
          {imagePreviews.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {imagePreviews.map((src, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={src} alt="Preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                  <button
                    onClick={() => removeImage(idx)}
                    style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', border: 'none', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {video && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', backgroundColor: '#eef3f8', borderRadius: '4px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0a66c2' }}>
                <FaVideo />
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{video.name}</span>
              </div>
              <button onClick={() => setVideo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                <FaTimes />
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e0e0e0', paddingTop: '16px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaImage size={20} />
                <input type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </label>
              <label style={{ cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaVideo size={20} />
                <input type="file" accept="video/*" onChange={handleVideoChange} style={{ display: 'none' }} />
              </label>
            </div>

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
              Post
            </button>
          </div>
        </div>

        {/* Rules Sidebar */}
        <div style={{ flex: 1, height: 'fit-content' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#666' }}>
              <FaInfoCircle />
              <h3 style={{ fontSize: '16px', margin: 0 }}>Posting Guidelines</h3>
            </div>
            <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
              <li>Be respectful and professional.</li>
              <li>No religious or political content.</li>
              <li>Follow the company attire policy in images.</li>
              <li>Ensure content adds value to the community.</li>
              <li>Avoid spam or self-promotion.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateBlog;
