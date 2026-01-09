import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useCourseManagement } from "../../hooks/useCourseManagement";
import ModuleAccordion from "./WeekAccordion";
import api from "../../services/api";
import { toast } from "react-toastify";
import CourseImageUploadModal from "../../components/CourseImageUploadModal";
import EditWeeksModal from "../../components/EditWeeksModal";
import EditNameModal from "./EditNameModal";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";


export default function CourseDetail() {
  const { id } = useParams();
  const { courseDetail, fetchCourseDetail, loading, error, fetchCourses } = useCourseManagement();
  const { user } = useSelector((state) => state.auth);

  const [expandedmodules, setExpandedmodules] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editmodules, setEditmodules] = useState(0);
  const [showImageUpload, setShowImageUpload] = useState(false);

  // New State for Course Info & Disclaimer
  const [editAbout, setEditAbout] = useState("");
  const [editLearnings, setEditLearnings] = useState("");
  const [editWhatDo, setEditWhatDo] = useState("");
  const [editDisclaimerEnabled, setEditDisclaimerEnabled] = useState(true);
  const [editDisclaimerContent, setEditDisclaimerContent] = useState("");
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const [showEditWeeks, setShowEditWeeks] = useState(false);

  // Edit Module Modal State
  const [showEditModuleModal, setShowEditModuleModal] = useState(false);
  const [editingModuleData, setEditingModuleData] = useState(null);

  // Delete Module Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState(null);

  const navigate = useNavigate();



  useEffect(() => {
    if (id) fetchCourseDetail(id);
  }, [fetchCourseDetail, id]);

  // Listen for progress updates to refresh course and show newly unlocked content
  useEffect(() => {
    const handler = (event) => {
      if (id) {
        const eventCourseId = event.detail?.courseId;
        const moduleCompleted = event.detail?.moduleCompleted;

        // Only refresh if this event is for the current course
        if (!eventCourseId || eventCourseId === id) {
          console.log(`[CourseDetail] Progress updated event received, refreshing course ${id}${moduleCompleted ? ' (module completed!)' : ''}`);

          // If a module was completed, wait a bit longer to ensure backend has fully processed
          const delay = moduleCompleted ? 1200 : 800;

          setTimeout(() => {
            fetchCourseDetail(id);
          }, delay);
        }
      }
    };
    window.addEventListener('courseProgressUpdated', handler);
    return () => window.removeEventListener('courseProgressUpdated', handler);
  }, [id, fetchCourseDetail]);

  useEffect(() => {
    if (courseDetail?._id) {
      setEditTitle(courseDetail.title);
      setEditDescription(courseDetail.description);
      setEditmodules(courseDetail.weeks?.length || 0);

      // Sync new fields
      setEditAbout(courseDetail.aboutCourse || "");
      setEditLearnings(courseDetail.learnings ? courseDetail.learnings.join('\n') : "");
      setEditWhatDo(courseDetail.whatYouWillDo ? courseDetail.whatYouWillDo.join('\n') : "");
      setEditDisclaimerEnabled(courseDetail.disclaimerEnabled !== false); // default true
      setEditDisclaimerContent(courseDetail.disclaimerContent || "I acknowledge that I have read and understood the course requirements and outcomes.");

      // Update Disclaimer Popup State
      if (user?.role === 'Student' && courseDetail.disclaimerEnabled && !courseDetail.disclaimerAcknowledged) {
        setShowDisclaimer(true);
      } else {
        setShowDisclaimer(false);
      }
    }
  }, [courseDetail]);

  const togglemodule = (moduleIndex) => {
    setExpandedmodules((prev) => ({
      ...prev,
      [moduleIndex]: !prev[moduleIndex],
    }));
  };

  const handleDeleteClick = (moduleNumber) => {
    setModuleToDelete(moduleNumber);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!moduleToDelete || !courseDetail?._id) return;

    try {
      await api.delete(`/courses/${courseDetail._id}/module/${moduleToDelete}`);
      toast.success("Module deleted successfully");
      fetchCourseDetail(courseDetail._id);
      setShowDeleteModal(false);
      setModuleToDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete module");
    }
  };

  const handleEditModule = (moduleNumber, currentName) => {
    setEditingModuleData({ moduleNumber, currentName });
    setShowEditModuleModal(true);
  };

  const handleSaveModuleName = async (newName) => {
    if (!editingModuleData) return;
    const { moduleNumber } = editingModuleData;

    if (newName === null) return; // User cancelled

    if (!courseDetail?._id) {
      toast.error("Course not loaded");
      return;
    }

    try {
      await api.put(`/courses/${courseDetail._id}/week/${moduleNumber}/name`, {
        customName: newName
      });
      toast.success("Module name updated successfully!");
      fetchCourseDetail(courseDetail._id);
      // Close modal
      setShowEditModuleModal(false);
      setEditingModuleData(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update module name");
    }
  };

  const handleSave = async () => {
    if (!courseDetail?._id) {
      toast.error("Course not loaded");
      return;
    }

    try {
      await api.put(`/courses/${courseDetail._id}/update`, {
        title: editTitle,
        description: editDescription,
        weeks: editmodules,
        aboutCourse: editAbout,
        learnings: editLearnings.split('\n').filter(line => line.trim() !== ""),
        whatYouWillDo: editWhatDo.split('\n').filter(line => line.trim() !== ""),
        disclaimerEnabled: editDisclaimerEnabled,
        disclaimerContent: editDisclaimerContent,
      });
      toast.success("Course updated successfully!");
      setEditMode(false);
      setMenuOpen(false);
      fetchCourseDetail(courseDetail._id);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update course");
    }
  };

  const handleImageUploadSuccess = () => {
    console.log("✅ Image uploaded successfully!");
    setTimeout(() => {
      window.dispatchEvent(new Event('coursesUpdated'));
      fetchCourses();
    }, 1000);
  };

  const handleAddModule = async () => {
    if (!courseDetail) {
      toast.error("Course not loaded");
      return;
    }

    try {
      const nextModuleNumber = (Array.isArray(courseDetail.weeks) ? courseDetail.weeks.length : 0) + 1;
      await api.post(`/courses/${id}/weeks`, {
        weekNumber: nextModuleNumber
      });
      fetchCourseDetail(id);
      toast.success("Module added successfully");
    } catch (err) {
      console.error("Failed to add module:", err);
      toast.error(err.response?.data?.message || "Failed to add module");
    }
  };

  if (loading) {
    return (
      <div className="course-detail">
        <div className="loading-text">Loading course details...</div>
      </div>
    );
  }

  if (error) {
    const isExpired = String(error).toLowerCase().includes('expire');
    return (
      <div className="course-detail">
        <div className="error-text">{error}</div>
        {isExpired && (
          <div style={{ marginTop: 12, color: '#9b1c36' }}>
            <strong>Access Denied:</strong> Your batch access to this course has expired. Please contact your administrator to renew access.
          </div>
        )}
      </div>
    );
  }

  if (!courseDetail || !courseDetail._id) {
    return (
      <div className="course-detail">
        <div className="error-text">No course found.</div>
      </div>
    );
  }

  return (
    <div className="course-detail">
      {/* Back Button */}
      <button
        onClick={() => navigate('/courses')}
        style={{
          marginBottom: '20px',
          padding: '8px 16px',
          background: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#374151'
        }}
        onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
        onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
      >
        ← Back to Courses
      </button>

      {/* ✅ TWO COLUMN LAYOUT - IMAGE & DETAILS SIDE BY SIDE */}
      <div className="course-header-section">
        {/* LEFT CARD - IMAGE - REDUCED SIZE */}
        <div className="course-image-card">
          <img
            key={courseDetail?.imageGridFSId}
            src={`${api.defaults.baseURL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/courses/${courseDetail?._id}/image?v=${Date.now()}`}
            alt={courseDetail?.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              // Max height removed to let flex stretch handle it, or keep consistent
            }}
            onLoad={() => console.log("✅ Image loaded!")}
            onError={(e) => { e.target.src = "/default-course.jpg"; }}
          />
          {["Admin", "Master", "Trainer"].includes(user?.role) && (
            <button
              onClick={() => setShowImageUpload(true)}
              className="image-upload-button"
            >
              🖼️ Change Image
            </button>
          )}
        </div>

        {/* RIGHT CARD - DETAILS */}
        {/* RIGHT CARD - DETAILS */}
        {/* RIGHT CARD - DETAILS */}
        <div className="course-details-card">
          {/* HEADER WITH TITLE AND MENU */}
          {/* HEADER WITH TITLE, META, BUTTON, MENU */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>

            {/* LEFT: Title, Modules, Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
              <h1 className="course-title" style={{ margin: 0 }}>{!editMode && courseDetail.title}</h1>

              {!editMode && (
                <>
                  <div className="course-meta" style={{ margin: 0 }}>
                    <span>📚 {courseDetail.weeks.length} modules</span>
                  </div>

                </>
              )}
            </div>

            {/* RIGHT: Mind Map Button + Menu */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>

              {/* Mind Map Button */}
              {!editMode && (
                <button
                  className="mindmap-button"
                  style={{ margin: 0, padding: '8px 16px', fontSize: '13px' }}
                  onClick={() =>
                    navigate(`/mindmap?course=${courseDetail.title}`)
                  }
                >
                  <span style={{ fontSize: '16px' }}>🧠</span>
                  <span style={{ fontWeight: '600' }}>Mind Map</span>
                </button>
              )}

              {/* Menu */}
              {["Admin", "Master"].includes(user?.role) && (
                <div className="menu-container">
                  <button
                    className="menu-button"
                    onClick={() => setMenuOpen((prev) => !prev)}
                  >
                    ⋮
                  </button>
                  {menuOpen && (
                    <ul className="menu-dropdown">
                      {!editMode && (
                        <>
                          <li onClick={() => { setEditMode(true); setMenuOpen(false); }}>✏️ Edit Details</li>
                          <li onClick={() => { setShowEditWeeks(true); setMenuOpen(false); }}>⏱️ Edit Duration (Weeks)</li>
                        </>
                      )}
                      {editMode && (
                        <>
                          <li onClick={handleSave}>✅ Save</li>
                          <li onClick={() => { setEditMode(false); setMenuOpen(false); }}>❌ Cancel</li>
                        </>
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          {!editMode ? (
            <>
              {/* Separator REMOVED as we have a unified header now, but keeping the info block wrapper */}
              {/* We just need to remove the old meta/button placeholders */}

              {/* ✅ MERGED INFO SECTION: SEPARATOR */}
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* About Section */}
                {courseDetail.aboutCourse && (
                  <div className="info-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <h3 className="section-heading">ℹ️ About</h3>
                    <p className="about-text">{courseDetail.aboutCourse}</p>
                  </div>
                )}

                {/* Content Grid for Learnings & Skills */}
                <div className="info-content-grid">
                  {/* Learnings */}
                  {courseDetail.learnings && courseDetail.learnings.length > 0 && (
                    <div className="info-subsection">
                      <h3 className="card-heading"><span className="icon-box">🎓</span> Learnings</h3>
                      <ul className="feature-list">
                        {courseDetail.learnings.map((item, idx) => (
                          <li key={idx}><span className="check-icon">✓</span> {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Skills */}
                  {courseDetail.whatYouWillDo && courseDetail.whatYouWillDo.length > 0 && (
                    <div className="info-subsection">
                      <h3 className="card-heading"><span className="icon-box">🚀</span> Skills</h3>
                      <ul className="feature-list">
                        {courseDetail.whatYouWillDo.map((item, idx) => (
                          <li key={idx}><span className="star-icon">★</span> {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="edit-form">
              <label>Course Title</label>
              <input
                className="edit-input"
                placeholder="Course Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />

              <label>About Course</label>
              <textarea
                className="edit-textarea"
                placeholder="About Course (Overview)"
                value={editAbout}
                onChange={(e) => setEditAbout(e.target.value)}
              />

              <label>Learnings (one per line)</label>
              <textarea
                className="edit-textarea"
                placeholder="List learnings here, one per line..."
                value={editLearnings}
                onChange={(e) => setEditLearnings(e.target.value)}
              />

              <label>What You'll Be Able to Do (one per line)</label>
              <textarea
                className="edit-textarea"
                placeholder="List skills here, one per line..."
                value={editWhatDo}
                onChange={(e) => setEditWhatDo(e.target.value)}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0' }}>
                <input
                  type="checkbox"
                  checked={editDisclaimerEnabled}
                  onChange={(e) => setEditDisclaimerEnabled(e.target.checked)}
                  id="disclaimer-toggle"
                />
                <label htmlFor="disclaimer-toggle" style={{ fontWeight: '500' }}>Enable Mandatory Disclaimer</label>
              </div>

              {editDisclaimerEnabled && (
                <>
                  <label>Disclaimer Content</label>
                  <textarea
                    className="edit-textarea"
                    placeholder="Enter the mandatory disclaimer text..."
                    value={editDisclaimerContent}
                    onChange={(e) => setEditDisclaimerContent(e.target.value)}
                  />
                </>
              )}

              <label>Number of Modules</label>
              <input
                className="edit-input"
                type="number"
                min="1"
                placeholder="Number of modules"
                value={editmodules}
                onChange={(e) => setEditmodules(Number(e.target.value))}
              />
            </div>
          )}

        </div>




      </div>





      {/* ✅ DISCLAIMER MODAL */}
      {showDisclaimer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#9B1C36', marginBottom: '16px' }}>
              Course Disclaimer
            </h2>
            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '8px', border: '1px solid #fee2e2', marginBottom: '24px' }}>
              <p style={{ color: '#7f1d1d', fontSize: '15px', lineHeight: '1.6', textAlign: 'left' }}>
                {(courseDetail.disclaimerContent && courseDetail.disclaimerContent !== "I acknowledge that I have read and understood the course requirements and outcomes.")
                  ? courseDetail.disclaimerContent
                  : "IMPORTANT: ONE-TIME WATCH POLICY\nPlease note that this course strictly enforces a one-time viewing policy for all video content. You can watch each video exactly once. After completion, the video will be locked. To re-watch any video, you must request legitimate approval from an Admin or Trainer. By clicking 'I Acknowledge & Agree', you confirm that you understand and accept this restriction."}
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await api.put(`/courses/${id}/acknowledge-disclaimer`);
                  toast.success("Welcome to the course!");
                  setShowDisclaimer(false);
                  fetchCourseDetail(id); // Refresh to sync
                } catch (err) {
                  toast.error("Failed to acknowledge. Please try again.");
                }
              }}
              style={{
                background: '#9B1C36',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              I Acknowledge & Agree
            </button>
          </div>
        </div>
      )}

      {/* ✅ IMAGE UPLOAD MODAL */}
      {showImageUpload && (
        <CourseImageUploadModal
          courseId={id}
          onSuccess={handleImageUploadSuccess}
          onClose={() => setShowImageUpload(false)}
        />
      )}
      {showEditWeeks && (
        <EditWeeksModal
          course={courseDetail}
          onClose={() => setShowEditWeeks(false)}
          onSuccess={() => {
            fetchCourseDetail(id);
            toast.success("Course duration updated!");
          }}
        />
      )}

      {/* ✅ MODULE EDIT NAME MODAL */}
      {showEditModuleModal && (
        <EditNameModal
          currentName={editingModuleData?.currentName}
          defaultName={`Module ${editingModuleData?.moduleNumber}`}
          onClose={() => {
            setShowEditModuleModal(false);
            setEditingModuleData(null);
          }}
          onSave={handleSaveModuleName}
        />
      )}

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Module"
        message={`Are you sure you want to delete Module ${moduleToDelete}? This action cannot be undone.`}
        itemName={`Module ${moduleToDelete}`}
      />

      {/* ✅ Modules Section */}
      <div className="modules-container">
        {Array.isArray(courseDetail?.weeks) && courseDetail.weeks.length > 0 ? (
          <>
            {courseDetail.weeks.map((module, index) => (
              <ModuleAccordion
                key={module?._id || index}
                moduleNumber={module?.weekNumber}
                module={module}
                expanded={expandedmodules[index] || false}
                onToggle={() => togglemodule(index)}
                role={user?.role}
                courseId={courseDetail._id}
                onDeleteModule={handleDeleteClick}
                onEditModule={handleEditModule}
                isLocked={module?.isLocked && user?.role === "Student"}
                isCompleted={module?.isCompleted}
              />
            ))}
            {["Admin", "Master"].includes(user?.role) && (
              <button
                className="add-module-button"
                onClick={handleAddModule}
              >
                + Add Module
              </button>
            )}
          </>
        ) : (
          <>
            <p className="error-text text-center">No modules found.</p>
            {["Admin", "Master"].includes(user?.role) && (
              <button
                className="add-module-button"
                onClick={handleAddModule}
              >
                + Add Module
              </button>
            )}
          </>
        )}

      </div>

      {/* ✅ Inline CSS */}
      <style>{`
  .course-detail {
    min-height: 100vh;
    background: #f8fafc;
    padding: 32px 24px;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* TWO COLUMN LAYOUT - MORE SPECIFIC SELECTOR */
  /* TWO COLUMN LAYOUT - MORE SPECIFIC SELECTOR */
  .course-header-section {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    align-items: stretch;
    min-height: 220px;
    /* overflow-x: auto; REMOVED */
    padding-bottom: 0px;
  }

  .course-image-card {
    flex: 1; /* 25% */
    min-width: 0;
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #e2e8f0;
  }

  .course-details-card {
    flex: 3; /* 75% */
    min-width: 0;
    min-height: 100%;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px; /* Ultra reduced padding */
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    position: relative;
  }

  .image-upload-button {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 8px 16px;
    background-color: #9B1C36;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 12px;
    box-shadow: 0 2px 8px rgba(155, 28, 54, 0.2);
    transition: all 0.3s ease;
    z-index: 5;
  }

  .image-upload-button:hover {
    background-color: #7a1628;
    box-shadow: 0 4px 12px rgba(155, 28, 54, 0.3);
  }

  .course-title {
    font-size: 28px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    line-height: 1.2;
    flex: 1;
  }

  .course-desc {
    font-size: 18px;
    color: #64748b;
    margin-top: 0;
    line-height: 1.6;
    font-weight: 400;
  }

  .course-meta {
    margin-top: 16px;
    font-size: 15px;
    color: #475569;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .menu-container {
    position: relative;
    flex-shrink: 0;
    margin-left: 16px;
  }

  .menu-button {
    background: transparent;
    border: 1px solid #e2e8f0;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 18px;
    color: #64748b;
    transition: all 0.2s ease;
  }

  .menu-button:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  .menu-dropdown {
    position: absolute;
    top: 32px;
    right: 0;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    list-style: none;
    padding: 4px 0;
    margin: 0;
    width: 160px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }

  .menu-dropdown li {
    padding: 8px 14px;
    cursor: pointer;
    font-size: 13px;
    color: #334155;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .menu-dropdown li:hover {
    background: #f1f5f9;
    color: #0f172a;
  }

  .edit-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 0;
  }

  .edit-input, .edit-textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: inherit;
    font-size: 13px;
    color: #0f172a;
    background: #f8fafc;
    transition: all 0.2s ease;
  }

  .edit-input:focus, .edit-textarea:focus {
    outline: none;
    border-color: #9B1C36;
    background: #fff;
    box-shadow: 0 0 0 2px rgba(155, 28, 54, 0.1);
  }

  .edit-textarea {
    min-height: 80px;
    resize: vertical;
  }

  .modules-container {
    margin-top: 40px;
  }

        .loading-text, .error-text {
          text-align: center;
          padding: 40px;
          font-size: 15px;
          color: #64748b;
          font-weight: 500;
        }

        .error-text {
          color: #dc2626;
        }

        .add-module-button {
          width: 100%;
          padding: 16px;
          margin-top: 16px;
          background: #f8fafc;
          border: 2px dashed #e2e8f0;
          border-radius: 10px;
          color: #64748b;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-module-button:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #334155;
        }

        /* PREMIUM UI STYLES */
        .course-info-grid-3-col {
          margin-top: 20px;
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr; /* About gets slightly more */
          gap: 16px;
        }

        .info-block {
          background: #f8fafc;
          padding: 24px;
          border-radius: 12px;
          border-left: 5px solid #3b82f6;
          box-shadow: 0 2px 4px rgba(0,0,0,0.03);
        }

        .section-heading {
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #64748b;
          margin-bottom: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .about-text {
          color: #334155;
          font-size: 16px;
          line-height: 1.7;
          margin: 0;
          font-weight: 400;
        }

        .combined-info-card {
          flex: 2; /* Double width */
          min-width: 0;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          overflow-y: auto;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }

        .info-section {
          padding-bottom: 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .info-content-grid {
          display: flex;
          gap: 24px;
        }

        .info-subsection {
          flex: 1;
        }
          height: auto; /* Let it stretch */
          /* max-height: 300px; REMOVED */
          /* overflow-y: auto; REMOVED */
        }

        .hover-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 12px -3px rgba(0, 0, 0, 0.1);
          border-color: #94a3b8;
        }

        .about-block {
          border-left: 4px solid #3b82f6;
          background: #f8fafc;
        }

        .info-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          height: 100%;
        }

        .info-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.08);
        }

        .learnings-card {
          border-top: 5px solid #10b981;
        }

        .outcomes-card {
          border-top: 5px solid #8b5cf6;
        }

        .card-heading {
          font-size: 20px;
          color: #1e293b;
          margin-bottom: 24px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: #f1f5f9;
          border-radius: 10px;
          font-size: 22px;
        }

        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .feature-list li {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          color: #475569;
          font-size: 15px;
          line-height: 1.6;
          font-weight: 500;
        }

        .check-icon {
          color: #10b981;
          font-weight: 800;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .star-icon {
          color: #8b5cf6;
          font-weight: 800;
          margin-top: 2px;
          font-size: 16px;
          flex-shrink: 0;
        }

        .mindmap-button {
          margin-top: 20px;
          display: inline-flex;
          width: auto;
          padding: 10px 20px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.3);
          font-size: 14px;
          font-weight: 600;
        }

        .mindmap-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 12px -3px rgba(99, 102, 241, 0.4);
          filter: brightness(1.1);
        }  @media (max-width: 1024px) {
    .course-detail > div[style*="display: flex"] {
      flex-direction: column !important;
      gap: 20px !important;
    }

    .course-image-card, .course-details-card {
      flex: 1 !important;
      width: 100%;
    }

    .course-image-card {
      height: 280px;
    }

    .course-details-card {
      height: auto;
      padding: 28px;
    }
  }

  @media (max-width: 768px) {
    .course-detail {
      padding: 16px 12px;
    }
    
    .course-title {
      font-size: 20px;
    }

    .course-image-card {
      height: 200px;
    }

    .course-details-card {
      height: auto;
      padding: 20px;
    }
  }
`}</style>


    </div>
  );
}
