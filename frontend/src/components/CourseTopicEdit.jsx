import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { updateDayName, getWeekDetails } from '../services/courseService';

export default function CourseTopicEdit({ topic, courseId, weekNumber, onUpdate, onClose }) {
  const [newTitle, setNewTitle] = useState(topic.title || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError('Topic name cannot be empty');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await updateDayName(courseId, weekNumber, topic.dayNumber, {
        title: newTitle.trim()
      });

      if (response) {
        // fetch fresh week details so parent receives the full updated week object
        const freshWeek = await getWeekDetails(courseId, weekNumber);
        toast.success('Topic name updated successfully');
        onUpdate(freshWeek);
        onClose();
      }
    } catch (err) {
      console.error('Error updating topic:', err);
      const msg = err.response?.data?.message || 'Failed to update topic name';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">Edit Topic</h3>
          <button
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4" style={{ background: '#FEF2F2', padding: '10px 12px', borderRadius: 8, color: '#991B1B' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="topicName" className="form-label">Topic Name</label>
            <input
              id="topicName"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="form-control"
              placeholder="Enter topic name"
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="adm-btn secondary"
              disabled={isLoading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="adm-btn primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}