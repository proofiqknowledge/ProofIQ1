import React, { useState, useEffect } from 'react';
import { Users, Trash2, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { getAllGroupsAdmin, removeMemberAdmin } from '../../services/studyGroupService';
// We might need a generic user search service later for "Add Member"

const AdminStudyGroups = () => {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAllGroupsAdmin();
            setGroups(data);
        } catch (err) {
            toast.error('Failed to fetch groups');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (groupId, userId, userName) => {
        if (!window.confirm(`Remove ${userName} from this group?`)) return;
        try {
            await removeMemberAdmin(groupId, userId);
            toast.success('Member removed');
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.batch?.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Users className="text-blue-400" />
                Study Groups Management
            </h1>

            <div className="bg-[#1e1e1e] rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search groups..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#2a2a2a] text-white pl-10 pr-4 py-2 rounded-lg border border-white/5 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <button onClick={fetchData} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                        Refresh
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono">
                        <thead className="bg-[#2a2a2a] text-gray-400 text-sm uppercase">
                            <tr>
                                <th className="px-6 py-3">Group Name</th>
                                <th className="px-6 py-3">Batch</th>
                                <th className="px-6 py-3">Created By</th>
                                <th className="px-6 py-3">Members (Count)</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center">Loading...</td></tr>
                            ) : filteredGroups.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No groups found.</td></tr>
                            ) : (
                                filteredGroups.map(group => (
                                    <tr key={group._id} className="hover:bg-[#252525]">
                                        <td className="px-6 py-4 font-bold text-white">{group.name}</td>
                                        <td className="px-6 py-4 text-blue-400">{group.batch?.name || 'N/A'}</td>
                                        <td className="px-6 py-4">{group.createdBy?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4">
                                            {group.members.length}/5
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {group.members.map(m => (
                                                    <span
                                                        key={m._id}
                                                        className="bg-gray-800 text-xs px-2 py-0.5 rounded flex items-center gap-1 group/member"
                                                        title={m.email}
                                                    >
                                                        {m.name}
                                                        <button
                                                            onClick={() => handleRemoveMember(group._id, m._id, m.name)}
                                                            className="text-red-500 hover:text-red-400 opacity-0 group-hover/member:opacity-100"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Placeholder for Add Member if needed */}
                                            <span className="text-gray-600 text-xs">Manage via Members col</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminStudyGroups;
