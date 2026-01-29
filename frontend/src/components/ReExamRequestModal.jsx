import React, { useState, useEffect } from 'react';
import reexamService from '../services/reexamService';
import './ReExamRequestModal.css';

export default function ReExamRequestModal({
  isOpen,
  onClose,
  exam,
  studentId,
  studentName,
  employeeId,
  onSuccess,
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!reason.trim()) {
      setError('Please provide a reason for requesting re-exam');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        studentId,
        studentName,
        employeeId,
        examId: exam.examId || exam._id,
        examName: exam.title,
        writtenAtDate: new Date().toISOString().split('T')[0],
        writtenAtTime: new Date().toTimeString().slice(0, 5),
        presentMarks: exam.marks || 0,
        reason: reason.trim(),
      };

      await reexamService.createReExamRequest(payload);
      setSuccess(true);
      setReason('');
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit re-exam request');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="reexam-modal-overlay" onClick={onClose}>
      <div className="reexam-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="reexam-modal-close" onClick={onClose}>✕</button>
        
        <h2 className="reexam-modal-title">Request Re-Assessment</h2>
        
        {success ? (
          <div className="reexam-success-message">
            ✓ Request submitted successfully! Awaiting admin approval.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="reexam-form-group">
              <label>Assessment Name</label>
              <input type="text" value={exam?.title || ''} disabled />
            </div>

            <div className="reexam-form-group">
              <label>Assessment ID</label>
              <input type="text" value={exam?.examId || exam?._id || ''} disabled />
            </div>

            <div className="reexam-form-row">
              <div className="reexam-form-group">
                <label>Student Name</label>
                <input type="text" value={studentName || ''} disabled />
              </div>
              <div className="reexam-form-group">
                <label>Employee ID</label>
                <input type="text" value={employeeId || ''} disabled />
              </div>
            </div>

            <div className="reexam-form-group">
              <label htmlFor="reason">Reason for Re-Assessment Request *</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why you are requesting a re-exam..."
                rows="5"
                disabled={loading}
              />
            </div>

            {error && <div className="reexam-error-message">{error}</div>}

            <div className="reexam-modal-actions">
              <button
                type="button"
                className="reexam-btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="reexam-btn-submit"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
