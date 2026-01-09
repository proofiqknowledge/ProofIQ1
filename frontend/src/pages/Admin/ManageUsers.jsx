import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
    FaSearch,
    FaEdit,
    FaBan,
    FaCheck,
    FaSpinner,
    FaUserShield,
    FaUserGraduate,
    FaChalkboardTeacher,
    FaTimes,
    FaFilter,
    FaEllipsisV,
    FaTrash
} from 'react-icons/fa';
import {
    getAllUsers,
    updateUser,
    blockUser,
    unblockUser
} from '../../services/userService';
import {
    COLORS,
    FONT_SIZES,
    SPACING,
    SHADOWS,
    BORDER_RADIUS,
    TRANSITIONS
} from '../../constants/designSystem';

// --- PREMIUM STYLES & ANIMATIONS ---
const PREMIUM_STYLES = {
    pageBackground: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F6F8FD 0%, #F1F4F9 100%)',
        padding: SPACING.xl,
        fontFamily: "'Inter', sans-serif", // Assuming Inter or system font
    },
    glassCard: {
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
    },
    floatingBar: {
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        borderRadius: '100px',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        alignItems: 'center',
        padding: '8px 24px',
        transition: 'all 0.3s ease',
    },
    userCard: {
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        border: '1px solid rgba(0,0,0,0.03)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
    },
    userCardHover: {
        transform: 'translateY(-4px) scale(1.005)',
        boxShadow: '0 12px 24px rgba(0,0,0,0.06)',
        borderColor: 'rgba(0,0,0,0.06)',
    },
    avatarRing: (role) => {
        const colors = {
            Admin: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            Trainer: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
            Student: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
            Master: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', // Master looks like Admin
        };
        return {
            background: colors[role] || colors.Student,
            padding: '3px',
            borderRadius: '50%',
            display: 'inline-block',
        };
    },
    badge: (type, status) => {
        const styles = {
            role: {
                Admin: { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' },
                Trainer: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
                Student: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
                Master: { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' }, // Master looks like Admin
            },
            status: {
                active: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', dot: '#10B981' },
                blocked: { bg: 'rgba(239, 68, 68, 0.1)', text: '#DC2626', dot: '#EF4444' },
            }
        };

        if (type === 'role') {
            const style = styles.role[status] || styles.role.Student;
            return {
                background: style.bg,
                color: style.text,
                border: `1px solid ${style.border}`,
                padding: '4px 12px',
                borderRadius: '100px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
            };
        }

        const style = styles.status[status ? 'blocked' : 'active'];
        return {
            background: style.bg,
            color: style.text,
            padding: '4px 12px',
            borderRadius: '100px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
        };
    },
    actionBtn: (color) => ({
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: color === 'edit' ? '#EFF6FF' : color === 'delete' ? '#FEF2F2' : '#F3F4F6',
        color: color === 'edit' ? '#3B82F6' : color === 'delete' ? '#EF4444' : '#4B5563',
    }),
};

export default function ManageUsers() {
    const { token, user: currentUser } = useSelector((state) => state.auth);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('All');
    const [hoveredRow, setHoveredRow] = useState(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        role: '',
        employeeId: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await getAllUsers();
            setUsers(data);
        } catch (err) {
            console.error('Error fetching users:', err);
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => setSearchTerm(e.target.value);
    const handleRoleFilter = (role) => setFilterRole(role);

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.employeeId && user.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRole = filterRole === 'All' || user.role === filterRole;

        return matchesSearch && matchesRole;
    });

    const handleBlockToggle = async (user) => {
        // Prevent blocking admin accounts (unless Master)
        if (!user.isBlocked && user.role === 'Admin' && currentUser.role !== 'Master') {
            toast.error('Admin accounts cannot be blocked (Master privileges required)');
            return;
        }

        const action = user.isBlocked ? 'unblock' : 'block';
        if (!window.confirm(`Are you sure you want to ${action} ${user.name}?`)) return;

        try {
            if (user.isBlocked) {
                await unblockUser(user._id);
                toast.success(`User ${user.name} unblocked successfully`);
            } else {
                await blockUser(user._id);
                toast.success(`User ${user.name} blocked successfully`);
            }
            fetchUsers();
        } catch (err) {
            console.error(`Error ${action}ing user:`, err);
            toast.error(`Failed to ${action} user`);
        }
    };

    const openEditModal = (user) => {
        // Prevent editing other admin accounts (unless Master)
        const isSelf = user._id === currentUser?._id;
        const isMaster = currentUser?.role === 'Master';

        if (user.role === 'Admin' && !isSelf && !isMaster) {
            toast.error('Cannot edit other admin accounts');
            return;
        }

        setEditingUser(user);
        setEditForm({
            name: user.name,
            email: user.email,
            role: user.role,
            employeeId: user.employeeId || ''
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await updateUser(editingUser._id, editForm);
            toast.success('User updated successfully');
            setShowEditModal(false);
            fetchUsers();
        } catch (err) {
            console.error('Error updating user:', err);
            toast.error('Failed to update user');
        } finally {
            setSaving(false);
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'Admin': return <FaUserShield />;
            case 'Trainer': return <FaChalkboardTeacher />;
            case 'Student': return <FaUserGraduate />;
            default: return null;
        }
    };

    return (
        <div style={PREMIUM_STYLES.pageBackground}>
            {/* --- Header Section --- */}
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                    <div>
                        <h1 style={{
                            fontSize: '36px',
                            fontWeight: '800',
                            color: '#111827',
                            letterSpacing: '-0.03em',
                            marginBottom: '8px'
                        }}>
                            Manage Users
                        </h1>
                        <p style={{ color: '#6B7280', fontSize: '16px' }}>
                            View, edit, and manage all users in your organization
                        </p>
                    </div>
                    <div style={{
                        background: '#FFFFFF',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                        color: '#6B7280',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}>
                        Total Users: <span style={{ color: '#111827', fontWeight: 800 }}>{users.length}</span>
                    </div>
                </div>

                {/* --- Controls Bar --- */}
                <div style={{
                    ...PREMIUM_STYLES.floatingBar,
                    marginBottom: '32px',
                    justifyContent: 'space-between'
                }}>
                    {/* Search */}
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '12px' }}>
                        <FaSearch color="#9CA3AF" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email, or ID..."
                            value={searchTerm}
                            onChange={handleSearch}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                fontSize: '16px',
                                width: '100%',
                                outline: 'none',
                                color: '#1F2937',
                                fontWeight: 500
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    background: '#F3F4F6',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#6B7280'
                                }}
                            >
                                <FaTimes size={12} />
                            </button>
                        )}
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '24px', background: '#E5E7EB', margin: '0 24px' }} />

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['All', 'Admin', 'Trainer', 'Student'].map(role => (
                            <button
                                key={role}
                                onClick={() => handleRoleFilter(role)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '100px',
                                    border: 'none',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    background: filterRole === role ? '#111827' : 'transparent',
                                    color: filterRole === role ? '#FFFFFF' : '#6B7280',
                                }}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- User List --- */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px' }}>
                        <FaSpinner className="spin" size={40} color="#3B82F6" />
                        <p style={{ marginTop: '16px', color: '#6B7280', fontWeight: 500 }}>Loading users...</p>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                        <div style={{ background: '#F3F4F6', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <FaSearch size={32} color="#9CA3AF" />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>No users found</h3>
                        <p style={{ color: '#6B7280' }}>Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {filteredUsers.map((user) => (
                            <div
                                key={user._id}
                                style={{
                                    ...PREMIUM_STYLES.userCard,
                                    ...(hoveredRow === user._id ? PREMIUM_STYLES.userCardHover : {}),
                                    opacity: user.isBlocked ? 0.7 : 1,
                                }}
                                onMouseEnter={() => setHoveredRow(user._id)}
                                onMouseLeave={() => setHoveredRow(null)}
                            >
                                {/* Left: Avatar & Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                                    <div style={PREMIUM_STYLES.avatarRing(user.role)}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            background: '#FFFFFF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '18px',
                                            fontWeight: 800,
                                            color: '#1F2937',
                                            border: '2px solid #fff'
                                        }}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                                            {user.name}
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                            <span style={{ fontSize: '14px', color: '#6B7280' }}>{user.email}</span>
                                            {user.employeeId && (
                                                <>
                                                    <span style={{ color: '#D1D5DB' }}>•</span>
                                                    <span style={{ fontSize: '12px', background: '#F3F4F6', padding: '2px 8px', borderRadius: '4px', color: '#4B5563', fontFamily: 'monospace' }}>
                                                        {user.employeeId}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Middle: Badges */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '40px' }}>
                                    <div style={PREMIUM_STYLES.badge('role', user.role)}>
                                        {getRoleIcon(user.role)}
                                        {user.role}
                                    </div>
                                    <div style={PREMIUM_STYLES.badge('status', user.isBlocked)}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: user.isBlocked ? '#EF4444' : '#10B981', boxShadow: `0 0 8px ${user.isBlocked ? '#EF4444' : '#10B981'}` }} />
                                        {user.isBlocked ? 'Blocked' : 'Active'}
                                    </div>
                                </div>

                                {/* Right: Actions */}
                                <div style={{ display: 'flex', gap: '8px', opacity: hoveredRow === user._id ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                                    <button
                                        onClick={() => openEditModal(user)}
                                        disabled={user.role === 'Admin' && user._id !== currentUser?._id && currentUser?.role !== 'Master'}
                                        style={{
                                            ...PREMIUM_STYLES.actionBtn('edit'),
                                            opacity: user.role === 'Admin' && user._id !== currentUser?._id && currentUser?.role !== 'Master' ? 0.4 : 1,
                                            cursor: user.role === 'Admin' && user._id !== currentUser?._id && currentUser?.role !== 'Master' ? 'not-allowed' : 'pointer'
                                        }}
                                        title={user.role === 'Admin' && user._id !== currentUser?._id && currentUser?.role !== 'Master' ? 'Cannot edit other admin accounts' : 'Edit User'}
                                    >
                                        <FaEdit size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleBlockToggle(user)}
                                        disabled={!user.isBlocked && user.role === 'Admin' && currentUser?.role !== 'Master'}
                                        style={{
                                            ...PREMIUM_STYLES.actionBtn(user.isBlocked ? 'success' : 'delete'),
                                            opacity: !user.isBlocked && user.role === 'Admin' && currentUser?.role !== 'Master' ? 0.4 : 1,
                                            cursor: !user.isBlocked && user.role === 'Admin' && currentUser?.role !== 'Master' ? 'not-allowed' : 'pointer'
                                        }}
                                        title={!user.isBlocked && user.role === 'Admin' && currentUser?.role !== 'Master' ? 'Cannot block admin accounts' : (user.isBlocked ? 'Unblock User' : 'Block User')}
                                    >
                                        {user.isBlocked ? <FaCheck size={14} /> : <FaBan size={14} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- Edit Modal (Slide-over style) --- */}
            {showEditModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    justifyContent: 'flex-end',
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '450px',
                        background: '#FFFFFF',
                        height: '100%',
                        boxShadow: '-10px 0 40px rgba(0,0,0,0.1)',
                        padding: '32px',
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>Edit User</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                style={{ background: '#F3F4F6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <FaTimes color="#4B5563" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                            {/* Fake hidden inputs to trick Chrome's autofill heuristics */}
                            <input type="text" style={{ display: 'none' }} />
                            <input type="password" style={{ display: 'none' }} />

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '16px', outline: 'none', transition: 'border 0.2s' }}
                                    required
                                    autoComplete="off"
                                    name="edit_user_name_random"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Email Address</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '16px', outline: 'none' }}
                                    required
                                    autoComplete="off"
                                    name="edit_user_email_random"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Role</label>
                                <select
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '16px', outline: 'none', cursor: 'pointer' }}
                                    autoComplete="off"
                                    name="edit_user_role_random"
                                >
                                    <option value="Student">Student</option>
                                    <option value="Trainer">Trainer</option>
                                    {currentUser.role === 'Master' && <option value="Admin">Admin</option>}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#374151' }}>Employee ID</label>
                                <input
                                    type="text"
                                    value={editForm.employeeId}
                                    onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '16px', outline: 'none' }}
                                    autoComplete="off"
                                    name="edit_user_employee_id_random"
                                />
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', gap: '12px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #E5E7EB', background: '#FFFFFF', fontWeight: 600, cursor: 'pointer', color: '#374151' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#111827', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style>
                {`
                    @keyframes slideIn {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                    .spin {
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
}
