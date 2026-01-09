import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import api from "../services/api";

export default function AssignTrainerModal({ courseId, onClose, onSuccess }) {
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchTrainers() {
      try {
        const response = await api.get("/users");

        // ✅ Filter trainers
        const list =
          response?.data?.filter((u) => u.role === "Trainer") ||
          response?.filter((u) => u.role === "Trainer") ||
          [];

        setTrainers(list);
      } catch (err) {
        console.error("Failed to fetch trainers:", err);
        setTrainers([]);
      }
    }

    fetchTrainers();
  }, []);

  const handleSubmit = async () => {
    if (!selectedTrainer) return alert("Please select a trainer");

    setLoading(true);
    try {
      await api.post(`/courses/${courseId}/assign-trainer`, {
        trainerId: selectedTrainer,
      });

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to assign trainer");
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Assign Trainer</h3>

        <select
          value={selectedTrainer}
          onChange={(e) => setSelectedTrainer(e.target.value)}
        >
          <option value="">Select a trainer</option>

          {trainers.map((trainer) => (
            <option key={trainer._id} value={trainer._id}>
              {trainer.name}
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

AssignTrainerModal.propTypes = {
  courseId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};
