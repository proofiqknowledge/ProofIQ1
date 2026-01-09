import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaCheckCircle, FaTimesCircle, FaEye, FaSpinner } from 'react-icons/fa';
import api from '../services/api';

export default function CourseContentProposalManager() {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    setLoading(true);
    try {
     const res = await api.get("/course-proposals/admin/all");
      setProposals(res.data);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      toast.error('Failed to fetch proposals');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (proposalId, status) => {
    try {
      await api.post('/course-content-proposals/review', {
        proposalId,
        status
      });
      toast.success(`Proposal ${status} successfully`);
      fetchProposals(); // Refresh list
      setShowViewModal(false);
    } catch (err) {
      console.error('Error reviewing proposal:', err);
      toast.error('Failed to update proposal');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <FaSpinner className="text-xl animate-spin text-gray-600" />
      </div>
    );
  }
  const filteredProposals = proposals.filter(p => 
  (p.status || 'pending').toLowerCase() === activeTab.toLowerCase()
);


  return (
    <div className="proposal-manager">
      <div className="card">
        <div className="card-head">
          <h2><FaFileAlt /> Course Content Proposals</h2>
          <span className="muted">{proposals.length} pending</span>
        </div>

        {proposals.length === 0 ? (
          <div className="empty">No pending content proposals</div>
        ) : (
          <div className="proposals-list">
            {proposals.map(proposal => (
              <div key={proposal._id} className="proposal-item">
                <div className="proposal-info">
                  <div className="proposal-title">{proposal.title}</div>
                  <div className="proposal-meta">
                    <span>Week {proposal.week}, Day {proposal.day}</span>
                    <span>By {proposal.trainer?.name}</span>
                    <span>For {proposal.course?.title}</span>
                  </div>
                </div>

                <div className="proposal-actions">
                  <button 
                    className="btn-view"
                    onClick={() => {
                      setSelectedProposal(proposal);
                      setShowViewModal(true);
                    }}
                  >
                    <FaEye /> View
                  </button>
                  <button 
                    className="btn-approve"
                    onClick={() => handleReview(proposal._id, 'approved')}
                  >
                    <FaCheckCircle /> Approve
                  </button>
                  <button 
                    className="btn-reject"
                    onClick={() => handleReview(proposal._id, 'rejected')}
                  >
                    <FaTimesCircle /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Proposal Modal */}
      {showViewModal && selectedProposal && (
        <div className="modal-backdrop" onClick={() => setShowViewModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Review Course Content Proposal</h3>
              <button className="close" onClick={() => setShowViewModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="field">
                <div className="label">Title</div>
                <div className="value">{selectedProposal.title}</div>
              </div>

              <div className="field">
                <div className="label">Overview</div>
                <div className="value overview">{selectedProposal.overview || 'No overview provided'}</div>
              </div>

              <div className="field">
                <div className="label">Course</div>
                <div className="value">{selectedProposal.course?.title}</div>
              </div>

              <div className="field">
                <div className="label">Week & Day</div>
                <div className="value">Week {selectedProposal.week}, Day {selectedProposal.day}</div>
              </div>

              <div className="field">
                <div className="label">Proposed By</div>
                <div className="value">{selectedProposal.trainer?.name} ({selectedProposal.trainer?.email})</div>
              </div>

              <div className="modal-actions">
                <button className="btn-muted" onClick={() => setShowViewModal(false)}>Close</button>
                <button 
                  className="btn-reject"
                  onClick={() => handleReview(selectedProposal._id, 'rejected')}
                >
                  Reject Proposal
                </button>
                <button 
                  className="btn-approve"
                  onClick={() => handleReview(selectedProposal._id, 'approved')}
                >
                  Approve Proposal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
.proposal-manager {
  padding: 1rem;
}

.proposals-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 70vh;
  overflow-y: auto;
}

.proposal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  gap: 1rem;
}

.proposal-info {
  flex: 1;
}

.proposal-title {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.proposal-meta {
  display: flex;
  gap: 1rem;
  color: var(--muted);
  font-size: 0.9rem;
}

.proposal-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-view {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: white;
  color: var(--muted);
  transition: all 0.2s;
}

.btn-approve {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: #059669;
  color: white;
  transition: all 0.2s;
}

.btn-reject {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: #dc2626;
  color: white;
  transition: all 0.2s;
}

.btn-view:hover { background: #f9fafb; }
.btn-approve:hover { background: #047857; }
.btn-reject:hover { background: #b91c1c; }

/* Modal Styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-head {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-head h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.modal-body {
  padding: 1rem;
}

.field {
  margin-bottom: 1rem;
}

.label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--muted);
}

.value {
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
}

.value.overview {
  white-space: pre-wrap;
  min-height: 100px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

@media (max-width: 640px) {
  .proposal-item {
    flex-direction: column;
    align-items: stretch;
  }
  
  .proposal-actions {
    justify-content: flex-end;
  }
  
  .proposal-meta {
    flex-direction: column;
    gap: 0.25rem;
  }
}
      `}</style>
    </div>
  );
}