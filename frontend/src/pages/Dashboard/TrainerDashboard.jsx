import React, { useEffect, useState, useRef } from 'react';
import { useTrainerManagement } from '../../hooks/useTrainerManagement';
import {
  FaUpload, FaUsers, FaBook, FaChalkboardTeacher,
  FaFileAlt, FaVideo, FaTrash, FaSpinner, FaChartLine, FaPlus,
  FaPlay, FaEye, FaTimes, FaSyncAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function TrainerDashboard() {
  console.log('TrainerDashboard rendering');  // Debug log

  const {
    loading,
    error,
    batches,
    selectedBatch,
    batchStudents,
    courseContent,
    trainerCourses,
    fetchTrainerBatches,
    fetchBatchStudents,
    proposeContent,
    fetchCourseContent,
    fetchTrainerCourses,
    getStudentProgress
  } = useTrainerManagement();

  // UI state
  const [activeTab, setActiveTab] = useState('batches');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [uploadingContent, setUploadingContent] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});
  const [studentProgress, setStudentProgress] = useState({});
  const [preview, setPreview] = useState({ show: false, type: null, url: null });
  const [contentProposal, setContentProposal] = useState({
    show: false,
    courseId: null,
    weekId: null,
    dayId: null,
    file: null,
    description: ''
  });
  const [progressLoading, setProgressLoading] = useState({});
  const [lastRefreshed, setLastRefreshed] = useState({});

  // Propose course UI state (modal)
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDesc, setProposalDesc] = useState('');
  const [proposalWeeks, setProposalWeeks] = useState(0);
  const [proposing, setProposing] = useState(false);
  const [pendingProposals, setPendingProposals] = useState([]);

  const prevProposalsRef = useRef([]);

  useEffect(() => {
    console.log('Initial data fetch');  // Debug log
    fetchTrainerBatches();
    fetchTrainerCourses();
  }, [fetchTrainerBatches, fetchTrainerCourses]);

  useEffect(() => {
    if (activeTab === 'content' && selectedCourse) {
      fetchCourseContent(selectedCourse);
    }
  }, [activeTab, selectedCourse, fetchCourseContent]);

  // Poll visible student progress entries periodically while they are open
  useEffect(() => {
    const keys = Object.keys(studentProgress || {});
    if (!keys.length) return; // nothing visible

    const id = setInterval(() => {
      const currentKeys = Object.keys(studentProgress || {});
      currentKeys.forEach(k => {
        const [studentId, courseId] = k.split('_');
        if (studentId && courseId) {
          fetchStudentProgress(studentId, courseId, true);
        }
      });
    }, 15000); // poll every 15s

    return () => clearInterval(id);
  }, [studentProgress]);


  useEffect(() => {
    if (!selectedCourse && batches && batches.length) {
      const firstWithCourse = batches.find(b => b.course && b.course._id);
      if (firstWithCourse) {
        setSelectedCourse(firstWithCourse.course._id);
      }
    }
  }, [batches, selectedCourse]);

  // Listen for global updates from admin actions
  useEffect(() => {
    const onCoursesUpdated = () => {
      fetchTrainerBatches();
      fetchCourseContent(selectedCourse);
    };
    const onProposalUpdated = () => fetchPendingProposals();

    window.addEventListener('coursesUpdated', onCoursesUpdated);
    window.addEventListener('proposalUpdated', onProposalUpdated);
    // Listen for student progress events (if same browser/session)
    const onCourseProgressUpdated = (ev) => {
      try {
        const detail = ev?.detail || {};
        const studentId = detail.studentId || detail.userId || null;
        const courseId = detail.courseId || null;
        if (!studentId || !courseId) return;

        const key = `${studentId}_${courseId}`;
        // If the event included the student's dashboard payload, prefer that (fast UI update)
        const dashboard = detail.dashboard || null;
        if (dashboard && dashboard.courses && Array.isArray(dashboard.courses)) {
          const c = dashboard.courses.find(x => x.courseId === courseId || x.course?._id === courseId || x.courseId?._id === courseId || String(x.courseId) === String(courseId));
          if (c) {
            // Build a normalized progress object similar to what getStudentProgress returns
            const normalized = {
              course: {
                title: c.title || c.course?.title || 'Course progress',
                totalModules: Number.isFinite(Number(c.totalModules)) ? Number(c.totalModules) : (Array.isArray(c.weeks) ? c.weeks.reduce((a, w) => a + (Array.isArray(w.days) ? w.days.length : 0), 0) : undefined)
              },
              watchedCount: Number.isFinite(Number(c.watchedCount)) ? Number(c.watchedCount) : (Array.isArray(c.completedmodules) ? c.completedmodules.length : (Array.isArray(c.completedWeeks) ? c.completedWeeks.length : 0)),
              completionPercent: typeof c.percentCompleted === 'number' ? c.percentCompleted : (typeof c.percent === 'number' ? c.percent : undefined),
              completedWeeks: Array.isArray(c.completedWeeks) ? c.completedWeeks : (Array.isArray(c.completedmodules) ? c.completedmodules : undefined),
              examsSummary: c.examsSummary || undefined,
              lastActivity: c.lastActivity || c.lastWatchedAt || undefined,
            };

            // Only update if the card is visible OR always update so trainer sees latest
            if (studentProgress && Object.prototype.hasOwnProperty.call(studentProgress, key)) {
              setStudentProgress(prev => ({ ...prev, [key]: normalized }));
              setLastRefreshed(prev => ({ ...prev, [key]: Date.now() }));
            } else {
              // If not visible, still cache it so when trainer opens it will show updated values
              setStudentProgress(prev => ({ ...prev, [key]: normalized }));
              setLastRefreshed(prev => ({ ...prev, [key]: Date.now() }));
            }
            return;
          }
        }

        // Only refresh cards that are currently visible/open in trainer dashboard
        if (studentProgress && Object.prototype.hasOwnProperty.call(studentProgress, key)) {
          // force refresh the visible card
          fetchStudentProgress(studentId, courseId, true);
        }
      } catch (err) {
        console.warn('Failed handling courseProgressUpdated in trainer dashboard', err);
      }
    };
    window.addEventListener('courseProgressUpdated', onCourseProgressUpdated);
    return () => {
      window.removeEventListener('coursesUpdated', onCoursesUpdated);
      window.removeEventListener('proposalUpdated', onProposalUpdated);
      window.removeEventListener('courseProgressUpdated', onCourseProgressUpdated);
    };
  }, [fetchTrainerBatches, fetchCourseContent, selectedCourse]);

  const fetchPendingProposals = async () => {
    try {
      const res = await api.get('/course-proposals/trainer/proposals');
      const latest = res.data || [];

      // notify trainer if any proposal status changed since last poll
      const prev = prevProposalsRef.current || [];
      latest.forEach((p) => {
        const prevP = prev.find(x => x._id === p._id);
        if (prevP && prevP.status !== p.status) {
          if (p.status === 'approved') {
            toast.success(`Your course proposal "${p.title}" was approved`);
          } else if (p.status === 'rejected') {
            toast.info(`Your course proposal "${p.title}" was rejected`);
          }
        }
      });

      prevProposalsRef.current = latest;
      setPendingProposals(latest);
    } catch (err) {
      console.error('Error fetching pending proposals:', err);
      // don't spam trainer with toasts on background polling if 404; show once
    }
  };

  const handleBatchSelect = async (id) => {
    await fetchBatchStudents(id);
    setStudentProgress({});

    const batch = batches?.find(b => b._id === id);
    if (batch?.course?._id) {
      setSelectedCourse(batch.course._id);
      if (activeTab === 'content') {
        fetchCourseContent(batch.course._id);
      }
    } else {
      setSelectedCourse(null);
    }
  };

  const handleProposeContent = (courseId, weekId, dayId) => {
    setContentProposal({
      show: true,
      courseId,
      weekId,
      dayId,
      file: null,
      description: ''
    });
  };

  const handleFileSelect = (file) => {
    // Validate file type
    const allowedDocTypes = ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedDocTypes.includes(ext)) {
      toast.error(`Invalid document type. Allowed types: ${allowedDocTypes.join(', ')}`);
      return;
    }

    // Validate file size (20MB for documents)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size: 20MB`);
      return;
    }

    setContentProposal(prev => ({ ...prev, file }));
  };

  const handlePreview = async (type, fileUrl) => {
    if (!fileUrl) {
      toast.error('Content URL not available');
      return;
    }

    setPreview({
      show: true,
      type,
      url: fileUrl
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await proposeCourseContent(payload);
      toast.success(res.message || "Proposal submitted successfully!");
      setShowModal(false);
    } catch (err) {
      console.error("Proposal error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to submit proposal");
    }
  };

  // ✅ Handles the trainer's content proposal submission
  const handleSubmitProposal = async (e) => {
    e?.preventDefault();

    console.log('📋 handleSubmitProposal called with contentProposal:', contentProposal);

    if (!contentProposal.courseId) {
      toast.error('No course selected');
      return;
    }

    if (!contentProposal.file) {
      toast.error('Please select a document to upload');
      return;
    }

    if (!contentProposal.description.trim()) {
      toast.error('Please provide a description');
      return;
    }

    try {
      const result = await proposeContent(
        contentProposal.courseId,
        contentProposal.weekId,
        contentProposal.dayId,
        contentProposal.file,
        contentProposal.description
      );

      console.log('📤 proposeContent result:', result);

      if (result?.success) {
        toast.success('Content proposal submitted successfully');
        setContentProposal({
          show: false,
          courseId: null,
          weekId: null,
          dayId: null,
          file: null,
          description: ''
        });
        // Notify admin dashboard to refresh
        window.dispatchEvent(new Event('proposalUpdated'));
      } else {
        toast.error(result?.error || 'Failed to submit proposal');
      }
    } catch (err) {
      console.error('Proposal error:', err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to submit proposal');
    }
  };


  const handleUpload = async (courseId, weekId, dayId) => {
    if (!selectedFiles.video && !selectedFiles.document) {
      toast.warning('Please select at least one file to upload');
      return;
    }

    setUploadingContent({ courseId, weekId, dayId });
    const success = await uploadContent(courseId, weekId, dayId, selectedFiles);
    if (success) {
      toast.success('Content uploaded successfully');
      fetchCourseContent(courseId);
      setSelectedFiles({});
    } else {
      toast.error('Upload failed');
    }
    setUploadingContent({});
  };

  const handleDeleteContent = async (courseId, weekId, dayId, contentType) => {
    const success = await deleteContent(courseId, weekId, dayId, contentType);
    if (success) {
      toast.success(`${contentType} deleted successfully`);
      fetchCourseContent(courseId);
    } else {
      toast.error('Delete failed');
    }
  };

  const fetchStudentProgress = async (studentId, courseId, force = false) => {
    try {
      const key = `${studentId}_${courseId}`;

      // Toggle visibility when already loaded unless force-refresh requested
      if (!force && !progressLoading[key] && studentProgress[key]) {
        setStudentProgress(prev => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
        return;
      }

      setProgressLoading(prev => ({ ...prev, [key]: true }));

      const progress = await getStudentProgress(studentId, courseId);

      console.debug('[TrainerDashboard] raw progress response for', key, progress);

      setProgressLoading(prev => ({ ...prev, [key]: false }));

      if (progress) {
        // Normalize response and compute completion percent if missing
        const normalized = { ...progress };
        try {
          const prog = progress.progress || {};
          const courseInfo = progress.course || {};

          const totalModulesFromCourse = Number.isFinite(Number(courseInfo.totalModules)) ? Number(courseInfo.totalModules) : 0;
          const watchedFromProg = Number.isFinite(Number(prog.watchedCount)) ? Number(prog.watchedCount) : (Array.isArray(prog.completedWeeks) ? prog.completedWeeks.length : (Array.isArray(progress.completedmodules) ? progress.completedmodules.length : 0));

          let computedPercent = 0;
          if (Number.isFinite(Number(prog.completionPercent))) {
            computedPercent = Number(prog.completionPercent);
          } else if (totalModulesFromCourse > 0) {
            computedPercent = Math.round((watchedFromProg / totalModulesFromCourse) * 100);
          } else if (prog.totalTopics > 0 && prog.completedTopics >= 0) {
            computedPercent = Math.round((prog.completedTopics / Math.max(1, prog.totalTopics)) * 100);
          }

          // Ensure numeric and bounded
          computedPercent = Math.max(0, Math.min(100, Number.isFinite(Number(computedPercent)) ? Number(computedPercent) : 0));

          // Inject normalized fields consistently
          normalized.progress = {
            ...prog,
            watchedCount: watchedFromProg,
            totalModules: totalModulesFromCourse,
            completionPercent: computedPercent
          };
          normalized.course = {
            ...courseInfo,
            totalModules: totalModulesFromCourse
          };
        } catch (e) {
          console.warn('Normalization failed for progress payload', e);
        }

        console.debug('[TrainerDashboard] normalized progress for', key, normalized);

        setStudentProgress(prev => ({
          ...prev,
          [key]: normalized
        }));
        setLastRefreshed(prev => ({ ...prev, [key]: Date.now() }));

        // If backend didn't provide totalModules, try to fetch course schema and derive it
        const hasTotalModules = Number.isFinite(Number(progress.totalModules)) && Number(progress.totalModules) > 0;
        if (!hasTotalModules) {
          try {
            const courseResp = await api.get(`/courses/${courseId}`);
            const courseData = courseResp.data || {};
            let derivedTotal = 0;
            if (Array.isArray(courseData.weeks) && courseData.weeks.length) {
              derivedTotal = courseData.weeks.reduce((acc, w) => acc + (Array.isArray(w.days) ? w.days.length : 0), 0);
            }
            if (derivedTotal > 0) {
              setStudentProgress(prev => ({
                ...prev,
                [key]: { ...prev[key], totalModules: derivedTotal }
              }));
            }
          } catch (err) {
            console.warn('Could not derive totalModules for course', courseId, err);
          }
        }
      } else {
        setStudentProgress(prev => {
          const copy = { ...prev };
          delete copy[key];
          return copy;
        });
        toast.error('Could not fetch student progress');
      }
    } catch (error) {
      console.error("Failed to fetch student progress:", error);
    }
  };


  // Propose course handler (trainer proposes a course; admin approves later)
  const handleProposeCourse = async (e) => {
    e.preventDefault();

    // Validate form
    const title = proposalTitle.trim();
    const totalWeeks = Number(proposalWeeks);

    if (!title) {
      toast.error('Course title is required');
      return;
    }
    if (title.length < 5) {
      toast.error('Course title must be at least 5 characters');
      return;
    }
    if (!totalWeeks || totalWeeks < 1) {
      toast.error('Please specify total weeks (minimum 1)');
      return;
    }

    setProposing(true);
    try {
      const payload = {
        title,
        description: proposalDesc ? proposalDesc.trim() : '',
        totalWeeks
      };
      const res = await api.post('/course-proposals/propose', payload);
      toast.success(res.data?.message || 'Course proposal submitted successfully!');
      setShowProposeModal(false);
      setProposalTitle('');
      setProposalDesc('');
      setProposalWeeks(0);
      fetchPendingProposals();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to propose course';
      toast.error(msg);
    } finally {
      setProposing(false);
    }
  };

  if (loading) {
    return (
      <div className="td-loading">
        <FaSpinner className="td-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="td-error">
        <h2>Something went wrong</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="td-root">
      <header className="td-header">
        <div className="td-title">
          <h1>Dashboard</h1>
          <p className="td-sub">Manage batches, students and course content</p>
        </div>

        <div className="td-actions">
          <nav className="td-tabs">
            <button
              className={`tab-btn ${activeTab === 'batches' ? 'active' : ''}`}
              onClick={() => setActiveTab('batches')}
              aria-pressed={activeTab === 'batches'}
            >
              <FaUsers /> <span>My Batches</span>
            </button>

            <button
              className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
              onClick={() => setActiveTab('content')}
              aria-pressed={activeTab === 'content'}
            >
              <FaBook /> <span>Course Content</span>
            </button>
          </nav>

        </div>
      </header>

      <main className="td-main">
        {/* BATCHES VIEW */}
        {activeTab === 'batches' && (
          <section className="td-grid">
            <div className="card card-batches">
              <div className="card-head">
                <h2><FaChalkboardTeacher /> Your Batches</h2>
                <span className="muted">{batches?.length ?? 0}</span>
              </div>

              <div className="list">
                {batches && batches.length > 0 ? (
                  batches.map(batch => (
                    <button
                      key={batch._id}
                      className={`list-item ${selectedBatch === batch._id ? 'selected' : ''}`}
                      onClick={() => handleBatchSelect(batch._id)}
                    >
                      <div>
                        <div className="item-title">{batch.name}</div>
                        <div className="item-sub muted">{(batch.students?.length ?? 0) + ' students'}</div>
                      </div>
                      <div className="chev" />
                    </button>
                  ))
                ) : (
                  <div className="empty">No batches assigned yet</div>
                )}
              </div>
            </div>

            <div className="card card-students">
              <div className="card-head">
                <h2><FaUsers /> Students</h2>
                <span className="muted">{batchStudents?.length ?? 0}</span>
              </div>

              <div className="stack">
                {selectedBatch ? (
                  batchStudents.map(student => (
                    <div key={student._id} className="student">
                      <div className="student-meta">
                        <div className="student-name">{student.name}</div>
                        <div className="student-email muted">{student.email}</div>
                      </div>

                      <div className="student-actions">
                        <button
                          className="btn-ghost"
                          onClick={() => fetchStudentProgress(student._id, selectedCourse, true)}
                        >
                          <FaChartLine /> Progress
                        </button>
                      </div>

                      {(() => {
                        const progressKey = `${student._id}_${selectedCourse}`;
                        const isLoading = progressLoading[progressKey];
                        const data = studentProgress[progressKey];

                        if (isLoading) {
                          return (
                            <div className="progress-card loading">
                              <FaSpinner className="spin" />
                            </div>
                          );
                        }

                        if (!data) return null;

                        // Robust normalization: support multiple API shapes returned by progress endpoints
                        const prog = data.progress || data; // some endpoints return { progress: {...} }

                        const courseObj = data.course || data.course || {};

                        const totalModules = Number.isFinite(Number(courseObj.totalModules))
                          ? Number(courseObj.totalModules)
                          : (Number.isFinite(Number(data.totalModules)) ? Number(data.totalModules) : 0);

                        const totalTopics = Number.isFinite(Number(prog.totalTopics)) ? Number(prog.totalTopics) : (Number.isFinite(Number(data.totalTopics)) ? Number(data.totalTopics) : 0);

                        const completedTopics = Number.isFinite(Number(prog.completedTopics)) ? Number(prog.completedTopics) : (Number.isFinite(Number(data.completedTopics)) ? Number(data.completedTopics) : 0);

                        // Try to determine modules watched. Match student dashboard priority:
                        // prefer explicit watchedCount, then completedmodules, then completedWeeks,
                        // then fall back to topic-based estimates.
                        let modulesWatched = 0;
                        if (Number.isFinite(Number(prog.watchedCount))) {
                          modulesWatched = Number(prog.watchedCount);
                        } else if (Number.isFinite(Number(data.watchedCount))) {
                          modulesWatched = Number(data.watchedCount);
                        } else if (Array.isArray(prog.completedmodules) && prog.completedmodules.length) {
                          modulesWatched = prog.completedmodules.length;
                        } else if (Array.isArray(data.completedmodules) && data.completedmodules.length) {
                          modulesWatched = data.completedmodules.length;
                        } else if (Array.isArray(prog.completedWeeks) && prog.completedWeeks.length) {
                          modulesWatched = prog.completedWeeks.length;
                        } else if (Array.isArray(data.completedWeeks) && data.completedWeeks.length) {
                          modulesWatched = data.completedWeeks.length;
                        } else if (totalTopics > 0 && totalModules > 0) {
                          // estimate modules from topics ratio
                          modulesWatched = Math.round((completedTopics / Math.max(totalTopics, 1)) * totalModules);
                        } else if (completedTopics > 0 && totalTopics === 0) {
                          // fallback to showing topics as the watched count
                          modulesWatched = completedTopics;
                        }

                        modulesWatched = Math.max(0, modulesWatched || 0);
                        const remaining = totalModules > 0 ? Math.max(totalModules - modulesWatched, 0) : 0;

                        const completedWeeksCount = Array.isArray(prog.completedWeeks) ? prog.completedWeeks.length : (Array.isArray(data.completedWeeks) ? data.completedWeeks.length : (Array.isArray(data.completedmodules) ? data.completedmodules.length : 0));

                        const lastActivityStr = prog.lastActivity ? new Date(prog.lastActivity).toLocaleDateString() : (data.lastActivity ? new Date(data.lastActivity).toLocaleDateString() : (prog.lastWatchedAt ? new Date(prog.lastWatchedAt).toLocaleDateString() : (data.lastWatchedAt ? new Date(data.lastWatchedAt).toLocaleDateString() : 'Not yet')));

                        const completion = Number.isFinite(Number(prog.completionPercent)) ? Number(prog.completionPercent) : (Number.isFinite(Number(data.completion)) ? Number(data.completion) : (totalModules > 0 ? Math.round((modulesWatched / totalModules) * 100) : (totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0)));

                        const refreshedAt = lastRefreshed[`${student._id}_${selectedCourse}`];
                        const refreshedStr = refreshedAt ? new Date(refreshedAt).toLocaleString() : null;

                        return (
                          <div className="progress-card">
                            <div className="progress-card__header">
                              <div>
                                <span className="progress-card__eyebrow">Progress Overview</span>
                                <h4 className="progress-card__title">
                                  {data.course?.title || 'Course progress'}
                                </h4>
                              </div>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button
                                  className="btn-icon"
                                  title="Refresh progress"
                                  onClick={() => fetchStudentProgress(student._id, selectedCourse, true)}
                                >
                                  <FaSyncAlt />
                                </button>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                  <span className="progress-card__percent">{completion}%</span>
                                  <span className="progress-card__lastref">{refreshedStr ? `Last refreshed ${refreshedStr}` : ''}</span>
                                </div>
                              </div>
                            </div>

                            <div className="progress-card__bar">
                              <div
                                className="progress-card__bar-fill"
                                style={{ width: `${completion}%` }}
                              />
                            </div>

                            <div className="progress-card__stats">
                              <div className="stat-chip">
                                <span className="stat-chip__label">Topics watched</span>
                                <span className="stat-chip__value">
                                  {totalModules > 0 ? `${modulesWatched} / ${totalModules}` : `${completedTopics}${totalTopics ? ` / ${totalTopics} topics` : ''}`}
                                </span>
                              </div>
                              <div className="stat-chip">
                                <span className="stat-chip__label">Remaining</span>
                                <span className="stat-chip__value">
                                  {remaining}
                                </span>
                              </div>
                              <div className="stat-chip">
                                <span className="stat-chip__label">Completed modules</span>
                                <span className="stat-chip__value">
                                  {completedWeeksCount > 0 ? completedWeeksCount : 'None'}
                                </span>
                              </div>
                              <div className="stat-chip">
                                <span className="stat-chip__label">Last activity</span>
                                <span className="stat-chip__value">
                                  {lastActivityStr}
                                </span>
                              </div>
                            </div>

                            {data.examsSummary && (
                              <div className="progress-card__footer">
                                <div>
                                  <span className="progress-card__footer-label">Exams attempted</span>
                                  <strong>{data.examsSummary.attempted}</strong>
                                </div>
                                <div>
                                  <span className="progress-card__footer-label">Green</span>
                                  <strong style={{ color: '#2ECC71' }}>{data.examsSummary.green || 0}</strong>
                                </div>
                                <div>
                                  <span className="progress-card__footer-label">Amber</span>
                                  <strong style={{ color: '#F39C12' }}>{data.examsSummary.amber || 0}</strong>
                                </div>
                                <div>
                                  <span className="progress-card__footer-label">Red</span>
                                  <strong style={{ color: '#E74C3C' }}>{data.examsSummary.red || 0}</strong>
                                </div>
                                {data.examsSummary.lastAttempt && (
                                  <div>
                                    <span className="progress-card__footer-label">Last exam</span>
                                    <strong>
                                      {new Date(data.examsSummary.lastAttempt).toLocaleDateString()}
                                    </strong>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))
                ) : (
                  <div className="empty">Select a batch to view students</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CONTENT VIEW */}
        {activeTab === 'content' && (
          <section className="td-grid">
            <div className="card card-content" style={{ gridColumn: '1 / -1' }}>
              <div className="card-head">
                <h2><FaBook /> Course Content Management</h2>
                <span className="muted">Select a course to manage content</span>
              </div>

              <div className="courses-grid">
                <div className="courses-list">
                  <h3>Assigned Courses</h3>
                  <div className="courses">
                    {console.log('Courses render state:', { loading, error, courses: trainerCourses })}
                    {loading ? (
                      <div className="loading-courses">
                        <FaSpinner className="spin" /> Loading courses...
                      </div>
                    ) : error ? (
                      <div className="error-message">
                        {error}
                      </div>
                    ) : !trainerCourses?.length ? (
                      <div className="empty">No courses assigned yet</div>
                    ) : (
                      trainerCourses.map(course => (
                        <button
                          key={course._id}
                          className={`course-item ${selectedCourse === course._id ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedCourse(course._id);
                            fetchCourseContent(course._id);
                          }}
                        >
                          <div className="course-title">{course.title}</div>
                          <div className="course-meta muted">{course.totalWeeks} weeks</div>
                        </button>
                      )))}
                  </div>
                </div>

                <div className="course-content">
                  {selectedCourse ? (
                    <div className="selected-course-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{courseContent?.title || 'Selected Course'}</div>
                          {courseContent?.description && (
                            <div className="muted" style={{ marginTop: 6 }}>{courseContent.description}</div>
                          )}
                        </div>

                        <div>
                          <button
                            className="btn-propose-content"
                            onClick={() => handleProposeContent(selectedCourse, null, null)}
                            disabled={proposing}
                          >
                            <FaPlus /> Propose Content
                          </button>
                        </div>
                      </div>

                      <div style={{ marginTop: 18 }}>
                        <h4 style={{ margin: 0, marginBottom: 8 }}>Course Content Overview</h4>
                        <div className="muted small">This view is simplified for trainers — use "Propose Content" to submit documents for admin approval. Admin will add approved content to specific weeks/days.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-course-content">
                      <div className="card-head">
                        <h2><FaBook /> Course Content</h2>
                        <span className="muted">Select a course to manage content</span>
                      </div>

                      <div className="pending-proposals">
                        <h3>Pending Course Proposals</h3>
                        {pendingProposals && pendingProposals.length ? (
                          <ul className="proposal-list">
                            {pendingProposals.map(p => (
                              <li key={p._id}>
                                <div className="proposal-title">{p.title}</div>
                                <div className="muted small">{p.weeks} weeks • {new Date(p.createdAt).toLocaleDateString()}</div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="empty">No pending proposals</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>


      {/* Content Preview Modal */}
      {preview.show && (
        <div className="modal-backdrop" onClick={() => setPreview({ show: false, type: null, url: null })}>
          <div className="modal preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{preview.type === 'document' ? 'Document Preview' : 'Video Preview'}</h3>
              <button className="close" onClick={() => setPreview({ show: false, type: null, url: null })}>
                <FaTimes />
              </button>
            </div>
            <div className="modal-body preview-content">
              {preview.type === 'document' ? (
                <iframe
                  src={preview.url}
                  title="Document Preview"
                  width="100%"
                  height="600px"
                  style={{ border: 'none' }}
                />
              ) : (
                <video
                  src={preview.url}
                  controls
                  style={{ width: '100%', maxHeight: '600px' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content Proposal Modal */}
      {contentProposal.show && (
        <div className="modal-backdrop" onClick={() => setContentProposal(prev => ({ ...prev, show: false }))}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Propose Content</h3>
              <button className="close" onClick={() => setContentProposal(prev => ({ ...prev, show: false }))}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-body">
              <div className="field">
                <div className="label">Document *</div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="input"
                />
                {contentProposal.file && (
                  <div className="file-preview">
                    <FaFileAlt /> {contentProposal.file.name}
                  </div>
                )}
              </div>

              <div className="field">
                <div className="label">Description *</div>
                <textarea
                  value={contentProposal.description}
                  onChange={(e) => setContentProposal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Explain what this content covers and why it's relevant for this day"
                  className="input"
                  rows={4}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-muted"
                  onClick={() => setContentProposal(prev => ({ ...prev, show: false }))}
                >
                  Cancel
                </button>
                <button onClick={handleSubmitProposal} className="btn-primary">
                  Submit
                </button>



              </div>
            </div>
          </div>
        </div>
      )}      {/* Styles (modern & responsive) */}
      <style>{`
:root {
  --bg: #f4f6f8;
  --card: #ffffff;
  --muted: #6b7280;
  --teal: #00bfa6;
  --teal-dark: #009882;
  --accent: #e6fffa;
  --border: #e6e9ee;
}

* { box-sizing: border-box; }
body { margin: 0; }

.td-root {
  min-height: 100vh;
  background: var(--bg);
  padding: 24px;
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  color: #0f172a;
}

/* ---------- Header ---------- */
.td-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
}
.td-title h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
.td-sub { margin: 0; color: var(--muted); font-size: 0.95rem; }
.td-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.tab-btn {
  flex: 1;
  min-width: 160px;
  max-width: 180px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  white-space: nowrap; /* Prevents text wrapping */
  overflow: hidden;
  text-overflow: ellipsis;
  border-radius: 10px;
  border: 2px solid transparent;
  background: #f9fafb;
  color: #374151;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;

  transition: all 0.25s ease;
  box-shadow: 0 2px 6px rgba(16, 24, 40, 0.05);
}
.tab-btn:hover {
  background: #eefdfb;
  border-color: var(--teal);
  color: var(--teal-dark);
}
.tab-btn.active {
  background: linear-gradient(90deg, var(--teal), var(--teal-dark));
  color: #fff;
  border-color: var(--teal-dark);
  box-shadow: 0 4px 10px rgba(0, 191, 166, 0.25);
  transform: translateY(-1px);
}

.btn-propose {
  display: flex;
  gap: 8px;
  align-items: center;
  background: linear-gradient(90deg, var(--teal), var(--teal-dark));
  color: #052225;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(0,191,166,0.15);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
.btn-propose:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0,191,166,0.25);
}
 .td-tabs {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
}

/* ---------- Main Grid ---------- */
.td-main { margin-top: 12px; }
.td-grid {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 24px;
  align-items: start;
}
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 18px;
  box-shadow: 0 4px 18px rgba(16,24,40,0.05);
  transition: box-shadow 0.2s ease;
}
.card:hover { box-shadow: 0 6px 22px rgba(16,24,40,0.08); }
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.card-head h2 {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.muted { color: var(--muted); }

/* ---------- Lists ---------- */
.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 64vh;
  overflow-y: auto;
  padding-right: 6px;
}
.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.18s ease;
}
.list-item:hover {
  background: #fbfffe;
  border-color: rgba(0,191,166,0.1);
}
.list-item.selected {
  background: var(--accent);
  border-color: rgba(0,191,166,0.3);
  box-shadow: 0 6px 18px rgba(0,191,166,0.08);
}
.item-title { font-weight: 700; }
.item-sub { font-size: 0.9rem; color: var(--muted); margin-top: 4px; }

/* ---------- Students ---------- */
.stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 64vh;
  overflow-y: auto;
  padding-right: 6px;
}
.student {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  background: #fcfeff;
  border: 1px solid var(--border);
}
.student-meta { display: flex; flex-direction: column; gap: 4px; }
.student-name { font-weight: 700; }
.student-email { color: var(--muted); font-size: 0.95rem; }
.student-actions { display: flex; gap: 8px; align-items: center; }
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: #0f172a;
  display: flex;
  gap: 8px;
  align-items: center;
  transition: all 0.15s ease;
}
.btn-ghost:hover {
  background: #f9fafb;
  box-shadow: 0 4px 10px rgba(16,24,40,0.05);
}

/* ---------- Student Progress ---------- */
.progress-card {
  background: linear-gradient(135deg, rgba(0,191,166,0.12), rgba(5,34,37,0.08));
  border: 1px solid rgba(0,191,166,0.25);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 10px 24px rgba(15, 82, 67, 0.12);
  animation: fadeIn 0.2s ease;
}
.progress-card.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  background: rgba(255,255,255,0.65);
  border: 1px dashed rgba(0,191,166,0.35);
  box-shadow: none;
}
.spin {
  animation: spin 0.8s linear infinite;
  font-size: 1.4rem;
  color: var(--teal-dark);
}

.progress-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.progress-card__eyebrow {
  display: inline-block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(5,34,37,0.65);
  font-weight: 700;
}
.progress-card__title {
  margin: 4px 0 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #052225;
}
.progress-card__percent {
  font-size: 1.6rem;
  font-weight: 800;
  color: #052225;
  background: rgba(255,255,255,0.6);
  border-radius: 10px;
  padding: 6px 12px;
  min-width: 68px;
  text-align: center;
}

.progress-card__lastref {
  font-size: 0.78rem;
  color: var(--muted);
  margin-top: 6px;
  font-weight: 600;
}

.progress-card__bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.5);
  overflow: hidden;
}
.progress-card__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--teal), var(--teal-dark));
  border-radius: inherit;
  transition: width 0.25s ease;
}

.progress-card__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}
.stat-chip {
  background: rgba(255,255,255,0.65);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border: 1px solid rgba(5,34,37,0.08);
}
.stat-chip__label {
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(5,34,37,0.55);
  font-weight: 700;
}
.stat-chip__value {
  font-size: 0.98rem;
  font-weight: 700;
  color: #052225;
}

.progress-card__footer {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
  background: rgba(255,255,255,0.55);
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(5,34,37,0.08);
}
.progress-card__footer-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(5,34,37,0.6);
}
.progress-card__footer strong {
  display: block;
  color: #052225;
  font-size: 1rem;
  font-weight: 700;
  margin-top: 2px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---------- Modal ---------- */
.modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6,8,10,0.35);
  z-index: 60;
  padding: 12px;
  backdrop-filter: blur(2px);
}
.modal {
  width: 100%;
  max-width: 700px;
  background: var(--card);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--border);
  box-shadow: 0 12px 40px rgba(16,24,40,0.12);
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.modal-head h3 { font-size: 1.2rem; font-weight: 700; margin: 0; }
.close {
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
}
.modal-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-weight: 700; color: #0f172a; }
.input, textarea {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  color: #0f172a;
  font-size: 0.95rem;
}
textarea {
  resize: vertical;
  min-height: 80px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
.btn-muted {
  background: #f3f4f6;
  border: 1px solid var(--border);
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-muted:hover { background: #e5e7eb; }
.btn-primary {
  background: linear-gradient(90deg, var(--teal), var(--teal-dark));
  color: #052225;
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-weight: 700;
  transition: transform 0.15s ease;
}
.btn-primary:hover { transform: translateY(-1px); }

/* ---------- Course Content Grid ---------- */
.courses-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  margin-top: 20px;
  min-height: 400px;
}

.selected-course-content {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
}

.empty-course-content {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  text-align: center;
}

.week {
  margin-bottom: 24px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.week-head {
  padding: 12px 16px;
  background: #f8fafc;
  font-weight: 600;
  border-bottom: 1px solid var(--border);
}

.days {
  padding: 16px;
}

.day {
  margin-bottom: 16px;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.day-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.day-title {
  font-weight: 600;
}

.day-actions {
  display: flex;
  gap: 8px;
}

.small-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: #fff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.small-btn.video {
  color: #2563eb;
  border-color: #bfdbfe;
}

.small-btn.doc {
  color: #059669;
  border-color: #a7f3d0;
}

.small-btn.upload {
  color: #0f172a;
  background: #f8fafc;
}

.courses-list {
  background: #f8fafc;
  border-radius: 8px;
  padding: 16px;
}

.courses-list h3 {
  margin: 0 0 12px;
  font-size: 1rem;
}

.courses {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 200px;
}

.loading-courses {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  color: var(--muted);
  font-size: 0.9rem;
}

.loading-courses .spin {
  animation: spin 1s linear infinite;
}

.error-message {
  padding: 12px;
  color: #dc2626;
  background: #fee2e2;
  border-radius: 6px;
  font-size: 0.9rem;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.course-item {
  background: white;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.course-item:hover {
  background: var(--accent);
  border-color: var(--teal);
}

.course-item.selected {
  background: var(--accent);
  border-color: var(--teal);
  box-shadow: 0 4px 12px rgba(0,191,166,0.12);
}

.course-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.course-meta {
  font-size: 0.9rem;
}

.btn-propose-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px dashed var(--teal);
  background: var(--accent);
  color: var(--teal-dark);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-propose-content:hover {
  background: #d1faf4;
  border-color: var(--teal-dark);
}

.btn-propose-content:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.file-preview {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--accent);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--teal-dark);
}

.btn-icon {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s ease;
}

.btn-icon:hover {
  color: var(--teal);
}

.content-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--accent);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.preview-modal {
  max-width: 1000px;
}

.preview-content {
  margin: 0 -20px -20px;
  background: #f1f5f9;
  padding: 20px;
  border-radius: 0 0 12px 12px;
}

.upload-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 6px;
  font-size: 0.9rem;
  color: var(--muted);
}

/* ---------- Responsive ---------- */
@media (max-width: 1024px) {
  .td-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .td-header { flex-direction: column; align-items: flex-start; }
  .btn-propose { width: 100%; justify-content: center; }
  .td-grid { gap: 16px; }
  .card { padding: 14px; }
  .progress-card__stats { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 600px) {
  .td-tabs {
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .tab-btn {
    width: 100%;
    justify-content: center;
    font-size: 0.95rem;
    padding: 12px;
  }
}
      `}</style>
    </div>
  );
}
