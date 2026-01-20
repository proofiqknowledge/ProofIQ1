import React, { useState } from 'react';
import { Users, Edit2, LogOut, UserPlus, Check, X } from 'lucide-react';

const StudyGroupCard = ({ group, currentUserId, onUpdateName, onLeave, onInviteMember }) => {
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
        <div className="bg-[#1e1e1e]/80 border border-white/10 rounded-2xl p-6 hover:border-blue-500/30 hover:bg-[#252525] transition-all group shadow-xl backdrop-blur-sm">
            <div className="flex justify-between items-start mb-6">
                <div className="flex-1 mr-4">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="bg-[#2a2a2a] text-white px-3 py-1.5 rounded-lg border border-blue-500/50 outline-none w-full text-lg font-bold"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                            />
                            <button
                                onClick={handleUpdate}
                                className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                            >
                                <Check size={18} />
                            </button>
                            <button
                                onClick={() => { setIsEditing(false); setNewName(group.name); }}
                                className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 group/edit">
                            <h3 className="text-xl font-bold text-white truncate group-hover/edit:text-blue-400 transition-colors">{group.name}</h3>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-gray-500 hover:text-blue-400 opacity-0 group-hover/edit:opacity-100 transition-all transform hover:scale-110"
                            >
                                <Edit2 size={16} />
                            </button>
                        </div>
                    )}
                    <p className="text-gray-400 text-xs mt-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Created by <span className="text-gray-300 font-medium">{group.createdBy?.name || 'Unknown'}</span>
                    </p>
                </div>

                <div className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${isFull
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                    {members.length}/5
                </div>
            </div>

            <div className="space-y-3 mb-6">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3 pl-1">Team Members</p>
                {members.map(member => (
                    <div key={member._id} className="flex items-center justify-between text-sm bg-[#111] p-2.5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-900/20">
                                {member.name.charAt(0)}
                            </div>
                            <span className={member._id === currentUserId ? 'text-blue-400 font-bold' : 'text-gray-300 font-medium'}>
                                {member.name} {member._id === currentUserId && '(You)'}
                            </span>
                        </div>
                        {group.createdBy?._id === member._id && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">Admin</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                <button
                    onClick={() => onLeave(group._id)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/5 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all text-sm font-medium border border-transparent hover:border-red-500/20"
                >
                    <LogOut size={16} />
                    Leave
                </button>

                <button
                    onClick={() => onInviteMember(group)}
                    disabled={isFull}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all text-sm font-bold shadow-lg ${isFull
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed shadow-none'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 hover:shadow-blue-900/40'
                        }`}
                >
                    <UserPlus size={16} />
                    Invite
                </button>
            </div>
        </div>
    );
};

export default StudyGroupCard;
