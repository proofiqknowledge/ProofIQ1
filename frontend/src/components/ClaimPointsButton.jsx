import React, { useState } from 'react';
import ClaimPointsCongratsModal from './ClaimPointsCongratsModal';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FaCheckCircle } from 'react-icons/fa';

export default function ClaimPointsButton({ courseId, weekNumber, onClaimed, initialClaimed = false }) {
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(!!initialClaimed);
  const [showCongrats, setShowCongrats] = useState(false);

  const handleClaim = async (e) => {
    e.stopPropagation();
    if (claimed) return;
    setLoading(true);
    try {
      const res = await api.post('/points/claim', { courseId, weekNumber });
      if (res && res.data && res.data.success) {
        setClaimed(true);
        setShowCongrats(true);
        // NOTE: postpone emitting the courseProgressUpdated event and calling onClaimed
        // until the user closes the congrats modal. This prevents the parent/dashboard
        // from reloading the component which would unmount this button and close the modal.
      } else {
        toast.error(res.data?.message || 'Failed to claim points');
      }
    } catch (err) {
      console.error('ClaimPoints error:', err);
      toast.error(err.response?.data?.message || 'Failed to claim points');
    } finally {
      setLoading(false);
    }
  };


  if (claimed) {
    return (
      <>
        <div className="claim-pill claimed" title="Points claimed">
          100 Points Claimed
        </div>
        <ClaimPointsCongratsModal
          points={100}
          open={showCongrats}
          onClose={() => {
            setShowCongrats(false);
            // emit refresh event now that user has acknowledged the modal
            try {
              window.dispatchEvent(new CustomEvent('courseProgressUpdated', { detail: { studentId: null, courseId, dashboard: null, progress: null, moduleCompleted: true } }));
            } catch (err) {
              const ev = document.createEvent('CustomEvent');
              ev.initCustomEvent('courseProgressUpdated', true, true, { studentId: null, courseId, dashboard: null, progress: null, moduleCompleted: true });
              window.dispatchEvent(ev);
            }
            if (typeof onClaimed === 'function') onClaimed(weekNumber, 100);
          }}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className="claim-pill"
        onClick={handleClaim}
        disabled={loading}
        aria-label={`Claim 100 points for module ${weekNumber}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClaim(e); }}
      >
        {loading ? 'Claiming…' : `Claim 100 Points (Module ${weekNumber})`}
      </button>
      <ClaimPointsCongratsModal
        points={100}
        open={showCongrats}
        onClose={() => {
          setShowCongrats(false);
          try {
            window.dispatchEvent(new CustomEvent('courseProgressUpdated', { detail: { studentId: null, courseId, dashboard: null, progress: null, moduleCompleted: true } }));
          } catch (err) {
            const ev = document.createEvent('CustomEvent');
            ev.initCustomEvent('courseProgressUpdated', true, true, { studentId: null, courseId, dashboard: null, progress: null, moduleCompleted: true });
            window.dispatchEvent(ev);
          }
          if (typeof onClaimed === 'function') onClaimed(weekNumber, 100);
        }}
      />
    </>
  );
}
