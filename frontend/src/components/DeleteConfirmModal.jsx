import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, blogTitle }) => {
    if (!isOpen) return null;

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
                maxWidth: '500px',
                width: '90%',
                padding: '0',
                animation: 'slideIn 0.2s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
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
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                            Delete Blog Post
                        </h3>
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

                {/* Body */}
                <div style={{ padding: '24px' }}>
                    <p style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#374151', lineHeight: '1.6' }}>
                        Are you sure you want to delete this blog post?
                    </p>
                    <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        marginBottom: '16px'
                    }}>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                            "{blogTitle}"
                        </p>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#dc2626', fontWeight: '500' }}>
                        ⚠️ This action cannot be undone.
                    </p>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                    backgroundColor: '#f9fafb',
                    borderRadius: '0 0 12px 12px'
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
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '8px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#b91c1c';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#dc2626';
                        }}
                    >
                        Delete
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
      `}</style>
        </div>
    );
};

export default DeleteConfirmModal;
