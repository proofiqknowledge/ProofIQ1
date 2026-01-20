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
        <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-950 text-gray-100">
            {/* Header Section */}
            <div className="mb-10 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -z-10"></div>
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-3">
                    Combined Study
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl">
                    Form study groups, collaborate on complex problems, and accelerate your learning journey with peers from your batch.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mb-8 bg-[#1e1e1e] p-1.5 rounded-xl w-fit border border-white/5">
                {[
                    { id: 'groups', label: 'My Groups', icon: Users },
                    { id: 'requests', label: 'Requests', icon: Mail, count: requests.length },
                    { id: 'find', label: 'Find Partners', icon: UserPlus },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all font-medium text-sm ${activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
                    <p className="text-gray-500 animate-pulse">Loading community data...</p>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* GROUPS TAB */}
                    {activeTab === 'groups' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {groups.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-24 bg-[#111111] rounded-2xl border border-white/5 border-dashed">
                                    <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-6">
                                        <Users className="text-gray-600" size={40} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">No Active Groups</h3>
                                    <p className="text-gray-400 mb-8 max-w-md text-center">
                                        You haven't joined any groups yet. Find partners to start your collaborative learning journey.
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('find')}
                                        className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2"
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {requests.length === 0 ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-20">
                                    <Mail className="text-gray-700 mb-4" size={48} />
                                    <p className="text-gray-500 text-lg">No pending requests at the moment.</p>
                                </div>
                            ) : (
                                requests.map(req => (
                                    <div key={req._id} className="bg-[#1e1e1e] border border-white/10 p-6 rounded-2xl shadow-xl hover:border-blue-500/30 transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                    {req.fromUser?.name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{req.fromUser?.name}</p>
                                                    <p className="text-blue-400 text-xs font-medium">Invitation Request</p>
                                                </div>
                                            </div>
                                            <span className="text-xs bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/20 uppercase tracking-wide font-bold">
                                                {req.status}
                                            </span>
                                        </div>

                                        {req.groupId && (
                                            <div className="bg-[#111] p-4 rounded-xl mb-4 border border-white/5">
                                                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Invited to Group</p>
                                                <p className="text-white font-semibold flex items-center gap-2">
                                                    <Users size={14} className="text-blue-500" />
                                                    {req.groupId.name}
                                                </p>
                                            </div>
                                        )}

                                        {req.message && (
                                            <div className="bg-gray-800/30 p-4 rounded-xl mb-6 italic text-gray-300 text-sm relative">
                                                <span className="absolute -top-2 -left-1 text-4xl text-gray-700 font-serif leading-none">"</span>
                                                {req.message}
                                                <span className="absolute -bottom-4 -right-1 text-4xl text-gray-700 font-serif leading-none">"</span>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            <button
                                                onClick={() => handleRespond(req._id, 'accepted')}
                                                className="bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-900/20"
                                            >
                                                Accept
                                            </button>
                                            <button
                                                onClick={() => handleRespond(req._id, 'rejected')}
                                                className="bg-[#2a2a2a] hover:bg-[#333] text-gray-300 hover:text-white py-2.5 rounded-xl text-sm font-bold transition-all border border-white/5"
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
                        <div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {students.length === 0 ? (
                                    <div className="col-span-full py-20 text-center">
                                        <p className="text-gray-500 text-lg">No other students found in your batch.</p>
                                        <p className="text-gray-600 text-sm mt-2">Invite your batchmates to join the platform!</p>
                                    </div>
                                ) : (
                                    students.map(student => (
                                        <div key={student._id} className="bg-[#1e1e1e] border border-white/10 p-5 rounded-2xl flex items-center justify-between group hover:border-blue-500/50 hover:bg-[#252525] transition-all duration-300">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 p-[2px]">
                                                    <div className="w-full h-full rounded-full bg-[#1e1e1e] flex items-center justify-center">
                                                        <span className="text-white font-bold text-lg bg-gradient-to-tr from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                                            {student.name.charAt(0)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-base group-hover:text-blue-400 transition-colors">{student.name}</p>
                                                    <p className="text-xs text-gray-500 font-medium bg-gray-800/50 px-2 py-0.5 rounded w-fit mt-1">Student</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleOpenInvite(student)}
                                                className="p-2.5 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110 active:scale-95 shadow-lg shadow-blue-900/10"
                                                title="Invite to Study Group"
                                            >
                                                <UserPlus size={20} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
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
