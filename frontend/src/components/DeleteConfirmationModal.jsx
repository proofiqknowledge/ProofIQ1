import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, itemName }) => {
    console.log('DeleteConfirmationModal rendered, isOpen:', isOpen);
    if (!isOpen) return null;

    const styles = {
        overlay: {
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            fontFamily: "'Inter', sans-serif",
        },
        modal: {
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            width: '90%',
            maxWidth: '450px',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out',
            padding: '0',
            border: '1px solid #e2e8f0',
        },
        header: {
            padding: '1.5rem 1.5rem 1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
        },
        iconContainer: {
            flexShrink: 0,
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        content: {
            flex: 1,
        },
        title: {
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#111827',
            margin: '0 0 0.5rem 0',
            lineHeight: '1.5',
        },
        message: {
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.5',
        },
        itemNameBox: {
            marginTop: '0.75rem',
            padding: '0.75rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#334155',
            wordBreak: 'break-word',
        },
        footer: {
            padding: '1rem 1.5rem 1.5rem',
            backgroundColor: '#f9fafb',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            borderTop: '1px solid #f1f5f9',
        },
        button: {
            padding: '0.625rem 1.25rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.2s',
        },
        cancelButton: {
            backgroundColor: '#ffffff',
            color: '#374151',
            border: '1px solid #d1d5db',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
        deleteButton: {
            backgroundColor: '#dc2626',
            color: '#ffffff',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
        closeButton: {
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            padding: '4px',
            borderRadius: '4px',
            transition: 'color 0.2s',
        }
    };

    return (
        <div style={styles.overlay}>
            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `}
            </style>
            <div style={styles.modal} role="dialog" aria-modal="true">
                <div style={styles.header}>
                    <div style={styles.iconContainer}>
                        <AlertTriangle size={24} color="#dc2626" />
                    </div>
                    <div style={styles.content}>
                        <h3 style={styles.title}>{title || 'Delete Item'}</h3>
                        <p style={styles.message}>
                            {message || 'Are you sure you want to delete this item? This action cannot be undone.'}
                        </p>
                        {itemName && (
                            <div style={styles.itemNameBox}>
                                "{itemName}"
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={styles.closeButton}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#4b5563'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div style={styles.footer}>
                    <button
                        type="button"
                        style={{ ...styles.button, ...styles.cancelButton }}
                        onClick={onClose}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        style={{ ...styles.button, ...styles.deleteButton }}
                        onClick={onConfirm}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
