import React from "react";
import { FaLock, FaCheck } from "react-icons/fa";

export default function DayItem({ dayNumber, title, onEditName, isLocked, isCompleted, isExam }) {
  return (
    <div className={`day-item ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}>
      <div className="day-header">
        <div className="title-container">
          <h4 className="day-title">
            {isCompleted ? (
              <span className="small-badge">
                <FaCheck className="small-badge-icon" />
                <span className="small-badge-text">Watched</span>
                <span className="small-badge-text">{isExam ? 'Completed' : 'Watched'}</span>
              </span>
            ) : isLocked ? (
              <FaLock style={{ marginRight: "8px", fontSize: "14px", color: "#f59e0b" }} />
            ) : null}
            {title || `Topic ${dayNumber}`}
            {isExam && (
              <span className="exam-badge" title="Module Exam" style={{ marginLeft: 10 }}>
                🧪 Assessment
              </span>
            )}
          </h4>
          {onEditName && (
            <button
              className="btn-edit-name"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEditName();
              }}
              title="Edit topic name"
            >
              ✏️
            </button>
          )}
        </div>
      </div>
      <p className="day-desc">
        {isLocked ? (
          "Complete previous topics to unlock this content"
        ) : (
          (title ? `Click to view materials, videos, and documents for "${title}".` : 'Click to view materials, videos, and documents for this topic.')
        )}
      </p>

      {/* Inline CSS */}
      <style>{`
        .day-item {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 14px 16px;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.04);
          transition: transform 260ms cubic-bezier(.2,.9,.3,1), box-shadow 220ms ease;
          transform-style: preserve-3d;
          transform-origin: center center;
        }

        .day-item:hover {
          transform: translateY(-8px) perspective(700px) rotateX(2deg);
          box-shadow: 0 20px 48px rgba(15,23,42,0.12);
        }
        
        .day-item.locked {
          background: #fef3c7;
          border-color: #fbbf24;
          opacity: 0.8;
        }
        .day-item.completed {
          background: #ecfdf5;
          border-color: #34d399;
          color: #065f46;
        }
        .day-item.completed .day-title { color: #065f46; }
        .day-item.completed .day-desc { color: #065f46; }
        .small-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 8px;
          background: linear-gradient(90deg,#bbf7d0,#ecfdf5);
          border-radius: 999px;
          color: #065f46;
          font-weight: 700;
          font-size: 0.78rem;
          margin-right: 8px;
          border: 1px solid rgba(52,211,153,0.14);
          box-shadow: 0 6px 18px rgba(16,185,129,0.06), inset 0 -6px 14px rgba(11,117,85,0.02);
          transition: transform 240ms cubic-bezier(.2,.9,.3,1), box-shadow 200ms ease;
          transform-origin: left center;
        }
        .exam-badge {
          display: inline-block;
          padding: 4px 8px;
          background: linear-gradient(90deg,#fff1f2,#fff7f9);
          border-radius: 999px;
          font-weight: 700;
          color: #991b1b;
          border: 1px solid rgba(219,39,119,0.08);
          font-size: 0.78rem;
        }
        .small-badge-icon { font-size: 12px; }
        .small-badge-text { line-height: 1; }

        .small-badge:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 10px 28px rgba(16,185,129,0.12), inset 0 -6px 14px rgba(11,117,85,0.035);
        }
        
        .day-item.locked:hover {
          transform: none;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.04);
        }

        .day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .day-title {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        .btn-edit-name {
          background: #f8f9fa;
          color: #4a5568;
          border: 1px solid #e2e8f0;
          padding: 6px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          margin-left: 8px;
          padding: 5px 10px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .btn-edit-name:hover {
          background: #edf2f7;
          border-color: #cbd5e0;
        }

        .day-desc {
          font-size: 0.9rem;
          color: #475569;
          margin: 0;
        }

        @media (max-width: 600px) {
          .day-item {
            padding: 12px 14px;
          }
          .day-title {
            font-size: 0.95rem;
          }
          .btn-edit-name {
            padding: 4px 8px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}
