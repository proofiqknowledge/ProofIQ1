import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import examService from "../../services/examService";

export default function TrainerExamAnalyticsPage() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get("batchId");

  const { user } = useSelector((s) => s.auth);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (!user || (user.role || "").toLowerCase() !== "trainer") {
      toast.error("Access denied");
      navigate("/trainer");
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await examService.getExamAnalyticsForTrainer(examId, batchId);
        setAnalytics(res.data || res);
      } catch (err) {
        console.error("Error fetching trainer analytics:", err);
        toast.error(err.response?.data?.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [examId, batchId, user, navigate]);

  if (loading)
    return (
      <div style={{ padding: 20 }}>
        <h3>Loading analytics...</h3>
      </div>
    );

  if (!analytics)
    return (
      <div style={{ padding: 20 }}>
        <h3>No analytics available.</h3>
      </div>
    );

  const { exam, assignedCount, attemptedCount, qualifiedCount, candidates } =
    analytics;

  return (
    <div style={{ padding: "20px", width: "100%", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "1100px" }}>
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            marginBottom: "15px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: "16px",
            color: "#1d4ed8",
            fontWeight: 500,
          }}
        >
          ← Back
        </button>

        {/* Main Card */}
        <div
          style={{
            background: "white",
            padding: "25px",
            borderRadius: "12px",
            boxShadow: "0 3px 8px rgba(0,0,0,0.1)",
          }}
        >
          {/* Title */}
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: "600" }}>{exam.title}</h1>
          <p style={{ color: "gray", marginTop: "3px" }}>Batch analytics</p>

          {/* Stats Row */}
          <div
            style={{
              marginTop: "25px",
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            {/* Invited */}
            <div
              style={{
                flex: "1",
                minWidth: "200px",
                padding: "20px",
                textAlign: "center",
                borderRadius: "10px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
              }}
            >
              <div style={{ color: "#475569" }}>Invited</div>
              <div style={{ fontSize: "32px", fontWeight: 700, color: "#2563eb" }}>
                {assignedCount}
              </div>
            </div>

            {/* Attempted */}
            <div
              style={{
                flex: "1",
                minWidth: "200px",
                padding: "20px",
                textAlign: "center",
                borderRadius: "10px",
                background: "#fef9c3",
                border: "1px solid #fcd34d",
              }}
            >
              <div style={{ color: "#475569" }}>Attempted</div>
              <div style={{ fontSize: "32px", fontWeight: 700, color: "#ca8a04" }}>
                {attemptedCount}
              </div>
            </div>

            {/* Qualified */}
            <div
              style={{
                flex: "1",
                minWidth: "200px",
                padding: "20px",
                textAlign: "center",
                borderRadius: "10px",
                background: "#dcfce7",
                border: "1px solid #86efac",
              }}
            >
              <div style={{ color: "#475569" }}>Qualified</div>
              <div style={{ fontSize: "32px", fontWeight: 700, color: "#16a34a" }}>
                {qualifiedCount}
              </div>
            </div>
          </div>

          {/* Candidates Table */}
          <div style={{ marginTop: "30px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px" }}>
              Candidates
            </h2>

            <div
              style={{
                overflowX: "auto",
                borderRadius: "12px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: "0",
                  minWidth: "700px",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <thead>
                  <tr style={{ background: "#f0f2f5", borderBottom: "1px solid #e5e7eb" }}>
                    {["Name", "Email", "Status", "Percentage", "Grade", "Qualified"].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "14px 16px",
                          fontWeight: 600,
                          fontSize: "14px",
                          color: "#374151",
                          textAlign: (h === "Percentage" || h === "Grade") ? "right" : "left",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {candidates.map((c, idx) => (
                    <tr
                      key={c.submissionId}
                      style={{
                        background: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                        transition: "0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#eef6ff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          idx % 2 === 0 ? "#ffffff" : "#f9fafb";
                      }}
                    >
                      <td style={{ padding: "14px 16px", fontSize: "14px" }}>{c.name}</td>
                      <td style={{ padding: "14px 16px", fontSize: "14px" }}>{c.email}</td>

                      {/* STATUS BADGE */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            fontSize: "12px",
                            borderRadius: "20px",
                            background:
                              c.status === "completed"
                                ? "#dcfce7"
                                : c.status === "in_progress"
                                  ? "#fef9c3"
                                  : "#e5e7eb",
                            color:
                              c.status === "completed"
                                ? "#16a34a"
                                : c.status === "in_progress"
                                  ? "#ca8a04"
                                  : "#6b7280",
                            fontWeight: 500,
                          }}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: "14px 16px",
                          textAlign: "right",
                          fontSize: "14px",
                        }}
                      >
                        {c.percentage ?? "—"}%
                      </td>

                      {/* GRADE BADGE */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            fontSize: "12px",
                            borderRadius: "20px",
                            background:
                              c.grade === "Green"
                                ? "#dcfce7"
                                : c.grade === "Amber"
                                  ? "#fef9c3"
                                  : c.grade === "Red"
                                    ? "#fee2e2"
                                    : "#e5e7eb",
                            color:
                              c.grade === "Green"
                                ? "#16a34a"
                                : c.grade === "Amber"
                                  ? "#ca8a04"
                                  : c.grade === "Red"
                                    ? "#dc2626"
                                    : "#6b7280",
                            fontWeight: 600,
                            textTransform: "uppercase"
                          }}
                        >
                          {c.grade || "—"}
                        </span>
                      </td>

                      {/* QUALIFIED BADGE */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            fontSize: "12px",
                            borderRadius: "20px",
                            background: c.qualified ? "#d1fae5" : "#fee2e2",
                            color: c.qualified ? "#059669" : "#dc2626",
                            fontWeight: 600,
                          }}
                        >
                          {c.qualified ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

          </div>
        </div>
      </div >
    </div >
  );
}
