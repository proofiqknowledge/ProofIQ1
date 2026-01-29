import React, { useState, useEffect } from "react";

const AssignExamModal = ({ isOpen, onClose, onSubmit, examTitle }) => {
  const [assignmentType, setAssignmentType] = useState("users");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [batchSearch, setBatchSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchBatches();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Filter to get students only
        const students = data.data.filter((user) => user.role === "student");
        setUsers(students);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/batches", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBatches(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBatchToggle = (batchId) => {
    setSelectedBatches((prev) =>
      prev.includes(batchId)
        ? prev.filter((id) => id !== batchId)
        : [...prev, batchId]
    );
  };

  const filteredUsers = users.filter((user) =>
    `${user.firstName} ${user.lastName}`
      .toLowerCase()
      .includes(userSearch.toLowerCase())
  );

  const filteredBatches = batches.filter((batch) =>
    batch.name.toLowerCase().includes(batchSearch.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    if (assignmentType === "users" && selectedUsers.length === 0) {
      alert("Please select at least one user");
      return;
    }

    if (assignmentType === "batches" && selectedBatches.length === 0) {
      alert("Please select at least one batch");
      return;
    }

    const assignmentData = {
      type: assignmentType,
      [assignmentType === "users" ? "userIds" : "batchIds"]:
        assignmentType === "users" ? selectedUsers : selectedBatches,
    };

    onSubmit(assignmentData);
    setSelectedUsers([]);
    setSelectedBatches([]);
    setUserSearch("");
    setBatchSearch("");
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content assign-exam-modal">
        <div className="modal-header">
          <div>
            <h2>Assign Assessment</h2>
            <p className="exam-name">{examTitle}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {/* Assignment Type Selector */}
            <div className="assignment-type-selector">
              <label className="type-option">
                <input
                  type="radio"
                  name="assignmentType"
                  value="users"
                  checked={assignmentType === "users"}
                  onChange={(e) => setAssignmentType(e.target.value)}
                />
                <span className="option-label">Assign to Individual Users</span>
              </label>
              <label className="type-option">
                <input
                  type="radio"
                  name="assignmentType"
                  value="batches"
                  checked={assignmentType === "batches"}
                  onChange={(e) => setAssignmentType(e.target.value)}
                />
                <span className="option-label">Assign to Batches</span>
              </label>
            </div>

            {/* Users Selection */}
            {assignmentType === "users" && (
              <div className="selection-section">
                <div className="search-group">
                  <input
                    type="text"
                    placeholder="Search users by name..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="search-input"
                  />
                  <span className="selection-count">
                    {selectedUsers.length} selected
                  </span>
                </div>

                <div className="selection-list">
                  {loading ? (
                    <div className="loading-message">Loading users...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="empty-message">No users found</div>
                  ) : (
                    filteredUsers.map((user) => (
                      <label key={user._id} className="selection-item">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user._id)}
                          onChange={() => handleUserToggle(user._id)}
                        />
                        <div className="item-info">
                          <span className="item-name">
                            {user.firstName} {user.lastName}
                          </span>
                          <span className="item-email">{user.email}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Batches Selection */}
            {assignmentType === "batches" && (
              <div className="selection-section">
                <div className="search-group">
                  <input
                    type="text"
                    placeholder="Search batches by name..."
                    value={batchSearch}
                    onChange={(e) => setBatchSearch(e.target.value)}
                    className="search-input"
                  />
                  <span className="selection-count">
                    {selectedBatches.length} selected
                  </span>
                </div>

                <div className="selection-list">
                  {loading ? (
                    <div className="loading-message">Loading batches...</div>
                  ) : filteredBatches.length === 0 ? (
                    <div className="empty-message">No batches found</div>
                  ) : (
                    filteredBatches.map((batch) => (
                      <label key={batch._id} className="selection-item">
                        <input
                          type="checkbox"
                          checked={selectedBatches.includes(batch._id)}
                          onChange={() => handleBatchToggle(batch._id)}
                        />
                        <div className="item-info">
                          <span className="item-name">{batch.name}</span>
                          <span className="item-meta">
                            {batch.students?.length || 0} students
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={
              (assignmentType === "users" && selectedUsers.length === 0) ||
              (assignmentType === "batches" && selectedBatches.length === 0)
            }
          >
            Assign Assessment
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignExamModal;
