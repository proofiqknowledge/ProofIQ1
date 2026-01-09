import React from "react";

export default function ProgressBar({ progress = 0 }) {
  return (
    <div className="progress-container">
      <div
        className="progress-fill"
        style={{ width: `${progress}%` }}
      ></div>

      {/* Inline CSS */}
      <style>{`
        .progress-container {
          width: 100%;
          height: 10px;
          background-color: #e5e7eb;
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00bfa6, #009882);
          border-radius: 999px;
          transition: width 0.6s ease;
        }

        @media (max-width: 480px) {
          .progress-container {
            height: 8px;
          }
        }
      `}</style>
    </div>
  );
}
