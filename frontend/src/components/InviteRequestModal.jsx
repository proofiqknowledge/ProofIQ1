import React, { useState, useEffect } from 'react';
import { X, Send } from 'lucide-react';

const InviteRequestModal = ({ isOpen, onClose, toUser, existingGroups = [], onSendInvite }) => {
    const [message, setMessage] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && toUser) {
            setMessage(`Hi ${toUser.name}, let's study together!`);
            setSelectedGroupId('');
        }
    }, [isOpen, toUser]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onSendInvite(toUser?._id, selectedGroupId || null, message);
        setLoading(false);
        onClose();
    };

    if (!isOpen || !toUser) return null;

    return (
        <div className="inv-modal-overlay">
            <div className="inv-modal-content">
                <button onClick={onClose} className="inv-close-btn">
                    <X size={18} />
                </button>

                <h2 className="inv-title">
                    Invite <span style={{ color: '#60a5fa' }}>{toUser?.name}</span>
                </h2>
                <p className="inv-subtitle">
                    Connect with your peer to start collaborating.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Group Selection */}
                    {existingGroups && existingGroups.length > 0 && (
                        <div>
                            <label className="inv-label">Add to Group (Optional)</label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="inv-select"
                            >
                                <option value="">Create New Group</option>
                                {existingGroups && existingGroups.filter(g => g).map(g => (
                                    <option key={g._id} value={g._id} disabled={g.members?.length >= 5}>
                                        {g.name} {g.members?.length >= 5 ? '(Full)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="inv-label">Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="inv-textarea"
                            placeholder="Write a friendly message..."
                        />
                    </div>

                    <div className="inv-footer">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inv-btn-cancel"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inv-btn-send"
                        >
                            {loading ? 'Sending...' : 'Send Invite'}
                            {!loading && <Send size={16} />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteRequestModal;
