import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BatchProgressCard({ batch }) {
  const navigate = useNavigate();

  const handleClick = () => navigate(`/trainer/batch/${batch._id}`);

  const pct = Math.max(0, Math.min(100, typeof batch.avgProgress === 'number' ? batch.avgProgress : 0));

  // No 3D tilt: keep hover lift only

  return (
    <div className="batch-card card" role="button" onClick={handleClick} style={{ cursor: 'pointer' }}>
      <div className="batch-card-inner">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="batch-title">{batch.name}</h3>
            <div className="muted" style={{ marginTop: 6 }}>{batch.courseTitle || '—'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{pct}%</div>
            <div className="muted" style={{ fontSize: 12 }}>Overall</div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="stat-box">
              <div className="stat-value">{batch.totalTrainees ?? 0}</div>
              <div className="stat-label">Trainees</div>
            </div>
          </div>

          <div style={{ marginTop: 12, position: 'relative' }}>
            <div className="progress-bar-outer">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="progress-note muted" style={{ marginTop: 8 }}>{pct}% of trainees completed the course on average</div>
          </div>
        </div>
      </div>

      <style>{`
        .batch-card { padding: 18px; border-radius: 12px; box-shadow: 0 6px 20px rgba(16,24,40,0.06); background: linear-gradient(180deg,#ffffff,#fbfdff); transition: transform 220ms ease, box-shadow 220ms ease; }
        .batch-card:hover { transform: translateY(-6px) scale(1.01); box-shadow: 0 18px 40px rgba(16,24,40,0.12); }
        .batch-card.fade-in { animation: fadeUp 420ms ease both; }
        .batch-title { margin: 0; font-size: 1.05rem; font-weight: 700; }
        .stat-box { background: #fbfdff; padding: 10px 12px; border-radius: 8px; border: 1px solid #eef2f6; min-width: 120px; }
        .stat-value { font-weight: 800; color: #0b7285; font-size: 1rem; }
        .stat-label { font-size: 0.78rem; color: #6c6e70; margin-top: 6px; }
        .progress-bar-outer { background: linear-gradient(180deg,#f3faf8,#eef7f2); height: 18px; border-radius: 999px; overflow: hidden; position: relative; }
        .progress-bar-fill { height: 100%; background: linear-gradient(90deg,#2ecc71,#22c55e,#16a34a); border-radius: 999px; transition: width 0ms; box-shadow: 0 12px 30px rgba(34,197,94,0.12); }
        .progress-note { font-size: 0.9rem; color: #6c6e70; }
        @media (max-width:720px){ .stat-box{ min-width: 90px } }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px) scale(.998); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}
