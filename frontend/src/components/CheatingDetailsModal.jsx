


import React from 'react';
import { FaExclamationTriangle, FaTimes, FaHistory, FaClone, FaExpand, FaDesktop, FaMousePointer } from 'react-icons/fa';

const CheatingDetailsModal = ({ isOpen, onClose, candidate }) => {
    if (!isOpen || !candidate) return null;

    // Icons for known violation types
    const getIcon = (type) => {
        const t = (type || '').toLowerCase();
        if (t.includes('copy') || t.includes('paste')) return <FaClone color="#f59e0b" />;
        if (t.includes('full') || t.includes('screen')) return <FaExpand color="#ef4444" />;
        if (t.includes('focus') || t.includes('blur')) return <FaMousePointer color="#3b82f6" />;
        if (t.includes('tab')) return <FaDesktop color="#8b5cf6" />;
        return <FaExclamationTriangle color="#ef4444" />;
    };

    const logs = candidate.cheatingLogs || [];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideIn 0.2s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#fee2e2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FaExclamationTriangle size={20} color="#dc2626" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                                Violation Report
                            </h3>
                            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                                Candidate: <strong>{candidate.name}</strong>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#6b7280',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Body (Scrollable) */}
                <div style={{ padding: '24px', overflowY: 'auto', flexGrow: 1 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: '#fee2e2',
                        borderRadius: '8px',
                        border: '1px solid #fecaca'
                    }}>
                        <FaHistory color="#dc2626" />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>
                            Total Incidents: {logs.length}
                        </span>
                    </div>

                    {logs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                            <p>No detailed logs available for this violation.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {logs.map((log, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    gap: '12px',
                                    padding: '12px',
                                    backgroundColor: '#f9fafb',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    alignItems: 'flex-start'
                                }}>
                                    <div style={{ marginTop: '2px' }}>
                                        {getIcon(log.type)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937' }}>
                                                {log.type || 'Violation'}
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
                                                {log.time ? new Date(log.time).toLocaleTimeString() : '-'}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: '1.4' }}>
                                            {log.details || 'No details provided.'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    backgroundColor: '#f9fafb',
                    borderRadius: '0 0 12px 12px',
                    flexShrink: 0
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            backgroundColor: 'white',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'white';
                        }}
                    >
                        Close Report
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        /* Custom scrollbar for modal content */
        div::-webkit-scrollbar {
          width: 8px;
        }
        div::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb {
          background: #d1d5db; 
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #9ca3af; 
        }
      `}</style>
        </div>
    );
};

export default CheatingDetailsModal;
