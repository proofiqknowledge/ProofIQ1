import React, { useState } from 'react';
// import { toast } from 'react-toastify';

export default function EditNameModal({ 
  currentName,
  defaultName,
  onSave,
  onClose 
}) {
  const [name, setName] = useState(currentName || defaultName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setError('');
    setIsLoading(true);

    try {
      if (typeof onSave !== 'function') {
        throw new Error('Save functionality not available');
      }
      await onSave(name.trim());
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      setError(err.message || 'Failed to update topic name');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Edit Topic Name</h2>
          <button
            onClick={onClose}
            className="close-button"
          >
            ✕
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Topic Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter topic name"
              className="name-input"
              maxLength={150}
              disabled={isLoading}
              autoFocus
            />
            <div className="char-counter">
              <span className={name.length >= 150 ? 'text-red-500' : ''}>
                {name.length}/150 characters
              </span>
            </div>
          </div>
          <div className="button-group">
            <button
              type="button"
              onClick={onClose}
              className="cancel-button"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-button"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 24px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 20px;
          color: #666;
          cursor: pointer;
          padding: 4px;
        }

        .close-button:hover {
          color: #333;
        }

        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 14px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }

        .name-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 15px;
          transition: border-color 0.15s ease;
        }

        .name-input:focus {
          border-color: #3b82f6;
          outline: none;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .char-counter {
          margin-top: 6px;
          font-size: 12px;
          color: #6b7280;
          text-align: right;
        }

        .button-group {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }

        .cancel-button {
          padding: 8px 16px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          color: #374151;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .cancel-button:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .save-button {
          padding: 8px 16px;
          background: #3b82f6;
          border: 1px solid transparent;
          border-radius: 6px;
          color: white;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .save-button:hover {
          background: #2563eb;
        }

        .save-button:disabled,
        .cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}