import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { assignCourseToBatch, getAllBatches } from "../services/courseService";

export default function AssignBatchModal({ courseId, onClose, onSuccess }) {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [loading, setLoading] = useState(false);

useEffect(() => {
  async function fetchBatches() {
    try {
      const response = await getAllBatches();
      console.log("Batches API Response:", response);

      const list =
        response?.batches ||
        response?.data?.batches ||
        response?.data ||
        response?.result ||
        response ||
        [];

      setBatches(list);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
      setBatches([]);
    }
  }

  fetchBatches();
}, []);




  const handleSubmit = async () => {
    if (!selectedBatch) return alert("Please select a batch");
    setLoading(true);
    try {
      await assignCourseToBatch(courseId, selectedBatch);
      setLoading(false);
      onSuccess(); // callback to refresh dashboard if needed
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to assign batch");
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Assign Batch</h3>
        <select
          value={selectedBatch}
          onChange={(e) => setSelectedBatch(e.target.value)}
        >
          <option value="">Select a batch</option>
          {batches.map((batch) => (
            <option key={batch._id} value={batch._id}>
              {batch.name}
            </option>
          ))}
        </select>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading}>
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>

      {/* Simple modal CSS */}
      <style>{`
        .modal-backdrop {
          position: fixed;
          top:0; left:0;
          width:100%; height:100%;
          background: rgba(0,0,0,0.5);
          display:flex;
          align-items:center;
          justify-content:center;
          z-index:1000;
        }
        .modal {
          background:#fff;
          padding:20px;
          border-radius:10px;
          min-width:300px;
        }
        .modal h3 {
          margin-top:0;
        }
        .modal select {
          width:100%;
          padding:8px;
          margin:12px 0;
        }
        .modal-actions {
          display:flex;
          justify-content:flex-end;
          gap:10px;
        }
        .modal-actions button {
          padding:8px 12px;
          cursor:pointer;
        }
      `}</style>
    </div>
  );
}

AssignBatchModal.propTypes = {
  courseId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};
