import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MoreVertical, Phone, Video, Smile, Paperclip, CheckCheck } from 'lucide-react';
import { getGroupMessages, sendGroupMessage } from '../services/studyGroupService';
import { toast } from 'react-toastify';
import "../pages/Community/StudyGroups.css"; // Ensure CSS is loaded

const GroupChatModal = ({ isOpen, onClose, group, currentUser }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Fetch messages when modal opens
    useEffect(() => {
        if (isOpen && group) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 3000); // Faster polling for chat feel
            return () => clearInterval(interval);
        }
    }, [isOpen, group]);

    // Scroll to bottom
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchMessages = async () => {
        try {
            const data = await getGroupMessages(group._id);
            // Ideally compare length or last ID to avoid re-renders if no change
            setMessages(data);
        } catch (err) {
            console.error("Failed to fetch messages", err);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const content = newMessage;
            setNewMessage(''); // optimistic clear

            const tempMessage = {
                _id: Date.now(), // temp id
                content: content,
                sender: { _id: currentUser._id || currentUser.id, name: currentUser.name },
                createdAt: new Date().toISOString(),
                isOptimistic: true
            };
            setMessages(prev => [...prev, tempMessage]);

            await sendGroupMessage(group._id, content);
            fetchMessages(); // Sync real data
        } catch (err) {
            toast.error("Failed to send");
        }
    };

    // Helper for colors
    const getNameColor = (name) => {
        const colors = ['wa-color-1', 'wa-color-2', 'wa-color-3', 'wa-color-4', 'wa-color-5'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    // Helper for Time
    const formatTime = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen || !group) return null;

    // Get group member names string
    const memberNames = group.members?.map(m => m.name?.split(' ')[0]).join(', ');

    return (
        <div className="inv-modal-overlay">
            {/* WA Modal Content Override */}
            <div className="wa-modal-content">

                {/* Header */}
                <div className="wa-header">
                    <div className="wa-header-left">
                        <div className="wa-avatar">
                            <span style={{ color: '#fff', fontSize: '18px' }}>{group.name?.charAt(0)}</span>
                        </div>
                        <div className="wa-header-info">
                            <div className="wa-group-name">{group.name}</div>
                            <div className="wa-group-members">
                                {memberNames}
                            </div>
                        </div>
                    </div>
                    <div className="wa-header-actions">
                        <button className="wa-icon-btn" disabled title="Video Call (Coming Soon)"><Video size={20} /></button>
                        <button className="wa-icon-btn" disabled title="Voice Call (Coming Soon)"><Phone size={20} /></button>
                        <button className="wa-icon-btn"><MoreVertical size={20} /></button>
                        <button className="wa-icon-btn" onClick={onClose}><X size={24} /></button>
                    </div>
                </div>

                {/* Chat Body */}
                <div className="wa-chat-body">
                    {/* Encryption Notice (Fake) */}
                    <div style={{ textAlign: 'center', marginBottom: '1rem', marginTop: '1rem' }}>
                        <span style={{ background: '#182329', color: '#ffcc00', padding: '5px 10px', borderRadius: '8px', fontSize: '12px', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
                            Messages are end-to-end encrypted. No one outside of this group can read them.
                        </span>
                    </div>

                    {messages.map((msg, index) => {
                        const isMe = (msg.sender?._id === (currentUser._id || currentUser.id));
                        return (
                            <div key={msg._id || index} className={`wa-msg-row ${isMe ? 'sent' : 'received'}`}>
                                <div className={`wa-bubble ${isMe ? 'sent' : 'received'}`}>
                                    {/* Sender Name (only if not me) */}
                                    {!isMe && (
                                        <div className={`wa-sender-name ${getNameColor(msg.sender?.name || 'Unknown')}`}>
                                            {msg.sender?.name}
                                        </div>
                                    )}

                                    {/* Message Text */}
                                    {msg.content}

                                    {/* Timestamp */}
                                    <div className="wa-timestamp">
                                        {formatTime(msg.createdAt)}
                                        {/* Blue ticks for me (fake status) */}
                                        {isMe && (
                                            <span style={{ color: '#53bdeb', marginLeft: '4px' }}>
                                                <CheckCheck size={16} />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Footer */}
                <div className="wa-footer">
                    <button className="wa-icon-btn" disabled title="Emojis (Coming Soon)"><Smile size={24} /></button>
                    <button className="wa-icon-btn" disabled title="Attachments (Coming Soon)"><Paperclip size={22} /></button>

                    <form onSubmit={handleSendMessage} className="wa-input-container">
                        <input
                            type="text"
                            className="wa-input"
                            placeholder="Type a message"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                    </form>

                    <button
                        className={`wa-send-btn ${newMessage.trim() ? 'active' : ''}`}
                        onClick={handleSendMessage}
                    >
                        <Send size={20} />
                    </button>

                    {/* If user wanted mic when empty, we could do conditional render */}
                </div>
            </div>
        </div>
    );
};

export default GroupChatModal;
