import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Users, Mail, UserPlus, Check, X, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import {
    getStudentsForInvite,
    sendStudyRequest,
    getMyRequests,
    respondToRequest,
    getMyGroups,
    updateGroup,
    leaveGroup
} from '../../services/studyGroupService';
import InviteRequestModal from '../../components/InviteRequestModal';
import StudyGroupCard from '../../components/StudyGroupCard';

import './StudyGroups.css';

const StudyGroupsPage = () => {
    const [activeTab, setActiveTab] = useState('groups');
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [requests, setRequests] = useState([]);
    const [groups, setGroups] = useState([]);

    // Modal State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteTargetUser, setInviteTargetUser] = useState(null);
    const [inviteContextGroupId, setInviteContextGroupId] = useState(null);

    const { user } = useSelector(state => state.auth);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'find') {
                const data = await getStudentsForInvite();
                setStudents(data);
            } else if (activeTab === 'requests') {
                const data = await getMyRequests();
                setRequests(data);
            } else if (activeTab === 'groups') {
                const data = await getMyGroups();
                setGroups(data);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenInvite = (user, groupId = null) => {
        setInviteTargetUser(user);
        setInviteContextGroupId(groupId);
        setIsInviteModalOpen(true);
    };

    const handleSendInvite = async (toUserId, groupId, message) => {
        try {
            // If we clicked "Invite" from a group card, force that group ID
            const targetGroupId = inviteContextGroupId || groupId;
            await sendStudyRequest(toUserId, targetGroupId, message);
            toast.success('Invitation sent successfully!');

            // Refresh list if we are in find tab, though not strictly necessary
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send invite');
        }
    };

    const handleRespond = async (requestId, status) => {
        try {
            await respondToRequest(requestId, status);
            toast.success(`Request ${status}ed`);
            fetchData(); // Refresh requests list
            // If accepted, maybe switch to groups tab?
            if (status === 'accepted') {
                // Optional: setActiveTab('groups');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
    };

    const handleUpdateGroupName = async (groupId, name) => {
        try {
            await updateGroup(groupId, name);
            toast.success('Group updated');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        }
    };

    const handleLeaveGroup = async (groupId) => {
        if (!window.confirm("Are you sure you want to leave this group?")) return;
        try {
            await leaveGroup(groupId);
            toast.success('Left group');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to leave group');
        }
    };

    // Helper to trigger invite FROM a group
    // This opens the modal but needs a user to select. 
    // Wait, the modal is "Invite User X". 
    // If we invite FROM a group, we need to select a student first.
    // Actually, the flow "Invite Member" on card should probably show a list of students to pick from?
    // For now, let's keep it simple: "Find Partners" -> "Invite to Group X" logic in modal.
    // The 'Invite' button on card can just redirect to 'Find Partners' tab?
    // Let's make the "Invite" button on card switch to 'Find Partners' tab.

    const handleInviteFromGroup = (group) => {
        setActiveTab('find');
        toast.info('Select a student to invite to ' + group.name);
    };

    return (
        <div className="study-groups-container">
            {/* Header Section */}
            <div className="sg-header">
                <h1>Combined Study</h1>
                <p>Form study groups, collaborate on complex problems, and accelerate your learning journey with peers from your batch.</p>
            </div>

            {/* Navigation Tabs */}
            <div className="sg-tabs">
                {[
                    { id: 'groups', label: 'My Groups', icon: Users },
                    { id: 'requests', label: 'Requests', icon: Mail, count: requests.length },
                    { id: 'find', label: 'Find Partners', icon: UserPlus },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`sg-tab-button ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="sg-badge">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex-center" style={{ padding: '5rem 0' }}>
                    <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                </div>
            ) : (
                <div className="animate-in">

                    {/* GROUPS TAB */}
                    {activeTab === 'groups' && (
                        <div className="sg-grid">
                            {groups.length === 0 ? (
                                <div className="sg-empty-state">
                                    <div className="sg-empty-icon">
                                        <Users size={40} />
                                    </div>
                                    <h3 className="sg-empty-title">No Active Groups</h3>
                                    <p className="sg-empty-text">
                                        You haven't joined any groups yet. Find partners to start your collaborative learning journey.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('find')}
                                        className="sg-button-primary"
                                    >
                                        <UserPlus size={18} />
                                        Find Partners
                                    </button>
                                </div>
                            ) : (
                                groups.map(group => (
                                    <StudyGroupCard
                                        key={group._id}
                                        group={group}
                                        currentUser={user}
                                        currentUserId={user?._id}
                                        onUpdateName={handleUpdateGroupName}
                                        onLeave={handleLeaveGroup}
                                        onInviteMember={handleInviteFromGroup}
                                    />
                                ))
                            )}
                        </div>
                    )}

                    {/* REQUESTS TAB */}
                    {activeTab === 'requests' && (
                        <div className="sg-grid">
                            {requests.length === 0 ? (
                                <div className="sg-empty-state" style={{ background: 'transparent', border: 'none' }}>
                                    <Mail className="sg-empty-icon" style={{ background: 'transparent' }} size={48} />
                                    <p className="sg-empty-text">No pending requests at the moment.</p>
                                </div>
                            ) : (
                                requests.map(req => (
                                    <div key={req._id} className="sg-req-card">
                                        <div className="sg-req-header">
                                            <div className="sg-req-user">
                                                <div className="sg-member-avatar">
                                                    {req.fromUser?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p style={{ color: 'white', fontWeight: 'bold' }}>{req.fromUser?.name}</p>
                                                    <p style={{ color: '#60a5fa', fontSize: '0.75rem' }}>Invitation Request</p>
                                                </div>
                                            </div>
                                            <span className="sg-req-status">
                                                {req.status}
                                            </span>
                                        </div>

                                        {req.groupId && (
                                            <div style={{ background: '#111', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <p style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Invited to Group</p>
                                                <p style={{ color: 'white', fontWeight: 'bold' }}>
                                                    {req.groupId.name}
                                                </p>
                                            </div>
                                        )}

                                        {req.message && (
                                            <div className="sg-req-message">
                                                "{req.message}"
                                            </div>
                                        )}

                                        <div className="sg-req-actions">
                                            <button
                                                onClick={() => handleRespond(req._id, 'accepted')}
                                                className="sg-btn sg-btn-accept"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleRespond(req._id, 'rejected')}
                                                className="sg-btn sg-btn-reject"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* FIND PARTNERS TAB */}
                    {activeTab === 'find' && (
                        <div className="sg-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                            {students.length === 0 ? (
                                <div className="sg-empty-state" style={{ background: 'transparent', border: 'none' }}>
                                    <p className="sg-empty-text">No other students found in your batch.</p>
                                </div>
                            ) : (
                                students.map(student => (
                                    <div key={student._id} className="sg-user-item">
                                        <div className="sg-user-info">
                                            <div className="sg-member-avatar">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p style={{ color: 'white', fontWeight: '500' }}>{student.name}</p>
                                                <span style={{ fontSize: '0.75rem', color: '#9ca3af', background: 'rgba(255,255,255,0.05)', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>Student</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleOpenInvite(student)}
                                            className="sg-icon-btn"
                                            title="Invite to Study Group"
                                        >
                                            <UserPlus size={20} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                </div>
            )}

            {/* Invite Modal */}
            <InviteRequestModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                toUser={inviteTargetUser}
                existingGroups={groups}
                onSendInvite={handleSendInvite}
            />
        </div>
    );
};

export default StudyGroupsPage;
