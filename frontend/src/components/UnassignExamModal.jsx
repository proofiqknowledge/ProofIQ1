import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import * as examService from '../services/examService';
import { toast } from 'react-toastify';

const UnassignExamModal = ({ isOpen, onClose, examId, examTitle, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [assignments, setAssignments] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [activeTab, setActiveTab] = useState('users');
    const [userSearch, setUserSearch] = useState('');
    const [batchSearch, setBatchSearch] = useState('');

    useEffect(() => {
        if (isOpen && examId) {
            fetchAssignments();
            setSelectedUsers([]);
            setSelectedBatches([]);
            setUserSearch('');
            setBatchSearch('');
        }
    }, [isOpen, examId]);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const response = await examService.getExamAssignments(examId);
            setAssignments(response.data);
        } catch (error) {
            console.error('Error fetching assignments:', error);
            toast.error('Failed to load assignments');
        } finally {
            setLoading(false);
        }
    };

    const handleUserToggle = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleBatchToggle = (batchId) => {
        setSelectedBatches(prev =>
            prev.includes(batchId)
                ? prev.filter(id => id !== batchId)
                : [...prev, batchId]
        );
    };

    const handleSelectAll = () => {
        if (activeTab === 'users') {
            const allUserIds = filteredUsers.map(u => u._id);
            if (selectedUsers.length === allUserIds.length) {
                setSelectedUsers([]);
            } else {
                setSelectedUsers(allUserIds);
            }
        } else {
            const allBatchIds = filteredBatches.map(b => b._id);
            if (selectedBatches.length === allBatchIds.length) {
                setSelectedBatches([]);
            } else {
                setSelectedBatches(allBatchIds);
            }
        }
    };

    const handleUnassign = async () => {
        if (selectedUsers.length === 0 && selectedBatches.length === 0) {
            toast.warning('Please select at least one user or batch to un-assign');
            return;
        }

        try {
            setLoading(true);
            await examService.unassignExam(examId, {
                userIds: selectedUsers,
                batchIds: selectedBatches,
            });

            toast.success(`Successfully un-assigned ${selectedUsers.length + selectedBatches.length} item(s)`);
            setSelectedUsers([]);
            setSelectedBatches([]);
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Error un-assigning exam:', error);
            const errorMsg = error.response?.data?.message || 'Failed to un-assign exam';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const directUsers = assignments?.directUsers || [];
    const batches = assignments?.batches || [];

    const filteredUsers = directUsers.filter(user =>
        user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.email?.toLowerCase().includes(userSearch.toLowerCase())
    );

    const filteredBatches = batches.filter(batch =>
        batch.name?.toLowerCase().includes(batchSearch.toLowerCase())
    );

    const selectedCount = activeTab === 'users' ? selectedUsers.length : selectedBatches.length;

    return (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div
                className="modal-content"
                style={{
                    maxWidth: '900px',
                    height: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    padding: 0
                }}
            >
                {/* Compact Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Manage Assignments</h2>
                        <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '13px' }}>{examTitle}</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {loading && !assignments ? (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px 20px'
                        }}>
                            <p style={{ color: '#64748b', fontSize: '14px' }}>Loading assignments...</p>
                        </div>
                    ) : assignments ? (
                        <>
                            {/* Compact Summary Stats */}
                            <div style={{
                                padding: '10px 20px',
                                background: '#f8fafc',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                gap: '20px',
                                fontSize: '13px',
                                flexShrink: 0
                            }}>
                                <div>
                                    <strong>Total:</strong> <span style={{ color: '#3b82f6' }}>{assignments.totalAssigned}</span>
                                </div>
                                <div>
                                    <strong>Direct:</strong> {assignments.summary.directAssignments}
                                </div>
                                <div>
                                    <strong>Batches:</strong> {assignments.summary.batchAssignments}
                                </div>
                            </div>

                            {/* Compact Tabs */}
                            <div style={{
                                display: 'flex',
                                borderBottom: '2px solid #e2e8f0',
                                padding: '0 20px',
                                background: '#fff',
                                flexShrink: 0
                            }}>
                                <button
                                    onClick={() => setActiveTab('users')}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'users' ? '2px solid #3b82f6' : '2px solid transparent',
                                        color: activeTab === 'users' ? '#3b82f6' : '#64748b',
                                        fontWeight: activeTab === 'users' ? 600 : 400,
                                        cursor: 'pointer',
                                        marginBottom: '-2px',
                                        fontSize: '13px',
                                    }}
                                >
                                    Un-assign Users ({directUsers.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('batches')}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'batches' ? '2px solid #3b82f6' : '2px solid transparent',
                                        color: activeTab === 'batches' ? '#3b82f6' : '#64748b',
                                        fontWeight: activeTab === 'batches' ? 600 : 400,
                                        cursor: 'pointer',
                                        marginBottom: '-2px',
                                        fontSize: '13px',
                                    }}
                                >
                                    Un-assign Batches ({batches.length})
                                </button>
                            </div>

                            {/* Compact Search and Select All */}
                            <div style={{
                                padding: '12px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid #e2e8f0',
                                background: '#fff',
                                flexShrink: 0
                            }}>
                                <input
                                    type="text"
                                    placeholder={activeTab === 'users' ? 'Search by name or email' : 'Search batches'}
                                    value={activeTab === 'users' ? userSearch : batchSearch}
                                    onChange={(e) => activeTab === 'users' ? setUserSearch(e.target.value) : setBatchSearch(e.target.value)}
                                    style={{
                                        padding: '6px 10px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '4px',
                                        fontSize: '13px',
                                        width: '280px',
                                    }}
                                />
                                <button
                                    onClick={handleSelectAll}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'none',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        color: '#3b82f6',
                                    }}
                                >
                                    {(activeTab === 'users' && selectedUsers.length === filteredUsers.length && filteredUsers.length > 0) ||
                                        (activeTab === 'batches' && selectedBatches.length === filteredBatches.length && filteredBatches.length > 0)
                                        ? 'Deselect All'
                                        : `Select All (${activeTab === 'users' ? filteredUsers.length : filteredBatches.length})`
                                    }
                                </button>
                            </div>

                            {/* Users Tab */}
                            {activeTab === 'users' && (
                                <div style={{ flex: 1, minHeight: 0 }}>
                                    {filteredUsers.length === 0 ? (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '100%',
                                            padding: '40px 20px',
                                            color: '#64748b',
                                            textAlign: 'center'
                                        }}>
                                            <div>
                                                <p style={{ fontSize: '14px' }}>No directly assigned users found.</p>
                                                <p style={{ fontSize: '12px', marginTop: '6px' }}>
                                                    Users assigned via batches cannot be individually un-assigned.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                                                <tr>
                                                    <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '40px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                                            onChange={handleSelectAll}
                                                        />
                                                    </th>
                                                    <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        Name
                                                    </th>
                                                    <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        Email
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.map((user) => (
                                                    <tr
                                                        key={user._id}
                                                        style={{
                                                            borderBottom: '1px solid #f1f5f9',
                                                            cursor: 'pointer',
                                                            background: selectedUsers.includes(user._id) ? '#eff6ff' : '#fff',
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUserToggle(user._id);
                                                        }}
                                                    >
                                                        <td style={{ padding: '8px 20px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedUsers.includes(user._id)}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUserToggle(user._id);
                                                                }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px 20px', fontSize: '13px' }}>
                                                            {user.name || 'N/A'}
                                                        </td>
                                                        <td style={{ padding: '8px 20px', fontSize: '13px', color: '#64748b' }}>
                                                            {user.email}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {/* Batches Tab */}
                            {activeTab === 'batches' && (
                                <div style={{ flex: 1, minHeight: 0 }}>
                                    {filteredBatches.length === 0 ? (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '100%',
                                            padding: '40px 20px',
                                            color: '#64748b'
                                        }}>
                                            <p style={{ fontSize: '14px' }}>No batches assigned to this exam.</p>
                                        </div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                                                <tr>
                                                    <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', width: '40px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBatches.length === filteredBatches.length && filteredBatches.length > 0}
                                                            onChange={handleSelectAll}
                                                        />
                                                    </th>
                                                    <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        Batch Name
                                                    </th>
                                                    <th style={{ padding: '8px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        Students
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredBatches.map((batch) => (
                                                    <tr
                                                        key={batch._id}
                                                        style={{
                                                            borderBottom: '1px solid #f1f5f9',
                                                            cursor: 'pointer',
                                                            background: selectedBatches.includes(batch._id) ? '#eff6ff' : '#fff',
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleBatchToggle(batch._id);
                                                        }}
                                                    >
                                                        <td style={{ padding: '8px 20px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedBatches.includes(batch._id)}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    handleBatchToggle(batch._id);
                                                                }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '8px 20px', fontSize: '13px' }}>
                                                            {batch.name}
                                                        </td>
                                                        <td style={{ padding: '8px 20px', fontSize: '13px', color: '#64748b' }}>
                                                            {batch.students?.length || 0} students
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                {/* Compact Footer */}
                <div style={{
                    borderTop: '1px solid #e2e8f0',
                    padding: '12px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#fff',
                    flexShrink: 0
                }}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                        {selectedCount > 0 ? (
                            <span><strong>{selectedCount}</strong> {activeTab === 'users' ? 'user(s)' : 'batch(es)'} selected</span>
                        ) : (
                            <span>No recipients selected yet.</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid #e2e8f0',
                                background: '#fff',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleUnassign}
                            disabled={loading || (selectedUsers.length === 0 && selectedBatches.length === 0)}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                background: (selectedUsers.length === 0 && selectedBatches.length === 0) ? '#cbd5e1' : '#ef4444',
                                color: '#fff',
                                borderRadius: '4px',
                                cursor: (selectedUsers.length === 0 && selectedBatches.length === 0) ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                            }}
                        >
                            {loading ? 'Un-assigning...' : 'Un-assign Selected'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnassignExamModal;
