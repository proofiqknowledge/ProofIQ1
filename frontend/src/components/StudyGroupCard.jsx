import React, { useState } from 'react';
import { Users, Edit2, LogOut, UserPlus, Check, X, MessageSquare } from 'lucide-react';

const StudyGroupCard = ({ group, currentUserId, onUpdateName, onLeave, onInviteMember, onChat }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(group.name);

    const handleUpdate = () => {
        if (newName.trim() && newName !== group.name) {
            onUpdateName(group._id, newName);
        }
        setIsEditing(false);
    };

    const isFull = (group?.members?.length || 0) >= 5;

    if (!group) return null;

    const members = (group.members || []).filter(m => m);

    return (

        <div className="sg-card">
            <div className="sg-card-header">
                <div style={{ flex: 1, marginRight: '1rem' }}>
                    {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                style={{
                                    background: '#2a2a2a',
                                    color: 'white',
                                    padding: '0.375rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(59, 130, 246, 0.5)',
                                    outline: 'none',
                                    width: '100%',
                                    fontWeight: 'bold'
                                }}
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                            />
                            <button
                                onClick={handleUpdate}
                                className="sg-btn"
                                style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }}
                            >
                                <Check size={18} />
                            </button>
                            <button
                                onClick={() => { setIsEditing(false); setNewName(group.name); }}
                                className="sg-btn"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="group">
                            <h3 className="sg-card-title">{group.name}</h3>
                            <button
                                onClick={() => setIsEditing(true)}
                                style={{ color: '#6b7280', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            >
                                <Edit2 size={16} />
                            </button>
                        </div>
                    )}
                    <span className="sg-card-subtitle">
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></span>
                        Created by <span style={{ color: '#d1d5db', fontWeight: 500 }}>{group.createdBy?.name || 'Unknown'}</span>
                    </span>
                </div>

                <div className={`sg-status-badge ${isFull ? 'full' : 'open'}`}>
                    {members.length}/5
                </div>
            </div>

            <div className="sg-members-list">
                <p className="sg-members-label">Team Members</p>
                {members.map(member => (
                    <div key={member._id} className="sg-member-item">
                        <div className="sg-member-info">
                            <div className="sg-member-avatar">
                                {member.name.charAt(0)}
                            </div>
                            <span className={`sg-member-name ${member._id === currentUserId ? 'current' : ''}`}>
                                {member.name} {member._id === currentUserId && '(You)'}
                            </span>
                        </div>
                        {group.createdBy?._id === member._id && (
                            <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>Admin</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="sg-actions">
                <button
                    onClick={() => onLeave(group._id)}
                    className="sg-btn sg-btn-danger"
                >
                    <LogOut size={16} />
                    Leave
                </button>

                <button
                    onClick={() => onChat(group)}
                    className="sg-btn sg-btn-primary"
                    style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                >
                    <MessageSquare size={16} />
                    Chat
                </button>

                <button
                    onClick={() => onInviteMember(group)}
                    disabled={isFull}
                    className="sg-btn sg-btn-primary"
                    style={isFull ? { background: '#1f2937', color: '#6b7280', cursor: 'not-allowed', boxShadow: 'none' } : {}}
                >
                    <UserPlus size={16} />
                    Invite
                </button>
            </div>
        </div>
    );
};

export default StudyGroupCard;
