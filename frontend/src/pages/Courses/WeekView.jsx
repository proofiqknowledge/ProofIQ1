import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import DayItem from "./DayItem";
import WeekManageModal from "./WeekManageModal";
import CourseTopicEdit from "../../components/CourseTopicEdit";
import DeleteConfirmationModal from "../../components/DeleteConfirmationModal";

import {
  getWeekDetails,
  deleteDayFromWeek,
  updateModuleName,
  reorderDays
} from "../../services/courseService";
import { toast } from "react-toastify";
import batchService from '../../services/batchService';
import examService from '../../services/examService';
import api from '../../services/api';

export default function WeekView({ weekNumber: propWeekNumber, module: propModule }) {
  const { id: courseId, weekNumber: urlWeekNumber } = useParams();
  const weekNumber = propWeekNumber || urlWeekNumber;
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isTrainerOrAdmin = ["trainer", "admin", "master"].includes(user?.role?.toLowerCase());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trainerBatchId, setTrainerBatchId] = useState(null);

  // DnD State
  const [draggedTopicIndex, setDraggedTopicIndex] = useState(null);

  // Delete confirm modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);

  // Topic Delete confirm modal state
  const [showTopicDeleteModal, setShowTopicDeleteModal] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState(null);

  // States for NextTopicsExams component
  const [courseData, setCourseData] = useState(null);
  const [studentProgress, setStudentProgress] = useState(null);

  // placeholders: local frontend-only placeholders created by admin via + Create Exam
  const [placeholders, setPlaceholders] = useState([]);
  // mapping placeholderId -> created exam (after admin creates exam in AdminExamsPage)
  const [createdExamsByPlaceholder, setCreatedExamsByPlaceholder] = useState({});

  useEffect(() => {
    const loadWeekDetails = async () => {
      try {
        setLoading(true);
        const data = await getWeekDetails(courseId, weekNumber);

        // ⭐ If module prop is provided (from parent CourseDetail), use its exams (which has isCompleted)
        if (propModule && propModule.exams) {
          data.exams = propModule.exams;
        }

        setWeekData(data);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load module details");
      } finally {
        setLoading(false);
      }
    };
    loadWeekDetails();

    // Fetch course data and progress for NextTopicsExams
    const fetchCourseDataAndProgress = async () => {
      try {
        const [courseRes, progressRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get(`/courses/${courseId}/progress`),
        ]);
        setCourseData(courseRes.data);
        setStudentProgress(progressRes.data);
      } catch (err) {
        console.error('Error fetching course data or progress:', err);
      }
    };
    fetchCourseDataAndProgress();

    // Listen for progress updates to refresh and show newly unlocked content
    const progressHandler = () => {
      loadWeekDetails();
      fetchCourseDataAndProgress();
    };
    window.addEventListener('courseProgressUpdated', progressHandler);

    // Listen for examCreated event so we can replace placeholder with created exam info
    const examCreatedHandler = (e) => {
      try {
        const detail = e.detail || {};
        const { exam, placeholderId, courseId: evCourseId, weekNumber: evWeekNumber } = detail;
        // Only handle if it matches this course and week (if provided)
        if (exam && (!evCourseId || evCourseId === courseId) && (!evWeekNumber || Number(evWeekNumber) === Number(weekNumber))) {
          if (placeholderId) {
            setCreatedExamsByPlaceholder(prev => ({ ...prev, [placeholderId]: exam }));
            // remove the placeholder after a short delay to allow UX
            setTimeout(() => {
              setPlaceholders(prev => prev.filter(p => p.id !== placeholderId));
            }, 800);
          } else {
            // if no placeholderId, just clear all placeholders and optionally show toast
            setPlaceholders([]);
          }
          // update exam list / week details if needed
          loadWeekDetails();
        }
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('examCreated', examCreatedHandler);

    return () => {
      window.removeEventListener('courseProgressUpdated', progressHandler);
      window.removeEventListener('examCreated', examCreatedHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, weekNumber]);

  useEffect(() => {
    // Fetch trainer batches to determine which batch to use for trainer analytics
    const loadTrainerBatch = async () => {
      try {
        if (!isTrainerOrAdmin || !user || (user.role || '').toLowerCase() !== 'trainer') return;
        const batches = await batchService.getTrainerBatches();
        const matching = (batches || []).find(b => String(b.course?._id || b.course) === String(courseId));
        if (matching) setTrainerBatchId(matching._id);
      } catch (err) {
        // ignore failures; not critical
      }
    };
    loadTrainerBatch();
  }, [courseId, user, isTrainerOrAdmin]);

  const handleAddDay = () => {
    setShowAddModal(true);
  };

  const handleDeleteDay = (dayNumber) => {
    setTopicToDelete({ dayNumber });
    setShowTopicDeleteModal(true);
  };

  const confirmDeleteTopic = async () => {
    if (!topicToDelete) return;
    const { dayNumber } = topicToDelete;

    try {
      await deleteDayFromWeek(courseId, weekNumber, dayNumber);
      const updatedData = await getWeekDetails(courseId, weekNumber);
      setWeekData(updatedData);
      toast.success("Topic deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete topic");
    } finally {
      setShowTopicDeleteModal(false);
      setTopicToDelete(null);
    }
  };

  const handleWeekUpdate = async (updatedWeek) => {
    setWeekData(updatedWeek);
    toast.success("Week updated successfully");
  };

  const handleTopicUpdate = (updatedWeek) => {
    setWeekData(prevData => ({
      ...prevData,
      ...updatedWeek
    }));
  };


  // === Drag and Drop Handlers ===
  const handleDragStart = (e, index) => {
    setDraggedTopicIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault(); // allow drop
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, droppedIndex) => {
    e.preventDefault();
    if (draggedTopicIndex === null || draggedTopicIndex === droppedIndex) return;

    // Create copy of days
    const newDays = [...weekData.days];
    // Remove dragged item
    const [draggedItem] = newDays.splice(draggedTopicIndex, 1);
    // Insert at new position
    newDays.splice(droppedIndex, 0, draggedItem);

    // Optimistic update
    setWeekData(prev => ({ ...prev, days: newDays }));

    try {
      const newDayIds = newDays.map(d => d._id);
      await reorderDays(courseId, weekNumber, newDayIds);
      toast.success("Topics reordered");
    } catch (err) {
      toast.error("Failed to save new order");
      // Revert on failure (reload data)
      const data = await getWeekDetails(courseId, weekNumber);
      setWeekData(data);
    } finally {
      setDraggedTopicIndex(null);
    }
  };


  // === Create Exam placeholder flow ===
  const handleCreateExamPlaceholder = () => {
    const id = `ph_${Date.now()}`;
    setPlaceholders(prev => [...prev, { id, title: "New Exam" }]);
    // optional: scroll into view or focus; kept simple
  };

  const handlePlaceholderClick = (placeholderId) => {
    // Navigate to Admin create exam page with query params so AdminExamsPage opens create form
    const params = new URLSearchParams();
    params.set("create", "1");
    params.set("placeholderId", placeholderId);
    params.set("courseId", courseId);
    params.set("weekNumber", String(weekNumber));
    navigate(`/admin/exams?${params.toString()}`);
  };

  const handleCreatedExamClick = (examId) => {
    if (["admin", "master"].includes(user?.role?.toLowerCase())) {
      navigate(`/admin/exams/${examId}`, { state: { from: location.pathname } });
      return;
    }
    if (user?.role?.toLowerCase() === 'trainer') {
      if (trainerBatchId) {
        navigate(`/trainer/exams/${examId}/analytics?batchId=${trainerBatchId}`);
      } else {
        navigate(`/trainer/exams/${examId}/analytics`);
      }
      return;
    }
    navigate(`/exams/${examId}/take`);
  };

  const handleStudentExamClick = async (exam) => {
    try {
      if (!exam) return;
      if (weekData?.isLocked) {
        toast.warning('This exam is locked. Please complete previous modules to unlock.');
        return;
      }

      // ⭐ Use _id from API response (module exams) or examId (legacy)
      const examId = exam._id || exam.examId;

      if (["admin", "master"].includes(user?.role?.toLowerCase())) {
        navigate(`/admin/exams/${examId}`, { state: { from: location.pathname } });
        return;
      }
      if (user?.role?.toLowerCase() === 'trainer') {
        if (trainerBatchId) {
          navigate(`/trainer/exams/${examId}/analytics?batchId=${trainerBatchId}`);
        } else {
          navigate(`/trainer/exams/${examId}/analytics`);
        }
        return;
      }
      // STUDENT flow: depending on status
      if (!exam.status || exam.status === 'not_started') {
        await examService.startExam(examId);
        navigate(`/exams/${examId}/take`);
        return;
      }
      if (exam.status === 'in_progress') {
        navigate(`/exams/${examId}/take`);
        return;
      }
      if (exam.status === 'submitted' || exam.status === 'graded') {
        navigate(`/exams/${examId}/result`);
        return;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open exam');
    }
  };

  const handleDeleteExam = (examId, examTitle) => {
    setExamToDelete({ id: examId, title: examTitle });
    setShowDeleteModal(true);
  };

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;

    try {
      await examService.deleteExam(examToDelete.id);
      toast.success('Exam deleted successfully');

      // Refresh the week data to update exam list
      const data = await getWeekDetails(courseId, weekNumber);
      if (propModule && propModule.exams) {
        // Filter out the deleted exam from parent module data
        data.exams = propModule.exams.filter(e => e._id !== examToDelete.id);
      }
      setWeekData(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete exam');
    } finally {
      setShowDeleteModal(false);
      setExamToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="week-view loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="week-view">
      <div className="week-header">
        {isTrainerOrAdmin && (
          <>
            <button className="btn-add-day" onClick={handleAddDay}>
              + Add Topic
            </button>

            {/* NEW: Create Exam button placed next to Add Topic (Option A) */}
            {!weekData?.exam && user?.role?.toLowerCase() === "admin" && (
              <button
                className="btn-create-exam"
                onClick={() => {
                  const params = new URLSearchParams();
                  params.set("create", "1");
                  params.set("courseId", courseId);
                  params.set("weekNumber", String(weekNumber));
                  navigate(`/admin/exams?${params.toString()}`);
                }}
              >
                Create Exam
              </button>
            )}

          </>
        )}
      </div>

      <div className="days-list">
        {/* render existing days */}
        {Array.isArray(weekData?.days) && weekData.days.map((day, index) => {
          const isLocked = day.isLocked && !isTrainerOrAdmin;
          const isCompleted = !!day.isCompleted;
          return (
            <div
              key={day.dayNumber}
              className="day-container"
              draggable={isTrainerOrAdmin}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                opacity: draggedTopicIndex === index ? 0.5 : 1,
                cursor: isTrainerOrAdmin ? 'grab' : 'default',
                transition: 'all 0.2s ease'
              }}
            >
              <div
                className={`day-link ${isLocked ? 'locked' : ''}`}
                onClick={() => {
                  if (isLocked) {
                    toast.warning(day.isLocked ? "Complete previous topics to unlock this content" : "This content is locked");
                    return;
                  }
                  try {
                    navigate(`/courses/${courseId}/week/${weekNumber}/day/${day.dayNumber}`);
                  } catch (err) {
                    console.error('Navigation error to day view:', err);
                  }
                }}
                style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
              >
                <DayItem
                  dayNumber={day.dayNumber}
                  title={day.title}
                  isLocked={isLocked}
                  isCompleted={isCompleted}
                  onEditName={isTrainerOrAdmin ? () => {
                    setEditingDay(day);
                    setShowEditNameModal(true);
                  } : undefined}
                />
              </div>
              {isTrainerOrAdmin && weekData.days.length > 1 && (
                <button
                  className="btn-delete-day"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDay(day.dayNumber);
                  }}
                  title="Delete Day"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
        {/* render module exams (returned by API) */}
        {Array.isArray(weekData?.exams) && weekData.exams.map((ex) => {
          // Check if all videos (days) are completed to unlock the exam
          const allVideosCompleted = Array.isArray(weekData?.days)
            ? weekData.days.every(d => d.isCompleted)
            : true;

          // Lock if videos incomplete and user is student
          const isExamLocked = !isTrainerOrAdmin && !allVideosCompleted;

          return (
            <div key={ex.examId || ex._id} className="day-container">
              <div
                className={`day-link exam ${ex.status ? ex.status : ''} ${isExamLocked ? 'locked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isExamLocked) {
                    toast.warning("🔒 Please complete all topic videos in this module to unlock the exam.");
                    return;
                  }
                  handleStudentExamClick(ex);
                }}
                style={{ cursor: isExamLocked ? 'not-allowed' : 'pointer' }}
              >
                <DayItem
                  dayNumber={''}
                  title={ex.title || 'Module Exam'}
                  isLocked={isExamLocked} // ⭐ Pass calculated lock status
                  isCompleted={ex.isCompleted || false}
                  isExam={true}
                  onEditName={undefined}
                />
                {/* Exam action overlay */}
                {!isTrainerOrAdmin && !isExamLocked && (
                  <div className="exam-action">
                    {ex.status === 'not_started' && (
                      <button className="btn-start" onClick={(ev) => { ev.stopPropagation(); handleStudentExamClick(ex); }}>Start</button>
                    )}
                    {ex.status === 'in_progress' && (
                      <button className="btn-start" onClick={(ev) => { ev.stopPropagation(); handleStudentExamClick(ex); }}>Continue</button>
                    )}
                    {(ex.status === 'submitted' || ex.status === 'graded') && (
                      <button className="btn-start" onClick={(ev) => { ev.stopPropagation(); handleStudentExamClick(ex); }}>View</button>
                    )}
                  </div>
                )}

                {/* Show locked overlay if locked */}
                {!isTrainerOrAdmin && isExamLocked && (
                  <div className="exam-action">
                    <span style={{ fontSize: '0.8rem', color: '#92400e', background: 'rgba(254, 243, 199, 0.9)', padding: '4px 8px', borderRadius: '4px', border: '1px solid #fbbf24', fontWeight: '600' }}>
                      🔒 Locked
                    </span>
                  </div>
                )}

                {/* Delete button for admins */}
                {user?.role?.toLowerCase() === 'admin' && (
                  <button
                    className="btn-delete-day"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteExam(ex._id || ex.examId, ex.title);
                    }}
                    title="Delete Exam"
                    style={{ position: 'absolute', top: '10px', right: '10px' }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {/* Claim button is rendered by WeekAccordion (module accordion) to avoid duplication */}
      </div>

      {
        showAddModal && (
          <WeekManageModal
            courseId={courseId}
            weekNumber={weekNumber}
            onClose={() => setShowAddModal(false)}
            onSuccess={handleWeekUpdate}
          />
        )
      }

      {
        showEditNameModal && editingDay && (
          <CourseTopicEdit
            topic={editingDay}
            courseId={courseId}
            weekNumber={weekNumber}
            onUpdate={handleTopicUpdate}
            onClose={() => {
              setShowEditNameModal(false);
              setEditingDay(null);
            }}
          />
        )
      }

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setExamToDelete(null);
        }}
        onConfirm={confirmDeleteExam}
        title="Delete Exam"
        message="Are you sure you want to delete this exam? This will remove it for all students and trainers. This action cannot be undone."
        itemName={examToDelete?.title}
      />

      <DeleteConfirmationModal
        isOpen={showTopicDeleteModal}
        onClose={() => {
          setShowTopicDeleteModal(false);
          setTopicToDelete(null);
        }}
        onConfirm={confirmDeleteTopic}
        title="Delete Topic"
        message={`Are you sure you want to delete Topic ${topicToDelete?.dayNumber || ''}? This action cannot be undone.`}
        itemName={`Topic ${topicToDelete?.dayNumber || ''}`}
      />

      <style>{`
        .week-view {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 18px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
        }
        .week-header {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 14px;
          gap: 8px;
          align-items: center;
        }
        .btn-add-day {
          background: linear-gradient(90deg, #00bfa6, #009882);
          color: #052225;
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .btn-add-day:hover {
          transform: translateY(-1px);
        }
        .btn-create-exam:hover {
          transform: translateY(-1px);
        }
        .days-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }
        .day-container {
          position: relative;
        }
        .day-link {
          text-decoration: none;
        }
        .day-link.placeholder {
          opacity: 0.98;
        }
        .day-link.exam {
          outline: 2px solid rgba(99, 102, 241, 0.06);
          border-radius: 8px;
        }
        .day-link.exam .day-item {
          background: linear-gradient(180deg, #fff7ed, #fffaf0);
        }
        .day-link .exam-action {
          position: absolute;
          right: 12px;
          top: 12px;
          display: flex;
          gap: 8px;
        }
        .day-link .exam-action .btn-start {
          padding: 6px 10px;
          border-radius: 8px;
          border: none;
          background: #3b82f6;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.85rem;
        }
        .btn-delete-day {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 2;
        }
        .day-container:hover .btn-delete-day {
          opacity: 1;
        }
        @media (max-width: 600px) {
          .week-view {
            padding: 14px;
          }
          .btn-add-day, .btn-create-exam {
            padding: 5px 10px;
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  );
}
