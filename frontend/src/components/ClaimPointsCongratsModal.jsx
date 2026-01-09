import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export default function ClaimPointsCongratsModal({ points = 100, open, onClose }) {
  useEffect(() => {
    // prevent background scroll while modal open
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // Note: modal stays open until user clicks OK (no auto-close)

  const okRef = useRef(null);

  // focus OK button when modal opens for accessibility and to encourage click
  useEffect(() => {
    if (open && okRef.current) {
      okRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const modalEl = (
    <div className="claim-congrats-modal-overlay" role="dialog" aria-modal="true">
      <div className="claim-congrats-card" aria-hidden={false}>
        <div className="celebration-area">
          <div className="gold-center">
            <div className="gold-coin">💰</div>
            <h1 className="congrats-title">Congratulations!</h1>
            <p className="congrats-sub">You've earned <span className="points-highlight">{points} Points</span></p>
            <button ref={okRef} className="claim-close" onClick={onClose} aria-label="OK - close congratulation">OK</button>
          </div>

          {/* floating coins */}
          <div className="floating-coins" aria-hidden>
            {[...Array(12)].map((_, i) => (
              <span key={i} className={`fcoin fcoin-${i}`} />
            ))}
          </div>

          {/* confetti pieces */}
          <div className="confetti" aria-hidden>
            {[...Array(28)].map((_, i) => (
              <span key={i} className={`confetti-piece c-${i}`} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .claim-congrats-modal-overlay{
          position: fixed; inset:0; z-index:10000; display:flex; align-items:center; justify-content:center;
          background: rgba(6,10,16,0.55);
          backdrop-filter: blur(6px) saturate(120%);
          -webkit-backdrop-filter: blur(6px) saturate(120%);
          padding: 28px;
        }

        .claim-congrats-card{
          width: min(880px, 92%);
          max-width: 1100px;
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,250,251,0.98));
          box-shadow: 0 30px 80px rgba(6,10,16,0.5), 0 8px 30px rgba(6,10,16,0.2);
          transform-style: preserve-3d;
          perspective: 1200px;
          overflow: visible;
          padding: 36px 28px;
          position: relative;
          animation: cardPop 420ms cubic-bezier(.2,.9,.3,1);
        }

        @keyframes cardPop {
          0% { transform: translateY(30px) scale(.96) rotateX(8deg); opacity:0 }
          60% { transform: translateY(-6px) scale(1.02) rotateX(0deg); opacity:1 }
          100%{ transform: translateY(0) scale(1) rotateX(0deg); }
        }

        .celebration-area{ position: relative; padding: 26px 22px; }

        .gold-center{ text-align:center; padding: 14px 18px; }
        .gold-coin{ font-size: 48px; transform: translateZ(40px); filter: drop-shadow(0 8px 18px rgba(0,0,0,0.18)); }
        .congrats-title{ margin: 14px 0 6px; font-size: 28px; color:#0f172a; letter-spacing:-0.4px; }
        .congrats-sub{ margin: 0; color:#374151; font-size:16px }
        .points-highlight{ color: #b45309; font-weight:800; font-size:1.1rem }

        .claim-close{
          margin-top: 18px; background: linear-gradient(90deg,#F59E0B,#F97316); color:#08203a; border:none; padding:10px 28px; font-weight:800; border-radius:10px; cursor:pointer; box-shadow: 0 10px 30px rgba(249,115,22,0.18);
        }

        .floating-coins{ position:absolute; inset:0; pointer-events:none; overflow:visible }
        .fcoin{ position:absolute; width:32px; height:32px; background: radial-gradient(circle at 30% 25%, #ffd54f, #f59e0b); border-radius:50%; box-shadow: inset 0 -6px 10px rgba(0,0,0,0.08); }

        /* position coins in a fan and animate up */
        ${[...Array(12)].map((_, i) => {
          const left = 8 + i * 7;
          const delay = (i * 0.05).toFixed(2);
          const dur = (1.2 + (i % 3) * 0.15).toFixed(2);
          return `.fcoin-${i}{ left:${left}%; top:86%; transform-origin:center; animation: coinRise${i} ${dur}s cubic-bezier(.2,.9,.3,1) ${delay}s both; }\n`;
        }).join('')}

        ${[...Array(12)].map((_, i) => `@keyframes coinRise${i}{ 0%{ transform: translateY(0) scale(0.9) rotate(${(i*18)%360}deg); opacity:0 } 40%{ opacity:1 } 100%{ transform: translateY(-260px) translateX(${(i-6)*12}px) scale(1) rotate(${(i*60)%360}deg); } }`).join('\n')}

        /* confetti pieces */
        .confetti{ position:absolute; inset:0; pointer-events:none; }
        ${[...Array(28)].map((_, i) => {
          const left = Math.round(Math.random()*94)+1;
          const delay = (Math.random()*0.7).toFixed(2);
          const dur = (1.6 + Math.random()*1.1).toFixed(2);
          const bg = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'][i%5];
          return `.c-${i}{ left:${left}%; top:6%; width:10px; height:14px; background:${bg}; position:absolute; transform-origin:center; animation: confettiFall${i} ${dur}s linear ${delay}s both; border-radius:2px; }\n`;
        }).join('')}

        ${[...Array(28)].map((_, i) => `@keyframes confettiFall${i}{ 0%{ transform: translateY(-10px) rotate(0deg); opacity:1 } 100%{ transform: translateY(420px) rotate(${(i%2===0?360:-360)}deg); opacity:0.95 } }`).join('\n')}

        @media (max-width:720px){
          .claim-congrats-card{ width: 96%; padding: 22px; }
          .gold-coin{ font-size: 40px }
          .congrats-title{ font-size:22px }
        }
      `}</style>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return ReactDOM.createPortal(modalEl, document.body);
  }
  return modalEl;
}
