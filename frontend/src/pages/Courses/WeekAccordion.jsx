import React from "react";
import ModuleView from "./WeekView";
import ClaimPointsButton from '../../components/ClaimPointsButton';
import { FaChalkboardTeacher, FaCheck } from "react-icons/fa";


export default function ModuleAccordion({
  moduleNumber,
  module,
  courseId,
  expanded,
  onToggle,
  role,
  trainerName,
  onDeleteModule,
  onEditModule,
  isLocked,
  isCompleted,
}) {
  const roleLower = role ? String(role).toLowerCase() : '';
  const isTrainerOrAdmin = roleLower === 'trainer' || roleLower === 'admin' || roleLower === 'master';
  // Developer override: allow forcing the claim button to show using ?showClaim=1
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const forceShowClaim = urlParams ? urlParams.get('showClaim') === '1' : false;

  return (
    <div className={`module-accordion ${isLocked ? 'locked' : ''} ${isCompleted ? 'completed' : ''}`}>
      <div className="accordion-header" onClick={onToggle}>
        <h3 className="accordion-title">
          {isCompleted ? (
            <span className="completed-badge" aria-hidden>
              <FaCheck className="badge-icon" />
              <span className="badge-text">Completed</span>
            </span>
          ) : isLocked ? (
            <span style={{ marginRight: "8px", fontSize: "16px" }}>🔒</span>
          ) : null}
          {module?.customName || module?.title || `Module ${moduleNumber}`}
          {/* debug status removed */}
          {/* Claim button is shown at the end of the expanded module body (see below) */}
          {isLocked && <span style={{ marginLeft: "8px", fontSize: "0.85rem", fontWeight: "500", color: "#f59e0b" }}>(Locked)</span>}
        </h3>
        <div className="accordion-actions">
          {/* Claim button is rendered inside the expanded body only (below ModuleView) */}
          {/* Show Trainer Name */}
          {trainerName && (
            <div className="trainer-info">
              <FaChalkboardTeacher className="trainer-icon" />
              <span className="trainer-text">Trainer: {trainerName}</span>
            </div>
          )}

          {/* Actions Menu for trainers/admins */}
          {isTrainerOrAdmin && (
            <div className="actions-menu">
              <button
                className="btn-module-action"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteModule(moduleNumber); // Confirmation handled by parent
                }}
                title="Delete Module"
              >
                🗑️
              </button>
              <button
                className="btn-module-action"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditModule(moduleNumber, module?.customName || module?.title);
                }}
                title="Edit Module"
              >
                ✏️
              </button>
            </div>
          )}

          <span className={`arrow ${expanded ? "up" : "down"}`}></span>
        </div>
      </div>

      {expanded && (
        <div className="accordion-body">
          <ModuleView weekNumber={moduleNumber} module={module} />

          {/* Claim area: render claim button at the END of the module content */}
          {roleLower === 'student' && isCompleted && module && (
            <div className="claim-area" style={{ marginTop: 12, textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
              <ClaimPointsButton
                courseId={courseId}
                weekNumber={module.weekNumber || module.weekNumber}
                initialClaimed={!!module.pointsClaimed && !forceShowClaim}
                onClaimed={() => { /* handled by event */ }}
              />
            </div>
          )}
        </div>
      )}

      {/* Inline CSS */}
      <style>{`
        .module-accordion {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
          transform: translateZ(0);
          transition: transform 280ms cubic-bezier(.2,.9,.3,1), box-shadow 220ms ease;
        }
        
        .module-accordion.locked {
          background: #fef3c7;
          border-color: #fbbf24;
          opacity: 0.85;
        }
        .module-accordion.completed {
          background: #ecfdf5;
          border-color: #34d399;
        }
        .claim-pill {
          background: #16a34a;
          color: white;
          padding: 8px 12px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.9rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          border: none;
        }

        .claim-pill.claimed {
          background: rgba(16,163,74,0.12);
          color: #065f46;
          border: 1px solid rgba(16,163,74,0.18);
        }
        .completed-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: linear-gradient(90deg, #ecfdf5, #bbf7d0);
          border: 1px solid rgba(52,211,153,0.18);
          color: #065f46;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.85rem;
          box-shadow: 0 4px 10px rgba(16,185,129,0.06);
          margin-right: 10px;
          transition: transform 220ms cubic-bezier(.2,.9,.3,1), opacity 200ms ease;
        }
        .completed-badge .badge-icon { font-size: 14px; }
        .completed-badge .badge-text { line-height: 1; }

        .accordion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          background: #f9fafb;
          cursor: pointer;
          transition: background 0.2s ease;
          transform-origin: center;
          will-change: transform;
        }

        .accordion-header:hover {
          background: #f1f5f9;
        }

        .accordion-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          color: #0f172a;
        }

        .accordion-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .trainer-info {
          display: flex;
          align-items: center;
          background: #e6f7ff;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #004e92;
        }

        .trainer-icon {
          margin-right: 6px;
        }

        .actions-menu {
          display: flex;
          gap: 8px;
          margin-right: 16px;
        }

        .btn-module-action {
          background: transparent;
          border: none;
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
        }

        .btn-module-action:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        

        .btn-edit-module {
          background: linear-gradient(90deg, #00bfa6, #009882);
          color: #052225;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .btn-edit-module:hover {
          transform: translateY(-1px);
        }

        .arrow {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-right: 2px solid #475569;
          border-bottom: 2px solid #475569;
          transform: rotate(45deg);
          margin-left: 4px;
          transition: transform 0.2s ease;
        }

        .arrow.up {
          transform: rotate(-135deg);
        }

        .accordion-body {
          padding: 16px 18px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
        }

        /* 3D hover tilt for module card */
        .module-accordion:hover {
          transform: translateY(-6px) perspective(800px) rotateX(2deg);
          box-shadow: 0 14px 40px rgba(16,24,40,0.12);
        }
        .module-accordion .accordion-header:hover {
          transform: translateZ(10px) rotateX(1deg);
        }

        @media (max-width: 600px) {
          .accordion-header {
            padding: 12px 14px;
          }
          .accordion-title {
            font-size: 1rem;
          }
          .btn-edit-module {
            padding: 5px 10px;
            font-size: 0.85rem;
          }
          .trainer-info {
            font-size: 0.85rem;
            padding: 3px 8px;
          }
        }
      `}</style>
    </div>
  );
}
