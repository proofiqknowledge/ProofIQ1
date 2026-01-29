import React, { useState } from "react";
import { toast } from "react-toastify";
import api from "../services/api";

export default function EditWeeksModal({ course, onClose, onSuccess }) {
  const [weeks, setWeeks] = useState(course?.durationWeeks || "");

  const handleSave = async () => {
    try {
      await api.patch(`/courses/${course._id}/duration`, {
        durationWeeks: Number(weeks),
      });

      toast.success("Course duration updated!");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div
        className="bg-white w-[420px] p-6 rounded-xl shadow-2xl animate-fadeIn 
                   border border-gray-200"
      >
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-5">
          Edit Course Duration
        </h2>

        {/* Input */}
        <label className="inline-block mr-3 text-gray-700 font-medium">
          Number of Weeks
        </label>
            <input
            type="number"
            min="1"
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            className="inline-block border border-gray-300 rounded-lg px-3 py-2 
                        focus:ring-2 focus:ring-blue-500"
             placeholder="Enter weeks"
            />

        {/* Buttons */}
        <div className="flex justify-end gap-3" style={{ marginTop: "20px" }}>
        <button
            onClick={onClose}
            style={{
            padding: "10px 18px",
            background: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: "pointer",
            transition: "0.2s",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#e5e7eb")}
            onMouseLeave={(e) => (e.target.style.background = "#f3f4f6")}
        >
            Cancel
        </button>

        <button
            onClick={handleSave}
            style={{
            padding: "10px 22px",
            background: "#2563eb",
            border: "none",
            borderRadius: "8px",
            color: "white",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "0.2s",
            boxShadow: "0 2px 6px rgba(37, 99, 235, 0.3)",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#1e40af")}
            onMouseLeave={(e) => (e.target.style.background = "#2563eb")}
        >
            Save
        </button>
        </div>



      </div>

      {/* Animation */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.25s ease-out;
          }
        `}
      </style>
    </div>
  );
}
