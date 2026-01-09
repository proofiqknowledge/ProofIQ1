import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useDispatch } from 'react-redux';
import { addDayToWeek, updateDayInWeek } from '../../services/courseService';

export default function WeekManageModal({ courseId, weekNumber, onClose, onSuccess, editMode = false, topicData = null }) {
  const [dayNumber, setDayNumber] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editMode && topicData) {
      setDayNumber(topicData.dayNumber.toString());
      setTitle(topicData.title);
    }
  }, [editMode, topicData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!title.trim()) {
        throw new Error('Please enter a topic name');
      }

      if (!dayNumber || isNaN(dayNumber) || dayNumber < 1) {
        throw new Error('Please enter a valid topic number');
      }

      let response;
      if (editMode) {
        response = await updateDayInWeek(courseId, weekNumber, topicData.dayNumber, {
          dayNumber: parseInt(dayNumber),
          title: title.trim()
        });
      } else {
        response = await addDayToWeek(courseId, weekNumber, {
          dayNumber: parseInt(dayNumber),
          title: title.trim()
        });
      }

      onSuccess(response.week);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || `Failed to ${editMode ? 'update' : 'add'} topic`);
    } finally {
      setIsLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <h2>{editMode ? 'Edit Topic' : 'Add New Topic'}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Topic Name *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter topic name"
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="dayNumber">Topic Number *</label>
            <input
              type="number"
              id="dayNumber"
              value={dayNumber}
              onChange={(e) => setDayNumber(e.target.value)}
              min="1"
              required
              disabled={isLoading}
            />
          </div>
          <div className="button-group">
            <button type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={isLoading}>
              {isLoading ? (editMode ? 'Updating...' : 'Adding...') : (editMode ? 'Update Topic' : 'Add Topic')}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          overflow-y: auto;
          padding: 20px;
        }

        .modal-content {
          background: white;
          padding: 28px;
          border-radius: 12px;
          width: 90%;
          max-width: 450px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
        }

        .error-message {
          color: #dc2626;
          background: #fee2e2;
          padding: 10px 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          font-size: 14px;
          color: #374151;
        }

        input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        input:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }

        .button-group {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        button {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-weight: 500;
          font-size: 14px;
          transition: all 0.2s;
          min-width: 90px;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        button.primary {
          background: #2563eb;
          color: white;
        }

        button.primary:hover:not(:disabled) {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        button:not(.primary) {
          background: #e5e7eb;
          color: #374151;
        }

        button:not(.primary):hover:not(:disabled) {
          background: #d1d5db;
        }

        @media (max-width: 640px) {
          .modal-content {
            width: 95%;
            padding: 24px;
            max-height: 85vh;
          }

          h2 {
            font-size: 18px;
          }

          .button-group {
            flex-direction: column-reverse;
            gap: 8px;
          }

          button {
            width: 100%;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}