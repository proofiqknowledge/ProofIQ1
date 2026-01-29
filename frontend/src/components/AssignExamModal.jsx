import React, { useEffect, useMemo, useState } from 'react';
import './AssignExamModal.css';

const PAGE_SIZE = 8;
const DEFAULT_AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#14b8a6', '#8b5cf6'];

const toIdString = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  if (value.id) return value.id.toString();
  return value.toString();
};

const normalizeText = (value) => (value || '').toString().toLowerCase();

const sorters = {
  name: (candidate) => normalizeText(candidate.name),
  email: (candidate) => normalizeText(candidate.email),
  role: (candidate) => normalizeText(candidate.role),
  status: (candidate) => (candidate.assigned ? 1 : 0),
};

const AssignExamModal = ({
  exam,
  onClose,
  onAssign,
  availableUsers = [],
  availableBatches = [],
}) => {
  const [mode, setMode] = useState('users'); // users | batches
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const assignedUserIds = useMemo(() => {
    const ids = exam?.assignedTo?.users || [];
    return new Set(ids.map((value) => toIdString(value)));
  }, [exam]);

  const enrichedUsers = useMemo(
    () =>
      availableUsers.map((user, index) => {
        const id = toIdString(user);
        const assigned = assignedUserIds.has(id);
        const initials = normalizeText(user.name || user.email || 'CAND')[0]?.toUpperCase() || 'C';
        const avatarColor = DEFAULT_AVATAR_COLORS[index % DEFAULT_AVATAR_COLORS.length];

        return {
          ...user,
          __id: id,
          assigned,
          initials,
          avatarColor,
        };
      }),
    [availableUsers, assignedUserIds]
  );

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return enrichedUsers;
    const query = normalizeText(searchTerm);
    return enrichedUsers.filter((user) =>
      normalizeText(user.name).includes(query) || normalizeText(user.email).includes(query)
    );
  }, [enrichedUsers, searchTerm]);

  const sortedUsers = useMemo(() => {
    const users = [...filteredUsers];
    const comparator = sorters[sortConfig.key] || sorters.name;
    users.sort((a, b) => {
      const valueA = comparator(a);
      const valueB = comparator(b);
      if (valueA === valueB) return 0;
      if (valueA === undefined || valueA === null) return 1;
      if (valueB === undefined || valueB === null) return -1;
      const comparison = valueA > valueB ? 1 : -1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    return users;
  }, [filteredUsers, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig, mode]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedUsers.slice(start, start + PAGE_SIZE);
  }, [sortedUsers, currentPage]);

  const handleRequestSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAllUsers = () => {
    const selectableUsers = sortedUsers.filter((user) => !user.assigned);
    const allIds = selectableUsers.map((user) => user.__id).filter((id) => id);
    const hasAllSelected = allIds.length > 0 && allIds.every((id) => selectedUsers.includes(id));
    if (hasAllSelected) {
      setSelectedUsers((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedUsers((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const toggleBatchSelection = (batchId) => {
    setSelectedBatches((prev) =>
      prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
    );
  };

  const handleSubmitAssignment = async () => {
    if (selectedUsers.length === 0 && selectedBatches.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onAssign({ userIds: selectedUsers, batchIds: selectedBatches });
      setSubmitting(false);
      onClose();
    } catch (error) {
      console.error('Error assigning exam:', error);
      setSubmitting(false);
    }
  };

  const sortIcon = (key) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  const renderUserTable = () => {
    const selectableUsers = sortedUsers.filter((user) => !user.assigned);
    const isAllSelectableSelected =
      selectableUsers.length > 0 &&
      selectableUsers.every((user) => selectedUsers.includes(user.__id));

    return (
      <div className="assign-modal__users">
      <div className="assign-modal__filters">
        <div className="assign-modal__search">
          <input
            type="search"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="assign-modal__select-all"
          onClick={toggleSelectAllUsers}
          disabled={selectableUsers.length === 0}
        >
          {isAllSelectableSelected ? 'Clear Selection' : `Select All (${selectableUsers.length})`}
        </button>
      </div>

      <div className="assign-modal__table-wrapper">
        <table className="assign-modal__table">
          <thead>
            <tr>
              <th style={{ width: '48px' }}>
                <input
                  type="checkbox"
                  onChange={toggleSelectAllUsers}
                  checked={isAllSelectableSelected}
                />
              </th>
              <th>
                <button type="button" onClick={() => handleRequestSort('name')}>
                  Name <span>{sortIcon('name')}</span>
                </button>
              </th>
              <th>
                <button type="button" onClick={() => handleRequestSort('email')}>
                  Email <span>{sortIcon('email')}</span>
                </button>
              </th>
              <th>
                <button type="button" onClick={() => handleRequestSort('role')}>
                  Role <span>{sortIcon('role')}</span>
                </button>
              </th>
              <th>
                <button type="button" onClick={() => handleRequestSort('status')}>
                  Status <span>{sortIcon('status')}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="assign-modal__empty">
                  No users match your search.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.__id);
                return (
                  <tr key={user.__id} className={user.assigned ? 'is-assigned' : undefined}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={user.assigned}
                        checked={isSelected}
                        onChange={() => toggleUserSelection(user.__id)}
                      />
                    </td>
                    <td>
                      <div className="assign-modal__user">
                        <div
                          className="assign-modal__avatar"
                          style={{ backgroundColor: user.avatarColor }}
                        >
                          {user.initials}
                        </div>
                        <div>
                          <div className="assign-modal__name">{user.name || 'Unnamed Candidate'}</div>
                          <div className="assign-modal__meta">ID: {user.employeeId || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="assign-modal__email">{user.email}</div>
                    </td>
                    <td>
                      <span className="assign-modal__badge assign-modal__badge--muted">
                        {user.role || 'Student'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`assign-modal__badge ${
                          user.assigned ? 'assign-modal__badge--success' : 'assign-modal__badge--warning'
                        }`}
                      >
                        {user.assigned ? 'Assigned' : 'Not Assigned'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="assign-modal__pagination">
        <button
          type="button"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
    );
  };

  const renderBatchCards = () => (
    <div className="assign-modal__batches">
      <div className="assign-modal__filters">
        <div className="assign-modal__search">
          <input
            type="search"
            placeholder="Search batches"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
      </div>
      <div className="assign-modal__batch-grid">
        {availableBatches.length === 0 ? (
          <div className="assign-modal__empty">No batches available.</div>
        ) : (
          availableBatches
            .filter((batch) => normalizeText(batch.name).includes(normalizeText(searchTerm)))
            .map((batch, index) => {
              const batchId = toIdString(batch);
              const isSelected = selectedBatches.includes(batchId);
              const createdAt = batch.createdAt ? new Date(batch.createdAt) : null;
              const studentCount = batch.users?.length ?? batch.studentCount ?? 0;

              return (
                <div
                  key={batchId || index}
                  className={`assign-modal__batch-card ${isSelected ? 'is-selected' : ''}`}
                >
                  <div className="assign-modal__batch-header">
                    <h4>{batch.name || 'Untitled Batch'}</h4>
                    <span className="assign-modal__badge assign-modal__badge--muted">
                      {studentCount} Students
                    </span>
                  </div>
                  <div className="assign-modal__batch-body">
                    <div>
                      <span className="assign-modal__batch-label">Created</span>
                      <span className="assign-modal__batch-value">
                        {createdAt ? createdAt.toLocaleDateString() : '—'}
                      </span>
                    </div>
                    {batch.description && (
                      <p className="assign-modal__batch-description">{batch.description}</p>
                    )}
                  </div>
                  <div className="assign-modal__batch-footer">
                    <button
                      type="button"
                      className={isSelected ? 'is-active' : undefined}
                      onClick={() => toggleBatchSelection(batchId)}
                    >
                      {isSelected ? 'Selected' : 'Select Batch'}
                    </button>
                  </div>
                </div>
              );
            })
        )}
      </div>
    </div>
  );

  const selectedCount = selectedUsers.length + selectedBatches.length;

  return (
    <div className="assign-modal__overlay" onClick={onClose}>
      <div className="assign-modal__panel" onClick={(event) => event.stopPropagation()}>
        <div className="assign-modal__header">
          <div>
            <h2>Assign Assessment</h2>
            <p>Assign this assessment to individual users or entire batches.</p>
          </div>
          <button type="button" className="assign-modal__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="assign-modal__tabs">
          <button
            type="button"
            className={mode === 'users' ? 'is-active' : undefined}
            onClick={() => setMode('users')}
          >
            Assign to Users
          </button>
          <button
            type="button"
            className={mode === 'batches' ? 'is-active' : undefined}
            onClick={() => setMode('batches')}
          >
            Assign to Batches
          </button>
        </div>

        <div className="assign-modal__body">
          {mode === 'users' ? renderUserTable() : renderBatchCards()}
        </div>

        <div className="assign-modal__actions">
          <div className="assign-modal__selection">
            {selectedCount === 0 ? 'No recipients selected yet.' : `${selectedCount} selected`}
          </div>
          <div className="assign-modal__buttons">
            <button type="button" onClick={onClose} className="assign-modal__btn assign-modal__btn--ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitAssignment}
              className="assign-modal__btn assign-modal__btn--primary"
              disabled={selectedCount === 0 || submitting}
            >
              {submitting ? 'Assigning…' : 'Assign Selected'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignExamModal;
