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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1e1e1e] rounded-xl border border-white/10 w-full max-w-md shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-1">
                    Invite {toUser?.name}
                </h2>
                <p className="text-gray-400 text-sm mb-6">
                    Send a request to start a study group or add them to an existing one.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Group Selection (Optional) */}
                    {existingGroups && existingGroups.length > 0 && (
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Add to specific group (Optional)</label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                                className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
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
                        <label className="block text-sm text-gray-400 mb-1">Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none"
                            placeholder="Write a message..."
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white mr-2 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
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
