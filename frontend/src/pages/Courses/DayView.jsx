import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../../services/api";
import { VideoPlayer } from "../../components/VideoPlayer";
import { ChunkedVideoUploader } from "../../components/ChunkedVideoUploader";
import ModuleCompletionModal from "../../components/ModuleCompletionModal";
import ContentsDrawer from "../../components/ContentsDrawer";
import NextTopicsExams from "../../components/NextTopicsExams";
import mammoth from "mammoth";
import { FaArrowLeft, FaArrowRight, FaFile, FaCheckCircle, FaClock, FaPlay, FaInfoCircle, FaLock, FaList } from "react-icons/fa";

// Extracted NotesSection Component to prevent re-rendering and focus loss
const NotesSection = ({ courseId, weekNumber, dayNumber, userNote, setUserNote }) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleSaveNote = async () => {
        try {
            setIsSaving(true);
            await api.put(`/courses/${courseId}/week/${weekNumber}/day/${dayNumber}/note`, {
                note: userNote
            });
            toast.success("Note saved successfully");
            setIsSaving(false);
        } catch (err) {
            console.error('[NotesSection] failed to save note', err);
            toast.error("Failed to save note");
            setIsSaving(false);
        }
    };

    const onKeyDown = (e) => {
        // Enter saves note (use Shift+Enter for newline)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveNote();
        }
    };

    return (
        <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', marginTop: '20px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Notebook
            </h3>

            <div>
                <textarea
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Type your note here. Click 'Save Notes' to keep it permanently."
                    style={{
                        width: '100%',
                        minHeight: '120px',
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical',
                        backgroundColor: '#fff'
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '10px' }}>
                    <button
                        onClick={handleSaveNote}
                        disabled={isSaving}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: isSaving ? '#94a3b8' : '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {isSaving ? "Saving..." : "Save Notes"}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default function DayView() {
    const { id: courseId, weekNumber, dayNumber } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const [dayContent, setDayContent] = useState({});
    const [permissions, setPermissions] = useState({});
    const [overview, setOverview] = useState("");
    const [documentFile, setDocumentFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [lockReason, setLockReason] = useState(null);
    const [showModuleCompletionModal, setShowModuleCompletionModal] = useState(false);
    const [completedModuleNumber, setCompletedModuleNumber] = useState(null);
    const [showDocument, setShowDocument] = useState(false);
    const [docxHtml, setDocxHtml] = useState("");
    const [loadingDoc, setLoadingDoc] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [pptLinkInput, setPptLinkInput] = useState("");
    const [userNote, setUserNote] = useState(""); // ⭐ NEW: State for persistent note

    // New states for rewatch-request flow
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [requestReason, setRequestReason] = useState("");
    const [requestPending, setRequestPending] = useState(false);
    const [requestStatus, setRequestStatus] = useState(null); // pending / approved / rejected / null

    // States for NextTopicsExams component
    const [courseData, setCourseData] = useState(null);
    const [studentProgress, setStudentProgress] = useState(null);
    const [showNextTopicsModal, setShowNextTopicsModal] = useState(false);
    const [showContentsDrawer, setShowContentsDrawer] = useState(false);

    const isTrainerOrAdmin = ["trainer", "admin", "master"].includes(user?.role?.toLowerCase?.());

    useEffect(() => {
        fetchDayContent();
        fetchCourseDataAndProgress();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, weekNumber, dayNumber]);

    // Log when courseData updates
    useEffect(() => {
        console.log('[DayView] courseData updated:', courseData);
        if (courseData?.weeks) {
            console.log('[DayView] courseData has weeks array with', courseData.weeks.length, 'weeks');
        }
    }, [courseData]);

    useEffect(() => {
        const handler = () => {
            // re-fetch progress & course data
            fetchCourseDataAndProgress();
        };

        window.addEventListener("courseProgressUpdated", handler);
        return () => window.removeEventListener("courseProgressUpdated", handler);
    }, []);

    // Fetch course data and student progress for NextTopicsExams component
    const fetchCourseDataAndProgress = async () => {
        try {
            console.log('[DayView] Fetching course data for courseId:', courseId);
            const courseRes = await api.get(`/courses/${courseId}`);
            const progressRes = await api.get(`/courses/${courseId}/progress`);

            console.log('[DayView] ==== FULL COURSE RESPONSE ====');
            console.log(JSON.stringify(courseRes.data, null, 2));
            console.log('[DayView] ==== COURSE WEEKS ====');
            console.log(courseRes.data?.weeks);
            console.log('[DayView] ==== PROGRESS RESPONSE ====');
            console.log(JSON.stringify(progressRes.data, null, 2));

            // Set the response directly - the API returns course object
            setCourseData(courseRes.data);
            setStudentProgress(progressRes.data);

            console.log('[DayView] State updated - courseData set to:', courseRes.data);
        } catch (err) {
            console.error('[DayView] Error fetching course data or progress:', err);
            console.error('[DayView] Error details:', err.response?.data || err.message);
        }
    };

    // Helper to get document URL
    const getDocUrl = () => {
        if (!dayContent.documentUrl) return "";
        // If it's a full URL, return it
        if (dayContent.documentUrl.startsWith("http")) return dayContent.documentUrl;

        // Construct URL relative to backend root (not /api)
        const apiBase = api.defaults.baseURL || "";
        const backendRoot = apiBase.endsWith("/api")
            ? apiBase.slice(0, -4)
            : apiBase;

        // Ensure slash between root and path
        const path = dayContent.documentUrl.startsWith("/")
            ? dayContent.documentUrl
            : `/${dayContent.documentUrl}`;

        return `${backendRoot}${path}`;
    };

    const docUrl = getDocUrl();
    // Robust extension extraction handling query params
    const docExt = dayContent.documentUrl
        ? dayContent.documentUrl.split(/[?#]/)[0].split('.').pop().toLowerCase().trim()
        : "";

    // Effect to fetch DOCX content
    useEffect(() => {
        if (showDocument && docExt === 'docx' && docUrl && !docxHtml && !loadingDoc) {
            setLoadingDoc(true);
            fetch(docUrl)
                .then(res => {
                    if (!res.ok) throw new Error("Failed to fetch document");
                    return res.arrayBuffer();
                })
                .then(buffer => mammoth.convertToHtml({ arrayBuffer: buffer }))
                .then(result => {
                    setDocxHtml(result.value);
                    setLoadingDoc(false);
                })
                .catch(err => {
                    console.error("Error loading DOCX:", err);
                    setLoadingDoc(false);
                });
        }
    }, [showDocument, docUrl, docExt, docxHtml, loadingDoc]);

    const fetchDayContent = async () => {
        try {
            const res = await api.get(
                `/courses/${courseId}/week/${weekNumber}/day/${dayNumber}`
            );

            setDayContent(res.data.dayContent || {});
            setPermissions(res.data.permissions || {});
            setOverview(res.data.dayContent?.overview || "");
            setPptLinkInput(res.data.dayContent?.pptUrl || "");
            setIsEditing(false);

            // Existing lock fields returned by your backend
            setIsLocked(res.data.isLocked || false);
            setLockReason(res.data.lockReason || null);

            // New: read request status returned by backend (if provided)
            setRequestStatus(res.data.requestStatus || null);
            setRequestPending(res.data.requestStatus === "pending");

            // User Note Retrieval
            setUserNote(res.data.userNote || "");
        } catch (err) {
            console.error("Error fetching day content:", err);
            toast.error("Failed to load lesson content");
        }
    };

    // Removed handlePptLinkUpdate

    const handleOverviewSave = async () => {
        if (!overview.trim()) {
            toast.warning("Overview cannot be empty");
            return;
        }

        try {
            await api.put(
                `/courses/${courseId}/week/${weekNumber}/day/${dayNumber}/overview`,
                { overview }
            );
            toast.success("✓ Overview updated successfully!");
            setIsEditing(false);
            await fetchDayContent();
        } catch (err) {
            console.error("Error updating overview:", err);
            toast.error(err.response?.data?.message || "Failed to update overview");
        }
    };

    // NEW: Request Rewatch
    const openRequestForm = () => {
        setShowRequestForm(true);
        setRequestReason("");
    };

    const submitRequest = async () => {
        try {
            if (!dayContent.videoGridFSId) {
                toast.error("No video id found for this lesson");
                return;
            }

            setRequestPending(true);
            const payload = {
                videoId: String(dayContent.videoGridFSId),
                courseId: courseId,
                reason: requestReason || "",
                batchId: user?.batch || null,
                weekNumber: Number(weekNumber),
                dayNumber: Number(dayNumber)
            };

            // Your backend route (you said rewatch endpoints exist)
            const resp = await api.post("/rewatch/request", payload);

            toast.success(resp.data?.message || "Request submitted");
            setRequestStatus("pending");
            setShowRequestForm(false);

            // Refresh day content to show updated state (if backend sets it)
            await fetchDayContent();
        } catch (err) {
            console.error("submitRequest error:", err);
            toast.error(err.response?.data?.message || "Failed to submit request");
            setRequestPending(false);
        }
    };

    // NEW: Cancel request form
    const cancelRequestForm = () => {
        setShowRequestForm(false);
        setRequestReason("");
    };

    // NEW: helper to refresh request status on demand
    const refreshRequestStatus = async () => {
        await fetchDayContent();
    };

    // NEW: helper to determine whether to show request UI
    const showRequestUI = () => {
        // Only for students (not trainer/admin) and when locked due to "already watched"
        if (isTrainerOrAdmin) return false;
        if (!isLocked) return false;

        // If your backend sends lockReason like "already watched" use that, else show anyway when locked
        if (lockReason && typeof lockReason === "string") {
            return lockReason.toLowerCase().includes("already watched") || lockReason.toLowerCase().includes("watched");
        }
        // fallback to allow
        return true;
    };

    // NEW: Allow manual polling for request status (trainer may approve)
    useEffect(() => {
        let timer;
        if (requestPending) {
            timer = setInterval(() => {
                fetchDayContent();
            }, 5000); // poll every 5s
        }
        return () => clearInterval(timer);
    }, [requestPending]);

    // NEW: when dayContent updates, check if requestStatus changed
    useEffect(() => {
        if (requestStatus === "approved") {
            // If approved, refresh to allow playback (the player logic checks backend on play)
            toast.info("Your rewatch request has been approved. You can watch the video now.");
            setRequestPending(false);
            setIsLocked(false); // optimistic; fetchDayContent will confirm
        } else if (requestStatus === "rejected") {
            toast.info("Your rewatch request has been rejected.");
            setRequestPending(false);
        }
    }, [requestStatus]);

    // NEW: Calculate Next Topic Logic (Robust including Exams)
    const getNextTopic = useCallback(() => {
        if (!courseData || !courseData.weeks) return null;

        const currentWkNum = Number(weekNumber);
        const currentDayNum = Number(dayNumber);

        // Sort weeks to ensure order
        const sortedWeeks = [...courseData.weeks].sort((a, b) => a.weekNumber - b.weekNumber);

        // Find current week index
        const currentWeekIndex = sortedWeeks.findIndex(w => w.weekNumber === currentWkNum);
        console.log(`[DayView] getNextTopic: Wk=${currentWkNum}, Day=${currentDayNum}, WkIdx=${currentWeekIndex}`, sortedWeeks);

        if (currentWeekIndex === -1) return null;

        const currentWeek = sortedWeeks[currentWeekIndex];

        // 1. Try to find next day in current week (day > currentDay)
        if (currentWeek.days && currentWeek.days.length > 0) {
            const sortedDays = [...currentWeek.days].sort((a, b) => a.dayNumber - b.dayNumber);
            const nextDay = sortedDays.find(d => d.dayNumber > currentDayNum);
            if (nextDay) {
                return {
                    title: nextDay.title,
                    week: currentWkNum,
                    day: nextDay.dayNumber,
                    type: 'day'
                };
            }
        }

        // 1b. If no next day, checked if this week has an exam?
        if (currentWeek.hasExam) {
            console.log("[DayView] Found exam in current week");
            return {
                title: `Week ${currentWkNum} Assessment`,
                week: currentWkNum,
                type: 'exam'
            };
        }

        // 2. If no next day/exam in current week, look for subsequent weeks
        console.log("[DayView] Looking for subsequent weeks...");
        for (let i = currentWeekIndex + 1; i < sortedWeeks.length; i++) {
            const nextWeek = sortedWeeks[i];

            // Check days first
            if (nextWeek.days && nextWeek.days.length > 0) {
                const sortedNextDays = [...nextWeek.days].sort((a, b) => a.dayNumber - b.dayNumber);
                const firstDay = sortedNextDays[0];
                return {
                    title: firstDay.title,
                    week: nextWeek.weekNumber,
                    day: firstDay.dayNumber,
                    type: 'day'
                };
            }

            // If no days, does it have an exam?
            if (nextWeek.hasExam) {
                return {
                    title: `Week ${nextWeek.weekNumber} Assessment`,
                    week: nextWeek.weekNumber,
                    type: 'exam'
                };
            }
        }

        return null;
    }, [courseData, weekNumber, dayNumber]);

    const nextTopic = getNextTopic();

    // Existing handleVideoUploadComplete
    const handleVideoUploadComplete = async (result) => {
        if (result.success) {
            toast.success("🎬 Video uploaded successfully to database!");
            await fetchDayContent();
        } else {
            toast.error("Failed to complete video upload");
        }
    };

    const handleDocumentUpload = async () => {
        if (!documentFile) {
            toast.warning("Please select a document file first");
            return;
        }

        const allowedFormats = ["pdf", "doc", "docx", "txt", "ppt", "pptx"];
        const fileExtension = documentFile.name.split(".").pop().toLowerCase();

        if (!allowedFormats.includes(fileExtension)) {
            toast.error("Only PDF, DOC, DOCX, TXT, PPT, PPTX files are allowed");
            return;
        }

        if (documentFile.size > 100 * 1024 * 1024) {
            toast.error("Document must be less than 100MB");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("document", documentFile);

        try {
            const response = await api.put(
                `/courses/${courseId}/week/${weekNumber}/day/${dayNumber}/document`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        setUploadProgress(percentCompleted);
                    },
                }
            );

            if (response.data.success || response.status === 200) {
                toast.success("📄 Document uploaded successfully!");
                setDocumentFile(null);
                setUploadProgress(0);
                await fetchDayContent();
            } else {
                toast.error("Upload failed");
            }
        } catch (err) {
            console.error("Error uploading document:", err);
            toast.error(err.response?.data?.message || "Failed to upload document");
        } finally {
            setUploading(false);
        }
    };

    // Render helper for document content
    const renderDocumentContent = () => {
        // 1. Check for PPT URL (OneDrive)
        // Removed External Presentation Link Display Logic


        console.log(`[renderDocumentContent] docUrl: ${docUrl}, docExt: ${docExt}`);

        if (docExt === 'pdf' || docExt === 'txt') {
            // Professional View: Hide toolbar, navpanes, and fit width
            // Note: This works in Chrome/Edge/Firefox default PDF viewers
            const viewerUrl = `${docUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;

            return (
                <iframe
                    src={viewerUrl}
                    title="Document Viewer"
                    style={{
                        width: "100%",
                        height: "85vh", // Taller "Full View"
                        border: "none", // Cleaner look
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)" // Professional shadow
                    }}
                />
            );
        } else if (docExt === 'docx') {
            return (
                <div style={{ width: "100%", minHeight: "400px", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "20px", backgroundColor: "#fff" }}>
                    {!showDocument ? (
                        <div style={{ textAlign: "center", padding: "40px" }}>
                            <FaFile style={{ fontSize: "48px", color: "#2563eb", marginBottom: "16px" }} />
                            <h4 style={{ color: "#1e293b", marginBottom: "8px" }}>Word Document Available</h4>
                            <button
                                onClick={() => setShowDocument(true)}
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: "#2563eb",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "600"
                                }}
                            >
                                View Document
                            </button>
                        </div>
                    ) : loadingDoc ? (
                        <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading document...</div>
                    ) : (
                        <div dangerouslySetInnerHTML={{ __html: docxHtml }} />
                    )}
                </div>
            );
        } else if (['ppt', 'pptx', 'doc'].includes(docExt)) {
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const fullUrl = docUrl.startsWith('http') ? docUrl : window.location.origin + docUrl;
            const encodedUrl = encodeURIComponent(fullUrl);

            return (
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <iframe
                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`}
                        title="Office Document Viewer"
                        style={{ width: "100%", height: "600px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                        onError={(e) => console.error("Office Viewer Error:", e)}
                    />
                    <div style={{ textAlign: "center", fontSize: "13px", color: "#64748b" }}>
                        <p>
                            {isLocalhost && <span style={{ color: "#f59e0b", fontWeight: "500" }}>⚠️ Preview requires public URL (won't work on localhost). </span>}
                            <a href={docUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>
                                Download file to view
                            </a>
                        </p>
                    </div>
                </div>
            );
        } else {
            return (
                <div style={{ textAlign: "center", padding: "40px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <FaFile style={{ fontSize: "48px", color: "#94a3b8", marginBottom: "16px" }} />
                    <p style={{ color: "#64748b", marginBottom: "16px" }}>Preview not available for this file type ({docExt}).</p>
                    <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "#fff",
                            color: "#334155",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            textDecoration: "none",
                            fontWeight: "600"
                        }}
                    >
                        Download File
                    </a>
                </div>
            );
        }
    };

    return (
        <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: "20px", position: "relative" }}>
                <button
                    onClick={() => navigate(`/courses/${courseId}`)}
                    style={{
                        background: "none",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#334155",
                        marginBottom: "12px"
                    }}
                >
                    <FaArrowLeft /> Back
                </button>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>
                        {dayContent.customName || dayContent.title || `Module ${weekNumber} – Topic ${dayNumber}`}
                    </h2>
                </div>
            </div>

            {/* Video Section */}
            <section style={{ backgroundColor: "white", padding: "20px", borderRadius: "10px", marginBottom: "20px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)", position: "relative" }}>
                {/* Contents Drawer - Student only (rendered regardless of locked state) */}
                {!isTrainerOrAdmin && (
                    <ContentsDrawer
                        isOpen={showContentsDrawer}
                        onClose={() => setShowContentsDrawer(false)}
                        courseData={courseData}
                        studentProgress={studentProgress}
                        currentWeekNumber={weekNumber}
                        currentDayNumber={dayNumber}
                        onTopicClick={(week, day) => {
                            navigate(`/courses/${courseId}/week/${week}/day/${day}`);
                            setShowContentsDrawer(false);
                        }}
                    />
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                    <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "600", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                        <FaPlay /> Video
                        <div
                            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '8px', cursor: 'pointer' }}
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        >
                            <FaInfoCircle style={{ fontSize: '14px', color: '#64748b' }} />
                            {showTooltip && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    marginBottom: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: '#1e293b',
                                    color: 'white',
                                    fontSize: '12px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    zIndex: 10,
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                    pointerEvents: 'none'
                                }}>
                                    This video can only be watched once.
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        borderWidth: '4px',
                                        borderStyle: 'solid',
                                        borderColor: '#1e293b transparent transparent transparent'
                                    }} />
                                </div>
                            )}
                        </div>
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!isTrainerOrAdmin && (
                            <button
                                onClick={() => setShowContentsDrawer(!showContentsDrawer)}
                                style={{
                                    padding: '6px 10px',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                title="Toggle Contents Panel"
                            >
                                <FaList style={{ fontSize: '14px' }} />
                                Contents
                            </button>
                        )}
                    </div>
                </div>

                {isLocked && !isTrainerOrAdmin ? (
                    <div style={{
                        textAlign: "center",
                        padding: "60px 20px",
                        backgroundColor: "#fef3c7",
                        borderRadius: "10px",
                        border: "2px solid #fbbf24"
                    }}>
                        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🔒</div>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: "20px", fontWeight: "700", color: "#92400e" }}>
                            This Content is Locked
                        </h4>
                        <p style={{ margin: "0", fontSize: "16px", color: "#78350f", lineHeight: "1.6" }}>
                            {lockReason || "Complete previous topics to unlock this content"}
                        </p>
                        {lockReason && lockReason.includes("already watched") && (
                            <p style={{ marginTop: "10px", fontSize: "14px", color: "#b45309" }}>
                                (One-time access policy)
                            </p>

                        )}

                        {/* Unified Layout: Up Next & Request Actions */}
                        <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px dashed #fbbf24" }}>

                            {/* Buttons Row */}
                            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "16px" }}>

                                {/* 1. Next Video Button - Only if it's NOT an exam (manual navigation required for exams) */}
                                {nextTopic && nextTopic.type !== 'exam' && (
                                    <button
                                        onClick={() => {
                                            if (nextTopic.type === 'exam') {
                                                navigate(`/courses/${courseId}/week/${nextTopic.week}/exam`);
                                            } else {
                                                navigate(`/courses/${courseId}/week/${nextTopic.week}/day/${nextTopic.day}`);
                                            }
                                        }}
                                        style={{
                                            padding: "12px 24px",
                                            backgroundColor: "#2563eb",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "8px",
                                            cursor: "pointer",
                                            fontSize: "16px",
                                            fontWeight: "600",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)"
                                        }}
                                    >
                                        {nextTopic.type === 'exam' ? '📝 Start Assessment' : `▶ Play Next: ${nextTopic.title}`}
                                    </button>
                                )}

                                {/* 2. Request Watch Button */}
                                {showRequestUI() && !showRequestForm && requestStatus !== 'approved' && (
                                    <button
                                        onClick={openRequestForm}
                                        disabled={requestPending}
                                        style={{
                                            padding: "12px 24px",
                                            backgroundColor: requestPending ? "#f3f4f6" : "#fff",
                                            color: requestPending ? "#64748b" : "#2563eb",
                                            border: "2px solid #2563eb",
                                            borderRadius: "8px",
                                            cursor: requestPending ? "not-allowed" : "pointer",
                                            fontSize: "16px",
                                            fontWeight: "600",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "8px"
                                        }}
                                    >
                                        {requestPending ? "Request Pending..." : "↺ Request Watch Again"}
                                    </button>
                                )}
                            </div>

                            {/* Status Messages */}
                            {showRequestUI() && (
                                <>
                                    {requestStatus === "approved" && (
                                        <div style={{ marginTop: "16px", color: "#065f46", fontWeight: 600 }}>
                                            ✅ Request approved — you may watch the video again.
                                            <button
                                                onClick={() => refreshRequestStatus()}
                                                style={{ marginLeft: 12, padding: "4px 8px", borderRadius: 4, border: "1px solid #065f46", background: "none", cursor: "pointer", fontSize: "12px" }}
                                            >
                                                Refresh Page
                                            </button>
                                        </div>
                                    )}
                                    {requestStatus === "rejected" && (
                                        <div style={{ marginTop: "16px", color: "#b91c1c", fontWeight: 600 }}>
                                            ❌ Request rejected — you can submit again.
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Request Form (Expanded) */}
                            {showRequestUI() && showRequestForm && (
                                <div style={{ marginTop: "24px", maxWidth: "600px", marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
                                    <textarea
                                        placeholder="Optional: Provide a reason for the rewatch request..."
                                        value={requestReason}
                                        onChange={(e) => setRequestReason(e.target.value)}
                                        style={{
                                            width: "100%",
                                            minHeight: "80px",
                                            padding: "12px",
                                            borderRadius: "8px",
                                            border: "2px solid #e2e8f0",
                                            marginBottom: "12px",
                                            fontSize: "14px",
                                            fontFamily: "inherit"
                                        }}
                                    />
                                    <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                                        <button
                                            onClick={submitRequest}
                                            disabled={requestPending}
                                            style={{
                                                padding: "8px 24px",
                                                backgroundColor: "#2563eb",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: "8px",
                                                cursor: requestPending ? "not-allowed" : "pointer",
                                                fontWeight: 600
                                            }}
                                        >
                                            Submit Request
                                        </button>
                                        <button
                                            onClick={cancelRequestForm}
                                            style={{
                                                padding: "8px 24px",
                                                backgroundColor: "#fff",
                                                color: "#64748b",
                                                border: "1px solid #cbd5e1",
                                                borderRadius: "8px",
                                                cursor: "pointer",
                                                fontWeight: 600
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                ) : (
                    <div style={{ display: "flex", position: "relative" }}>

                        {/* Video Container */}
                        <div style={{ flex: 1, position: "relative" }}>


                            {/* Video Player */}
                            <div style={{ backgroundColor: "#000", borderRadius: "10px", overflow: "hidden" }}>
                                {dayContent.videoUrl ? (
                                    <VideoPlayer
                                        url={dayContent.videoUrl}
                                        onComplete={async () => {
                                            // Call backend to acknowledge video
                                            // ⭐ FIX: Skip for Admin/Trainer to avoid "Students only" 403 error toast
                                            if (isTrainerOrAdmin) {
                                                console.log('[DayView] Admin/Trainer watching video - skipping progress update');
                                                // Trigger next video nav if available (handled by player controls mainly, but we can do nothing here)
                                                return;
                                            }

                                            try {
                                                const ackResponse = await api.post(`/courses/${courseId}/week/${weekNumber}/day/${dayNumber}/acknowledge`, {
                                                    courseId,
                                                    weekNumber: Number(weekNumber),
                                                    dayNumber: Number(dayNumber)
                                                });

                                                console.log('[DayView] acknowledgeDay response:', ackResponse.data);

                                                // Refresh course data
                                                await fetchCourseDataAndProgress();

                                                // 🔥 NEW: Notify sidebar to refresh progress
                                                window.dispatchEvent(new Event("courseProgressUpdated"));

                                                // ⭐ CRITICAL: Only show popup if backend says module is completed
                                                if (ackResponse.data.moduleCompleted === true) {
                                                    setShowModuleCompletionModal(true);
                                                    setCompletedModuleNumber(ackResponse.data.completedModuleNumber || weekNumber);
                                                    console.log('[DayView] ✅ Module completed! Showing popup for module:', ackResponse.data.completedModuleNumber);
                                                } else {
                                                    console.log('[DayView] ℹ️ Video acknowledged but module not yet completed');
                                                }
                                            } catch (err) {
                                                console.error('[DayView] ❌ Error acknowledging video:', err);
                                                // Only show error if it's NOT a 403 (Double safety, though check above should catch it)
                                                if (err.response?.status !== 403) {
                                                    toast.error('Failed to update progress');
                                                }
                                            }

                                            // Refresh content to show updated state
                                            // await fetchDayContent(); // ❌ REMOVED: Triggers lock screen immediately

                                            // Instead, let the player show its overlay.
                                            // The backend already knows it's watched.
                                            // If the user navigates away, returning will show the locked state naturally.
                                        }}
                                        nextVideo={(nextTopic && nextTopic.type !== 'exam') ? {
                                            title: nextTopic.title,
                                            type: nextTopic.type,
                                            onNavigate: () => {
                                                navigate(`/courses/${courseId}/week/${nextTopic.week}/day/${nextTopic.day}`);
                                            }
                                        } : null}
                                    />
                                ) : (
                                    <div style={{ padding: "60px", textAlign: "center", color: "white" }}>
                                        <p>No video uploaded yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Trainer Video Upload */}
                {isTrainerOrAdmin && (
                    <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600", color: "#334155" }}>
                            🎬 Upload or Replace Video
                        </h4>
                        <ChunkedVideoUploader
                            courseId={courseId}
                            weekNumber={weekNumber}
                            dayNumber={dayNumber}
                            onUploadComplete={handleVideoUploadComplete}
                        />
                    </div>
                )}
            </section>

            {/* Overview Section */}
            <section style={{ backgroundColor: "white", padding: "20px", borderRadius: "10px", marginBottom: "20px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <h3 style={{ margin: "0", fontSize: "18px", fontWeight: "600", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                        <FaClock /> Overview
                    </h3>
                    {isTrainerOrAdmin && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            style={{
                                padding: "6px 12px",
                                fontSize: "13px",
                                color: "#2563eb",
                                backgroundColor: "#eff6ff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "600"
                            }}
                        >
                            Edit Overview
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <div>
                        <textarea
                            value={overview}
                            onChange={(e) => setOverview(e.target.value)}
                            style={{
                                width: "100%",
                                minHeight: "120px",
                                padding: "12px",
                                fontSize: "15px",
                                lineHeight: "1.6",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                marginBottom: "12px",
                                fontFamily: "inherit"
                            }}
                        />
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                onClick={handleOverviewSave}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#2563eb",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "600"
                                }}
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#fff",
                                    color: "#64748b",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: "600"
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ fontSize: "15px", lineHeight: "1.7", color: "#334155" }}>
                        {overview || "No overview available for this topic."}
                    </div>
                )}
            </section>

            {/* Document Section */}
            <section style={{ backgroundColor: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: "18px", fontWeight: "600", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FaFile /> Document
                </h3>

                {dayContent.documentUrl || dayContent.pptUrl ? (
                    renderDocumentContent()
                ) : (
                    <div style={{ padding: "40px", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                        <p style={{ color: "#64748b" }}>No document available.</p>
                    </div>
                )}

                {/* Trainer Document Upload */}
                {isTrainerOrAdmin && (
                    <div style={{ marginTop: "20px", padding: "20px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "600", color: "#334155" }}>
                            📄 Upload or Change Document
                        </h4>

                        {/* PPT URL Input - REMOVED */}
                        <div style={{ marginBottom: "12px" }}>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                                onChange={(e) => setDocumentFile(e.target.files[0])}
                                style={{ fontSize: "14px" }}
                            />
                        </div>
                        <button
                            onClick={handleDocumentUpload}
                            disabled={uploading}
                            style={{
                                padding: "8px 16px",
                                backgroundColor: uploading ? "#94a3b8" : "#2563eb",
                                color: "#fff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: uploading ? "not-allowed" : "pointer",
                                fontWeight: "600",
                                fontSize: "14px"
                            }}
                        >
                            {uploading ? `Uploading ${uploadProgress}%...` : "Upload Document"}
                        </button>
                    </div>
                )}
            </section>

            {/* Notes Section (below Document) - students only */}
            {!isTrainerOrAdmin && (
                <NotesSection
                    courseId={courseId}
                    weekNumber={weekNumber}
                    dayNumber={dayNumber}
                    userNote={userNote}
                    setUserNote={setUserNote}
                />
            )}

            {/* Module Completion Modal */}
            {showModuleCompletionModal && (
                <ModuleCompletionModal
                    isOpen={showModuleCompletionModal}
                    onClose={() => setShowModuleCompletionModal(false)}
                    moduleNumber={completedModuleNumber}
                />
            )}

            {/* Next Topics & Exams Modal */}
            {showNextTopicsModal && courseData && studentProgress && (
                <NextTopicsExams
                    currentCourseData={courseData}
                    currentWeekNumber={Number(weekNumber)}
                    currentDayNumber={Number(dayNumber)}
                    studentProgress={{
                        progress: studentProgress?.progress ?? 0,
                        completedWeeks: studentProgress?.completedWeeks ?? []
                    }}
                    role={user?.role}
                    onNavigateToDay={(w, d) => navigate(`/courses/${courseId}/week/${w}/day/${d}`)}
                    onNavigateToExam={(w) => navigate(`/courses/${courseId}/week/${w}/exam`)}
                    isModal={showNextTopicsModal}
                    onClose={() => setShowNextTopicsModal(false)}
                />
            )}
        </div>
    );
}
