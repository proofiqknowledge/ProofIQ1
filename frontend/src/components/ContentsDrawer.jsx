import React from "react";
import { FaChevronDown, FaPlay, FaCheckCircle, FaLock } from "react-icons/fa";

export default function ContentsDrawer({ 
    isOpen, 
    onClose, 
    courseData, 
    studentProgress, 
    currentWeekNumber, 
    currentDayNumber,
    onTopicClick 
}) {
    const [expandedModules, setExpandedModules] = React.useState({});

    // Toggle module expansion
    const toggleModule = (moduleIndex) => {
        setExpandedModules(prev => ({
            ...prev,
            [moduleIndex]: !prev[moduleIndex]
        }));
    };

    // Determine topic status using robust progress shapes and dynamic indexing
    const getTopicStatus = (weekIdx, dayIdx) => {
        // Compute linear index of this topic based on actual courseData week/day lengths
        let linearIndex = 0;
        if (courseData && Array.isArray(courseData.weeks)) {
            for (let i = 0; i < weekIdx; i++) {
                linearIndex += (courseData.weeks[i]?.days?.length || 0);
            }
        } else {
            // Fallback: assume 5 topics per week (legacy)
            linearIndex = weekIdx * 5;
        }
        linearIndex += dayIdx;

        // Derive completed count from possible shapes of studentProgress
        let completedCount = 0;
        if (studentProgress == null) {
            completedCount = 0;
        } else if (typeof studentProgress === 'number') {
            completedCount = studentProgress;
        } else if (typeof studentProgress.progress === 'number') {
            // legacy: studentProgress.progress may be a number
            completedCount = studentProgress.progress;
        } else if (studentProgress.progress && typeof studentProgress.progress.completedTopics === 'number') {
            completedCount = studentProgress.progress.completedTopics;
        } else if (typeof studentProgress.completedTopics === 'number') {
            completedCount = studentProgress.completedTopics;
        } else if (typeof studentProgress.watchedCount === 'number') {
            // some endpoints return watchedCount
            completedCount = studentProgress.watchedCount;
        } else {
            completedCount = 0;
        }

        if (linearIndex < completedCount) return 'completed';
        if (linearIndex === completedCount) return 'current';
        return 'locked';
    };

    return (
        <>
            {/* Overlay - click to close */}
            {isOpen && (
                <div
                    onClick={onClose}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 999,
                        animation: 'fadeIn 0.3s ease'
                    }}
                />
            )}

            {/* Drawer Container - slides from right */}
            <div
                style={{
                    position: 'fixed',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '360px',
                    backgroundColor: '#ffffff',
                    boxShadow: isOpen ? '-2px 0 12px rgba(0, 0, 0, 0.15)' : 'none',
                    zIndex: 1000,
                    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    '@media (max-width: 768px)': {
                        width: '85vw'
                    }
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        flexShrink: 0
                    }}
                >
                    <h2 style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1e293b'
                    }}>
                        📚 Contents
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            color: '#64748b',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        title="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Scrollable Content */}
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '0'
                    }}
                >
                    {courseData?.weeks && courseData.weeks.length > 0 ? (
                        courseData.weeks.map((week, weekIdx) => {
                            const isExpanded = expandedModules[weekIdx] !== false;
                            const isCurrentModule = Number(currentWeekNumber) === weekIdx + 1;

                            return (
                                <div key={weekIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    {/* Module Header */}
                                    <button
                                        onClick={() => toggleModule(weekIdx)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            backgroundColor: isCurrentModule ? '#eff6ff' : '#ffffff',
                                            border: 'none',
                                            borderLeft: isCurrentModule ? '4px solid #2563eb' : '4px solid transparent',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            transition: 'background-color 0.2s',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            color: '#1e293b'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isCurrentModule) {
                                                e.target.style.backgroundColor = '#f1f5f9';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isCurrentModule) {
                                                e.target.style.backgroundColor = '#ffffff';
                                            }
                                        }}
                                    >
                                        <FaChevronDown
                                            style={{
                                                fontSize: '12px',
                                                color: '#64748b',
                                                transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                                transition: 'transform 0.2s'
                                            }}
                                        />
                                        <span>Module {weekIdx + 1}</span>
                                    </button>

                                    {/* Topics List */}
                                    {isExpanded && week?.days && (
                                        <div style={{ backgroundColor: '#ffffff' }}>
                                            {week.days.map((day, dayIdx) => {
                                                const status = getTopicStatus(weekIdx, dayIdx);
                                                const isCurrentTopic = Number(currentWeekNumber) === weekIdx + 1 && Number(currentDayNumber) === dayIdx + 1;
                                                const topicTitle = day?.customName || day?.title || `Topic ${dayIdx + 1}`;

                                                let statusIcon, statusColor, bgColor;
                                                switch (status) {
                                                    case 'completed':
                                                        statusIcon = <FaCheckCircle style={{ color: '#22c55e', fontSize: '14px' }} />;
                                                        statusColor = '#15803d';
                                                        bgColor = '#ffffff';
                                                        break;
                                                    case 'current':
                                                        statusIcon = <FaPlay style={{ color: '#f59e0b', fontSize: '12px' }} />;
                                                        statusColor = '#92400e';
                                                        bgColor = '#fef3c7';
                                                        break;
                                                    case 'locked':
                                                    default:
                                                        statusIcon = <FaLock style={{ color: '#cbd5e1', fontSize: '12px' }} />;
                                                        statusColor = '#94a3b8';
                                                        bgColor = '#ffffff';
                                                }

                                                return (
                                                    <button
                                                        key={dayIdx}
                                                        onClick={() => onTopicClick(weekIdx + 1, dayIdx + 1)}
                                                        disabled={status === 'locked'}
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 16px 10px 40px',
                                                            backgroundColor: isCurrentTopic ? '#fef3c7' : bgColor,
                                                            border: 'none',
                                                            borderLeft: isCurrentTopic ? '3px solid #f59e0b' : '3px solid transparent',
                                                            cursor: status === 'locked' ? 'not-allowed' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            transition: 'background-color 0.2s',
                                                            fontSize: '13px',
                                                            fontWeight: status === 'current' ? '600' : '500',
                                                            color: statusColor,
                                                            opacity: status === 'locked' ? 0.7 : 1,
                                                            position: 'relative'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (status !== 'locked' && !isCurrentTopic) {
                                                                e.target.style.backgroundColor = '#f8fafc';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (status !== 'locked' && !isCurrentTopic) {
                                                                e.target.style.backgroundColor = bgColor;
                                                            }
                                                        }}
                                                    >
                                                        <span style={{ position: 'absolute', left: '16px' }}>
                                                            {statusIcon}
                                                        </span>
                                                        <span style={{ textAlign: 'left' }}>
                                                            {topicTitle}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Module Exam */}
                                    {isExpanded && week?.exam && (
                                        <div
                                            style={{
                                                padding: '10px 16px 10px 40px',
                                                backgroundColor: '#f3e8ff',
                                                borderTop: '1px solid #e9d5ff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                color: '#6b21a8'
                                            }}
                                        >
                                            <span>📝</span>
                                            <span>{week?.exam?.title || 'Module Exam'}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div style={{
                            padding: '24px 16px',
                            textAlign: 'center',
                            color: '#94a3b8',
                            fontSize: '14px'
                        }}>
                            No content available
                        </div>
                    )}
                </div>
            </div>

            {/* Global Animations */}
            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes slideInLeft {
                    from {
                        transform: translateX(-100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }

                @media (max-width: 768px) {
                    div[style*="width: '360px'"] {
                        width: 85vw;
                    }
                }
            `}</style>
        </>
    );
}
