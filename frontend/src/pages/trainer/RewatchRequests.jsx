import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { toast } from "react-toastify";
import { FaCheckCircle, FaTimesCircle, FaClock } from "react-icons/fa";

export default function RewatchRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all pending rewatch requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      // Use shared rewatch pending endpoint (backend returns filtered results based on role)
      const res = await api.get("/rewatch/pending");
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load rewatch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const approveRequest = async (id) => {
  try {
    await api.put(`/rewatch/approve/${id}`);
    toast.success("Request Approved");
    fetchRequests();
  } catch (err) {
    toast.error(err.response?.data?.message || "Failed to approve");
  }
};

const rejectRequest = async (id) => {
  try {
    await api.put(`/rewatch/reject/${id}`);
    toast.info("Request Rejected");
    fetchRequests();
  } catch (err) {
    toast.error(err.response?.data?.message || "Failed to reject");
  }
};


  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#f9fafb",
        minHeight: "100vh",
        fontFamily: "'Inter', sans-serif"
      }}
    >
      <h2
        style={{
          fontSize: "26px",
          fontWeight: "700",
          marginBottom: "20px",
          color: "#1e293b"
        }}
      >
        🎬 Pending Rewatch Requests
      </h2>

      {loading ? (
        <p style={{ fontSize: "16px", color: "#64748b" }}>Loading requests...</p>
      ) : requests.length === 0 ? (
        <p style={{ fontSize: "16px", color: "#64748b" }}>
          No pending rewatch requests.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "20px" }}>
          {requests.map((req) => (
            <div
              key={req._id}
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                border: "1px solid #e2e8f0"
              }}
            >
              <div style={{ marginBottom: "10px" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#1e293b"
                  }}
                >
                  {req.studentName || "Unknown Student"}
                </h3>
                <p style={{ margin: "4px 0", color: "#475569" }}>
                  <strong>Course:</strong> {req.courseName}
                </p>
                <p style={{ margin: "4px 0", color: "#475569" }}>
                  <strong>Video:</strong> Module {req.weekNumber} → Day {req.dayNumber}
                </p>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "16px"
                }}
              >
                <p style={{ margin: 0, color: "#334155" }}>
                  <strong>Reason:</strong>{" "}
                  {req.reason && req.reason.trim() !== "" ? req.reason : "No reason provided"}
                </p>
              </div>

              <p
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "16px"
                }}
              >
                <FaClock /> Requested on{" "}
                {new Date(req.createdAt).toLocaleString()}
              </p>

              {/* ACTION BUTTONS */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => approveRequest(req._id)}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#16a34a",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <FaCheckCircle /> Approve
                </button>

                <button
                  onClick={() => rejectRequest(req._id)}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <FaTimesCircle /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
