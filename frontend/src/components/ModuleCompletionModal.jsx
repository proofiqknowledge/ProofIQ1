import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';

export default function ModuleCompletionModal({ moduleNumber, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        animation: 'fadeIn 0.3s ease-in',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px 50px',
          maxWidth: '500px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.4s ease-out',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Icon */}
        <div
          style={{
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <FaCheckCircle
            style={{
              fontSize: '80px',
              color: '#10b981',
              animation: 'scaleIn 0.5s ease-out',
            }}
          />
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '12px',
            marginTop: '0',
          }}
        >
          Module {moduleNumber} Completed! 🎉
        </h2>

        {/* Message */}
        <p
          style={{
            fontSize: '16px',
            color: '#6b7280',
            marginBottom: '32px',
            lineHeight: '1.6',
          }}
        >
          Congratulations! You have successfully completed all videos in Module {moduleNumber}.
          {moduleNumber === 1 && ' Module 2 is now unlocked!'}
        </p>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '14px 32px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#059669';
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#10b981';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
          }}
        >
          Continue Learning
        </button>

        {/* CSS Animations */}
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideUp {
            from {
              transform: translateY(30px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes scaleIn {
            from {
              transform: scale(0);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

