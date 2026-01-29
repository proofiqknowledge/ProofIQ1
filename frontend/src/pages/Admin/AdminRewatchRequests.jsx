import React, { useEffect, useState, useMemo } from "react";
import api from "../../services/api";
import { toast } from "react-toastify";
import { FaCheckCircle, FaTimesCircle, FaClock, FaUser, FaIdBadge, FaLayerGroup } from "react-icons/fa";

export default function AdminRewatchRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch pending rewatch requests for ADMIN
  const fetchRequests = async () => {
    try {
      setLoading(true);
      // Use backend's pending endpoint which returns pending requests and respects role
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

  const approve = async (id) => {
    try {
      // Backend route expects PUT /approve/:id
      const res = await api.put(`/rewatch/approve/${id}`);
      toast.success(res.data.message || "Request Approved");
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve");
    }
  };

  const reject = async (id) => {
    try {
      // Backend route expects PUT /reject/:id
      const res = await api.put(`/rewatch/reject/${id}`);
      toast.info(res.data.message || "Request Rejected");
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject");
    }
  };

  // Group requests by User (using EmployeeID or Name as key)
  const groupedRequests = useMemo(() => {
    const groups = {};
    requests.forEach((req) => {
      // Create a unique key for the user
      const userKey = req.employeeId && req.employeeId !== 'N/A' ? req.employeeId : req.studentName;

      if (!groups[userKey]) {
        groups[userKey] = {
          studentName: req.studentName,
          employeeId: req.employeeId,
          batchName: req.batchName,
          items: []
        };
      }
      groups[userKey].items.push(req);
    });
    return Object.values(groups);
  }, [requests]);

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
          marginBottom: "24px",
          color: "#1e293b",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <span>🛠 Admin – Pending Rewatch Requests</span>
        {!loading && requests.length > 0 && (
          <span style={{
            fontSize: "14px",
            backgroundColor: "#e2e8f0",
            padding: "4px 12px",
            borderRadius: "20px",
            color: "#475569",
            fontWeight: "600"
          }}>
            {requests.length} pending
          </span>
        )}
      </h2>

      {loading ? (
        <p style={{ fontSize: "16px", color: "#64748b" }}>Loading requests...</p>
      ) : requests.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px dashed #cbd5f5"
        }}>
          <p style={{ fontSize: "18px", color: "#64748b", margin: 0 }}>
            No pending rewatch requests. All caught up! 🎉
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "24px" }}>
          {groupedRequests.map((group) => (
            <div
              key={group.employeeId + group.studentName}
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e2e8f0",
                overflow: "hidden"
              }}
            >
              {/* User Header */}
              <div style={{
                padding: "16px 24px",
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "#e0e7ff",
                    color: "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px"
                  }}>
                    <FaUser />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>
                      {group.studentName}
                    </h3>
                    <div style={{ display: "flex", gap: "16px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "13px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                        <FaIdBadge /> {group.employeeId}
                      </span>
                      <span style={{ fontSize: "13px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                        <FaLayerGroup /> {group.batchName}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <span style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#f59e0b",
                    backgroundColor: "#fffbeb",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #fcd34d"
                  }}>
                    {group.items.length} Request{group.items.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Requests List */}
              <div style={{ padding: "0" }}>
                {group.items.map((req, index) => (
                  <div key={req._id} style={{
                    padding: "20px 24px",
                    borderBottom: index !== group.items.length - 1 ? "1px solid #f1f5f9" : "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px"
                  }}>
                    {/* Request Details */}
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "20px" }}>
                      <div style={{ flex: 1, minWidth: "300px" }}>
                        <div style={{ marginBottom: "8px" }}>
                          <span style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            color: "#64748b",
                            letterSpacing: "0.5px"
                          }}>
                            {req.courseName}
                          </span>
                          <div style={{ fontSize: "16px", fontWeight: "600", color: "#334155", marginTop: "2px" }}>
                            Module {req.weekNumber} <span style={{ color: "#cbd5e1", margin: "0 4px" }}>•</span> Day {req.dayNumber}
                          </div>
                        </div>

                        <div style={{
                          backgroundColor: "#f8fafc",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          display: "inline-block",
                          maxWidth: "100%"
                        }}>
                          <span style={{ fontSize: "14px", color: "#334155" }}>
                            <strong style={{ color: "#475569" }}>Reason:</strong> {req.reason || "No reason provided"}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", minWidth: "200px" }}>
                        <span style={{ fontSize: "12px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "5px" }}>
                          <FaClock /> {new Date(req.createdAt).toLocaleString()}
                        </span>

                        <div style={{ display: "flex", gap: "10px" }}>
                          <button
                            onClick={() => approve(req._id)}
                            style={{
                              padding: "8px 16px",
                              backgroundColor: "#16a34a",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "background 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#15803d"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#16a34a"}
                          >
                            <FaCheckCircle /> Approve
                          </button>
                          <button
                            onClick={() => reject(req._id)}
                            style={{
                              padding: "8px 16px",
                              backgroundColor: "white",
                              color: "#dc2626",
                              border: "1px solid #dc2626",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                              fontSize: "14px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = "#fee2e2";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = "white";
                            }}
                          >
                            <FaTimesCircle /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
