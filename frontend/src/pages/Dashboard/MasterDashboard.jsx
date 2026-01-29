import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    FaUserShield,
    FaUsers,
    FaChalkboardTeacher,
    FaUserGraduate,
    FaCrown,
    FaSignOutAlt,
    FaChartLine,
    FaCog,
    FaServer,
    FaShieldAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../services/api';

// --- PREMIUM MASTER THEME ---
const MASTER_THEME = {
    background: '#0a0a0a', // Deep black
    surface: '#121212', // Slightly lighter black
    primary: '#D4AF37', // Gold
    primaryHover: '#C5A028',
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    border: '#2a2a2a',
    gradient: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
    goldGradient: 'linear-gradient(135deg, #D4AF37 0%, #F2D06B 100%)',
    cardShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
};

export default function MasterDashboard() {
    const navigate = useNavigate();
    const { user, token } = useSelector((state) => state.auth);
    const [stats, setStats] = useState({
        totalUsers: 0,
        admins: 0,
        trainers: 0,
        students: 0,
        courses: 0,
        serverStatus: 'Online'
    });
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            // Reusing existing admin endpoints since Master has Admin access
            const [usersRes, coursesRes] = await Promise.all([
                api.get('/users'),
                api.get('/courses')
            ]);

            const users = usersRes.data || [];
            const courses = coursesRes.data || [];

            setStats({
                totalUsers: users.length,
                admins: users.filter(u => u.role === 'Admin').length,
                trainers: users.filter(u => u.role === 'Trainer').length,
                students: users.filter(u => u.role === 'Student').length,
                courses: courses.length,
                serverStatus: 'Online'
            });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            toast.error('Failed to load system stats');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user?.role !== 'Master') {
            navigate('/login');
            return;
        }
        fetchStats();
    }, [user, navigate, fetchStats]);

    // --- SUB-COMPONENTS ---

    const StatsCard = ({ title, value, icon: Icon, color }) => (
        <div style={{
            background: MASTER_THEME.surface,
            borderRadius: '24px',
            padding: '24px',
            border: `1px solid ${MASTER_THEME.border}`,
            boxShadow: MASTER_THEME.cardShadow,
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            transition: 'transform 0.3s ease',
            cursor: 'default',
        }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `rgba(${color}, 0.1)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: `rgb(${color})`,
            }}>
                <Icon />
            </div>
            <div>
                <h3 style={{ margin: 0, fontSize: '14px', color: MASTER_THEME.textSecondary, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {title}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '32px', fontWeight: '800', color: MASTER_THEME.textPrimary }}>
                    {value}
                </p>
            </div>
        </div>
    );

    const ActionButton = ({ label, icon: Icon, onClick, primary }) => (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                padding: '20px',
                background: primary ? MASTER_THEME.goldGradient : MASTER_THEME.surface,
                border: primary ? 'none' : `1px solid ${MASTER_THEME.border}`,
                borderRadius: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.3s ease',
                color: primary ? '#000' : MASTER_THEME.textPrimary,
                boxShadow: primary ? '0 10px 20px rgba(212, 175, 55, 0.2)' : 'none',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                if (!primary) e.currentTarget.style.borderColor = MASTER_THEME.primary;
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                if (!primary) e.currentTarget.style.borderColor = MASTER_THEME.border;
            }}
        >
            <div style={{ fontSize: '24px' }}><Icon /></div>
            <span style={{ fontWeight: '600' }}>{label}</span>
        </button>
    );

    if (loading) return (
        <div style={{ minHeight: '100vh', background: MASTER_THEME.background, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: `3px solid ${MASTER_THEME.primary}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: MASTER_THEME.background,
            color: MASTER_THEME.textPrimary,
            fontFamily: "'Inter', sans-serif",
            padding: '40px',
        }}>
            {/* --- HEADER --- */}
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '60px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        background: MASTER_THEME.goldGradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)',
                    }}>
                        <FaCrown size={32} color="#000" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '800', background: MASTER_THEME.goldGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Master Console
                        </h1>
                        <p style={{ margin: '4px 0 0 0', color: MASTER_THEME.textSecondary }}>System Superior Access</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{
                        padding: '8px 16px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#10B981',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                        System Active
                    </div>
                </div>
            </header>

            {/* --- STATS GRID --- */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '24px',
                marginBottom: '60px',
            }}>
                <StatsCard title="Total Users" value={stats.totalUsers} icon={FaUsers} color="255, 255, 255" />
                <StatsCard title="Admins" value={stats.admins} icon={FaUserShield} color="212, 175, 55" />
                <StatsCard title="Trainers" value={stats.trainers} icon={FaChalkboardTeacher} color="59, 130, 246" />
                <StatsCard title="Students" value={stats.students} icon={FaUserGraduate} color="16, 185, 129" />
            </div>

            {/* --- ACTIONS GRID --- */}
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: MASTER_THEME.textSecondary, marginBottom: '24px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Quick Actions
            </h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
            }}>
                <ActionButton
                    label="Manage All Users"
                    icon={FaUsers}
                    onClick={() => navigate('/admin/manage-users')}
                    primary
                />
                <ActionButton
                    label="Manage Courses"
                    icon={FaCog}
                    onClick={() => navigate('/admin/courses')}
                />
                <ActionButton
                    label="System Analytics"
                    icon={FaChartLine}
                    onClick={() => toast.info('System Analytics coming soon')}
                />
                <ActionButton
                    label="Security Logs"
                    icon={FaShieldAlt}
                    onClick={() => toast.info('Security Logs coming soon')}
                />
            </div>

            {/* --- DECORATIVE BACKGROUND ELEMENTS --- */}
            <div style={{
                position: 'fixed',
                top: '-20%',
                right: '-10%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 70%)',
                pointerEvents: 'none',
                zIndex: 0,
            }} />
        </div>
    );
}
