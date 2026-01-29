import React, { useEffect } from 'react';
import { FaCoins, FaTimes } from 'react-icons/fa';

const RewardPopup = ({ onClose, points = 1000 }) => {
    useEffect(() => {
        // Auto close after 5 seconds
        const timer = setTimeout(() => {
            onClose();
        }, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.4s ease-out'
        }}>
            <div style={{
                background: '#ffffff',
                padding: '48px 40px',
                borderRadius: '32px',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                maxWidth: '90%',
                width: '380px',
                animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        background: 'transparent',
                        border: 'none',
                        color: '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: '8px',
                        borderRadius: '50%',
                        transition: 'background 0.2s, color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.color = '#4b5563';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#9ca3af';
                    }}
                >
                    <FaTimes />
                </button>

                {/* Icon Container with Glow */}
                <div style={{
                    width: '96px',
                    height: '96px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    boxShadow: '0 10px 25px rgba(217, 119, 6, 0.4)',
                    animation: 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                }}>
                    <FaCoins style={{ fontSize: '40px', color: 'white' }} />
                </div>

                <h2 style={{
                    margin: '0 0 8px 0',
                    color: '#111827',
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    letterSpacing: '-0.025em'
                }}>
                    Reward Claimed!
                </h2>

                <p style={{
                    fontSize: '1rem',
                    color: '#6b7280',
                    margin: '0 0 32px 0',
                    lineHeight: 1.5
                }}>
                    Great job on your blog post.
                </p>

                <div style={{
                    background: '#fffbeb',
                    border: '2px solid #fcd34d',
                    borderRadius: '16px',
                    padding: '16px 32px',
                    marginBottom: '32px',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    <span style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        color: '#b45309',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '4px'
                    }}>
                        You Earned
                    </span>
                    <span style={{
                        display: 'block',
                        fontSize: '2.5rem',
                        fontWeight: 900,
                        color: '#d97706',
                        lineHeight: 1
                    }}>
                        +{points}
                    </span>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        background: '#111827',
                        color: 'white',
                        border: 'none',
                        width: '100%',
                        padding: '16px',
                        fontSize: '1rem',
                        fontWeight: 600,
                        borderRadius: '14px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                    }}
                >
                    Continue
                </button>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0); }
          80% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
        </div>
    );
};

export default RewardPopup;
