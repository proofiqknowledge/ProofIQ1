import React, { useState, useEffect } from 'react';
import reexamService from '../../services/reexamService';
import './AdminReExamRequests.css';

export default function AdminReExamRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const LIMIT = 10;

  useEffect(() => {
    fetchRequests(page, filter);
  }, [filter, page]);

  const fetchRequests = async (pageNum, statusFilter) => {
    try {
      setLoading(true);
      setError(null);
      const response = await reexamService.getAllReExamRequests(
        statusFilter === 'all' ? null : statusFilter,
        pageNum,
        LIMIT
      );
      setRequests(response.data || []);
      setPagination(response.pagination || {});
    } catch (err) {
      setError('Failed to fetch re-exam requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleViewReason = (request) => {
    setSelectedRequest(request);
    setShowReasonModal(true);
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this re-exam request?')) {
      return;
    }

    setActionLoading(true);
    try {
      await reexamService.approveReExamRequest(id);
      // Refresh the list
      fetchRequests(page, filter);
      // Close reason modal if open
      setShowReasonModal(false);
      setSelectedRequest(null);
    } catch (err) {
      alert('Failed to approve request: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this re-exam request?')) {
      return;
    }

    setActionLoading(true);
    try {
      await reexamService.rejectReExamRequest(id);
      // Refresh the list
      fetchRequests(page, filter);
      // Close reason modal if open
      setShowReasonModal(false);
      setSelectedRequest(null);
    } catch (err) {
      alert('Failed to reject request: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge status-pending">Pending</span>;
      case 'approved':
        return <span className="status-badge status-approved">Approved</span>;
      case 'rejected':
        return <span className="status-badge status-rejected">Rejected</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="admin-reexam-container">
      <div className="admin-reexam-header">
        <h1>Re-Assessment Requests</h1>
        <p>Manage and approve student re-exam requests</p>
      </div>

      {/* Filter Buttons */}
      <div className="admin-reexam-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          All
        </button>
        <button
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => handleFilterChange('pending')}
        >
          Pending
        </button>
        <button
          className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => handleFilterChange('approved')}
        >
          Approved
        </button>
        <button
          className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => handleFilterChange('rejected')}
        >
          Rejected
        </button>
      </div>

      {error && <div className="admin-reexam-error">{error}</div>}

      {/* Requests Table */}
      {loading ? (
        <div className="admin-reexam-loading">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="admin-reexam-empty">No re-exam requests found</div>
      ) : (
        <>
          <div className="admin-reexam-table-wrapper">
            <table className="admin-reexam-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Employee ID</th>
                  <th>Assessment Name</th>
                  <th>Date/Time Written</th>
                  <th>Marks</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request._id}>
                    <td>{request.studentName}</td>
                    <td>{request.employeeId || '-'}</td>
                    <td>{request.examName}</td>
                    <td>
                      {request.writtenAt
                        ? new Date(request.writtenAt).toLocaleString()
                        : '-'}
                    </td>
                    <td>{request.marks || '-'}</td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td className="admin-reexam-actions">
                      <button
                        className="action-btn action-reason"
                        onClick={() => handleViewReason(request)}
                      >
                        View Reason
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button
                            className="action-btn action-approve"
                            onClick={() => handleApprove(request._id)}
                            disabled={actionLoading}
                          >
                            Approve
                          </button>
                          <button
                            className="action-btn action-reject"
                            onClick={() => handleReject(request._id)}
                            disabled={actionLoading}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="admin-reexam-pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                ← Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                disabled={page === pagination.pages}
                onClick={() => setPage(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Reason Modal */}
      {showReasonModal && selectedRequest && (
        <div className="admin-reexam-modal-overlay" onClick={() => setShowReasonModal(false)}>
          <div
            className="admin-reexam-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="admin-reexam-modal-close"
              onClick={() => setShowReasonModal(false)}
            >
              ✕
            </button>

            <h2 className="admin-reexam-modal-title">Re-Exam Request Details</h2>

            <div className="admin-reexam-detail-grid">
              <div className="detail-item">
                <label>Student Name:</label>
                <p>{selectedRequest.studentName}</p>
              </div>
              <div className="detail-item">
                <label>Employee ID:</label>
                <p>{selectedRequest.employeeId || '-'}</p>
              </div>
              <div className="detail-item">
                <label>Assessment Name:</label>
                <p>{selectedRequest.examName}</p>
              </div>
              <div className="detail-item">
                <label>Marks:</label>
                <p>{selectedRequest.marks || '-'}</p>
              </div>
            </div>

            <div className="admin-reexam-reason-box">
              <label>Reason for Re-Assessment Request:</label>
              <p>{selectedRequest.reason}</p>
            </div>

            <div className="admin-reexam-modal-actions">
              <button
                className="modal-btn modal-btn-close"
                onClick={() => setShowReasonModal(false)}
              >
                Close
              </button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    className="modal-btn modal-btn-approve"
                    onClick={() => handleApprove(selectedRequest._id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    className="modal-btn modal-btn-reject"
                    onClick={() => handleReject(selectedRequest._id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Processing...' : 'Reject'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
