import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import examService from "../services/examService";
import resultService from "../services/resultService";
import { toast } from "react-toastify";
import { Shield, AlertTriangle, Maximize2, Clock, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { COLORS } from '../constants/designSystem';
import { runCode as runSimpleCode, runSampleTests, submitFinalCode } from "../services/judgeService";
import Editor from '@monaco-editor/react';

// ✅ Custom scrollbar styles for test cases
const scrollbarStyles = `
  .test-cases-scroll::-webkit-scrollbar {
    height: 8px;
  }
  .test-cases-scroll::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
  }
  .test-cases-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  .test-cases-scroll::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = scrollbarStyles;
  document.head.appendChild(styleSheet);
}

// ✅ Watermark Overlay Component
const WatermarkOverlay = ({ email, name }) => {
  const text = email || name || 'CONFIDENTIAL';
  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'short',
    timeStyle: 'short'
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: 9998,
      overflow: 'hidden'
    }}>
      {Array.from({ length: 30 }).map((_, i) => {
        const row = Math.floor(i / 6);
        const col = i % 6;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${row * 20 - 10}%`,
              left: `${col * 20 - 10}%`,
              transform: 'rotate(-45deg)',
              fontSize: '1rem',
              fontWeight: '700',
              color: 'rgba(100, 116, 139, 0.4)',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              fontFamily: 'monospace',
              letterSpacing: '1.5px'
            }}
          >
            {text}<br />
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{timestamp}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function ExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const studentId = user?._id || user?.id;
  const [exam, setExam] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [violations, setViolations] = useState(0);
  const [showWarningOverlay, setShowWarningOverlay] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [showInitialFullscreenPrompt, setShowInitialFullscreenPrompt] = useState(false);
  const [examReady, setExamReady] = useState(false);
  const [schedulingStatus, setSchedulingStatus] = useState('active'); // 'not-started', 'active', 'expired'
  const [schedulingDetails, setSchedulingDetails] = useState(null);
  const violationsRef = useRef(0);
  const keyboardViolationsRef = useRef(0);
  const cheatingLogsRef = useRef([]);
  const fullscreenEnteredRef = useRef(false);
  const examStartedRef = useRef(false);
  const submittingRef = useRef(false);
  const handleSubmitExamRef = useRef(null);
  const monitoringActiveRef = useRef(false);
  const autoCheatingDetectedRef = useRef(false);
  const unreportedTimeRef = useRef(0); // ✅ NEW: Track unreported time
  const screenDetailsRef = useRef(null); // ✅ NEW: Multi-screen detection
  const [lastViolationType, setLastViolationType] = useState("fullscreen");
  // ✅ Mettl-style navigation
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStatuses, setQuestionStatuses] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState(new Set());
  // ------------------------
  // Coding IDE States
  // ------------------------
  const [runResult, setRunResult] = useState(null);             // For raw RUN CODE output
  const [sampleResults, setSampleResults] = useState([]);       // For sample testcases
  const [finalResults, setFinalResults] = useState([]);         // For final hidden tests

  const [running, setRunning] = useState(false);                // Run Code button loader
  const [runningSamples, setRunningSamples] = useState(false);  // Run Test Cases loader
  const [runningFinalTests, setRunningFinalTests] = useState(false); // Final test loader
  const [submittingCode, setSubmittingCode] = useState(false);

  // ✅ FIX: Debounce utility for auto-saving coding answers
  const debounceTimers = useRef({});
  // Screen Wake Lock Reference
  const wakeLockRef = useRef(null);

  const debounce = (func, delay) => {
    return (...args) => {
      const key = args[0]; // questionId
      clearTimeout(debounceTimers.current[key]);
      debounceTimers.current[key] = setTimeout(() => func(...args), delay);
    };
  };
  // Initialize answers from submission or exam
  const initAnswers = () => {
    if (submission) {
      const map = {};
      (exam?.questions || []).forEach((q, i) => {
        const qid = getQuestionId(q, i);
        // Find existing answer in submission
        const answer = (submission.answers || []).find((a) => {
          const aId = String(a.questionId);
          return aId === qid;
        });

        if (q.type === "coding") {
          // ✅ FIX: Priority: Saved Code > Boilerplate > Empty String
          // We use 'boilerplate' as default if no code was ever saved
          // This ensures 'No code submitted' doesn't happen for untouched questions
          const savedCode = answer ? (answer.code || answer.source) : null;
          map[qid] = {
            code: savedCode !== null && savedCode !== undefined ? savedCode : (q.boilerplate || ""),
            language: (answer && answer.language) || q.language || "javascript"
          };
        } else if (q.type === "mcq") {
          map[qid] = answer?.selectedOption !== undefined ? answer.selectedOption : null;
        } else if (q.type === "theory") {
          map[qid] = answer?.textAnswer || "";
        }
      });
      return map;
    }
    const map = {};
    (exam?.questions || []).forEach((q, i) => {
      const id = getQuestionId(q, i);
      if (q.type === "coding") {
        map[id] = { code: q.boilerplate || "", language: q.language || "javascript" };
      } else {
        map[id] = null;
      }
    });
    return map;
  };

  // Get question ID consistently (support both custom id and _id)
  const getQuestionId = (q, index) => {
    if (!q) return String(index);
    return (q.id && q.id.toString()) || (q._id && q._id.toString()) || String(index);
  };


  const getQuestionById = (questionId) => {
    if (!exam?.questions) return null;
    const normalizedId = String(questionId);
    return (
      exam.questions.find((q, idx) => {
        const id = getQuestionId(q, idx);
        return id === normalizedId;
      }) || null
    );
  };

  // ✅ Initialize question statuses
  const initQuestionStatuses = () => {
    const statuses = {};
    (exam?.questions || []).forEach((q, idx) => {
      const qid = getQuestionId(q, idx);
      statuses[qid] = 'not-visited';
    });
    return statuses;
  };

  // ✅ Update question status
  const updateQuestionStatus = (qid, answer) => {
    setQuestionStatuses(prev => {
      if (prev[qid] === 'marked') return prev;
      const isAnswered = answer !== null && answer !== undefined && answer !== "";
      return { ...prev, [qid]: isAnswered ? 'answered' : 'not-answered' };
    });
  };

  // ✅ Mark for review
  const markForReview = () => {
    const q = exam?.questions[currentQuestionIndex];
    if (!q) return;
    const qid = getQuestionId(q, currentQuestionIndex);
    setQuestionStatuses(prev => ({
      ...prev,
      [qid]: prev[qid] === 'marked' ? 'not-answered' : 'marked'
    }));
  };

  // ✅ Navigation functions
  const goToQuestion = (index) => {
    if (index < 0 || index >= (exam?.questions?.length || 0)) return;
    const q = exam.questions[index];
    const qid = getQuestionId(q, index);
    setVisitedQuestions(prev => new Set([...prev, qid]));
    if (questionStatuses[qid] === 'not-visited') {
      setQuestionStatuses(prev => ({ ...prev, [qid]: 'not-answered' }));
    }
    setCurrentQuestionIndex(index);

    // ✅ Clear test execution results when navigating to a different question
    setRunResult(null);
    setSampleResults([]);
  };

  const goToNext = () => goToQuestion(currentQuestionIndex + 1);
  const goPrev = () => goToQuestion(currentQuestionIndex - 1);

  // Note: Re-entry prevention is enforced server-side; frontend will not use localStorage checks.

  // Load exam and submission
  useEffect(() => {
    const loadExam = async () => {
      try {
        setLoading(true);
        // First, call startExam to ensure submission exists and questionOrder is generated
        const startResponse = await examService.startExam(examId);
        const submissionData = startResponse?.data?.submission || startResponse?.submission;

        // ✅ Check if already submitted and redirect
        if (submissionData && ['submitted', 'graded', 'evaluated'].includes(submissionData.status)) {
          toast.info("You have already submitted this exam.");
          navigate(`/exams/${examId}/result`);
          setLoading(false);
          return;
        }

        // Then fetch exam details
        const examResponse = await examService.getExamById(examId);
        let examData = examResponse?.data || examResponse;

        // If a per-user questionOrder exists on the submission, reorder questions for the UI
        try {
          const qOrder = submissionData?.questionOrder;
          if (Array.isArray(qOrder) && qOrder.length && Array.isArray(examData?.questions)) {
            const ordered = [];
            qOrder.forEach((qid) => {
              // ✅ FIX: Don't use idx fallback during matching - only match by actual IDs
              // Using idx causes false matches and breaks shuffling
              const found = (examData.questions || []).find((q) => {
                const questionId = String(q.id || q._id || '');
                return questionId && questionId === String(qid);
              });
              if (found) {
                ordered.push(found);
              } else {
                console.warn('[FRONTEND DEBUG] Could not find question for qid:', qid);
              }
            });
            // Append any missing questions (fallback)
            if (ordered.length !== (examData.questions || []).length) {
              (examData.questions || []).forEach((q) => {
                const id = String(q.id || q._id || '');
                if (id && !ordered.find(o => String(o.id || o._id || '') === id)) {
                  console.warn('[FRONTEND DEBUG] Appending missing question:', q.title);
                  ordered.push(q);
                }
              });
            }
            examData = { ...examData, questions: ordered };
          }
        } catch (e) {
          console.warn('Failed to apply questionOrder on frontend:', e);
        }

        setExam(examData);
        setSubmission(submissionData);

        // ✅ Scheduling Enforcement Logic
        const now = new Date();
        const start = examData?.startDate ? new Date(examData.startDate) : null;
        const end = examData?.endDate ? new Date(examData.endDate) : null;

        setSchedulingDetails({ start, end });

        if (start && now < start) {
          setSchedulingStatus('not-started');
        } else if (end && now > end) {
          setSchedulingStatus('expired');
        } else {
          setSchedulingStatus('active');
        }

        // Initialize timer if exam has duration
        if (examData?.duration) {
          setTimeLeft(examData.duration * 60); // Convert minutes to seconds
        }
      } catch (err) {
        console.error('Error loading exam:', err);
        toast.error(err.response?.data?.message || "Failed to load exam");
        navigate("/exams");
      } finally {
        setLoading(false);
      }
    };

    if (examId) {
      loadExam();
    }
  }, [examId, navigate]);

  // Initialize answers when exam/submission loads
  useEffect(() => {
    if (exam) {
      setAnswers(initAnswers());
      // ✅ PHASE 4: Initialize question statuses and mark first question as visited
      setQuestionStatuses(initQuestionStatuses());
      goToQuestion(0);
    }
  }, [exam, submission]);

  // ✅ Screen Wake Lock: Prevent screen from sleeping
  useEffect(() => {
    if (!examReady) return;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock acquired');
        }
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    };

    const handleVisibilityChange = () => {
      // Re-acquire lock if page becomes visible again
      if (document.visibilityState === 'visible' && (!wakeLockRef.current || wakeLockRef.current.released)) {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(e => console.error(e));
        wakeLockRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [examReady]);

  // Activate anti-cheat immediately when exam loads
  useEffect(() => {
    if (exam && !monitoringActiveRef.current) {
      monitoringActiveRef.current = true;
    }
  }, [exam]);

  // Show initial fullscreen prompt when exam loads
  useEffect(() => {
    if (!loading && exam && !examStartedRef.current && schedulingStatus === 'active') {
      setShowInitialFullscreenPrompt(true);
    }
  }, [loading, exam, schedulingStatus]);

  // Monitor fullscreen exit
  useEffect(() => {
    if (!exam) return;
    // DISABLED FOR TESTING


    const handleFullscreenChange = () => {
      // Check if user exited fullscreen
      if (fullscreenEnteredRef.current && !document.fullscreenElement && !submittingRef.current && exam) {
        // Always count as violation when exiting fullscreen
        // push a cheating log for fullscreen exit
        try {
          cheatingLogsRef.current = cheatingLogsRef.current || [];
          cheatingLogsRef.current.push({ type: 'fullscreen-exit', details: 'User exited fullscreen', time: new Date() });
        } catch (e) {
          console.warn('Failed to push cheating log (fullscreen):', e);
        }
        if (violationsRef.current < 3) {
          violationsRef.current += 1;
          setViolations(violationsRef.current);
        }

        const currentViolations = violationsRef.current;

        if (currentViolations === 1) {
          setWarningMessage("⚠️ You exited fullscreen mode. This is your first violation. Please return to fullscreen immediately to continue the exam.");
          setShowWarningOverlay(true);
          toast.warning("Fullscreen exit detected (1/3 violations)");
        } else if (currentViolations === 2) {
          setWarningMessage("🚨 Final Warning: You exited fullscreen again. This is your second violation. One more violation will result in automatic submission of your exam.");
          setShowWarningOverlay(true);
          toast.error("Fullscreen exit detected (2/3 violations)");
        } else if (currentViolations >= 3) {
          // Immediately trigger auto-submit on 3rd violation
          setViolations(3);
          setShowWarningOverlay(false);
          toast.error("Too many fullscreen violations. Submitting exam automatically...");
          console.log('Fullscreen violations reached 3, triggering auto-submit immediately');

          // Force submit immediately
          if (handleSubmitExamRef.current) {
            handleSubmitExamRef.current().catch(err => {
              console.error('Error in fullscreen auto-submit:', err);
              toast.error("Auto-submit failed. Please submit manually.");
            });
          } else {
            console.error('handleSubmitExam not available in ref');
            setTimeout(() => {
              window.location.href = "/exams";
            }, 100);
          }
        }
      } else if (document.fullscreenElement && fullscreenEnteredRef.current) {
        // User returned to fullscreen, hide warning
        setShowWarningOverlay(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange, true);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange, true);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange, true);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange, true);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange, true);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange, true);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange, true);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange, true);
    };
  }, [exam]);

  // Hide sidebar and navbar by adding class to body
  useEffect(() => {
    document.body.classList.add('exam-mode');
    return () => {
      document.body.classList.remove('exam-mode');
    };
  }, []);

  // Prevent back button and page reload
  useEffect(() => {
    const handlePopState = (e) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
      toast.warning("You cannot navigate away during an exam");
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave? Your progress may be lost.";
      return e.returnValue;
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Comprehensive Anti-Cheat System
  useEffect(() => {
    if (!exam || loading || submittingRef.current) return;
    // DISABLED FOR TESTING

    // Helper function to handle keyboard violations (2 warnings then auto-submit)
    const handleKeyboardViolation = (reason) => {
      setLastViolationType("keyboard");
      // Prevent further violations if already submitting or if exam is null
      if (submittingRef.current || !exam) {
        console.log('Keyboard violation blocked:', { submitting: submittingRef.current, exam: !!exam });
        return;
      }

      // Only increment if not already at or above 3
      if (keyboardViolationsRef.current < 3) {
        keyboardViolationsRef.current += 1;
        // Keyboard violations also increase the shared violation count
        if (violationsRef.current < 3) {
          violationsRef.current += 1;
          setViolations(violationsRef.current);
        }
        console.log(`Keyboard violation recorded: ${reason}. Total: ${keyboardViolationsRef.current}/3`);

        // Push a cheating log for keyboard violation
        try {
          cheatingLogsRef.current = cheatingLogsRef.current || [];
          let type = 'keyboard-violation';
          const r = String(reason || '').toLowerCase();
          if (r.includes('copy') || r.includes('paste') || r.includes('cut')) type = 'copy-paste-blocked';
          if (r.includes('select')) type = 'select-all-blocked';
          cheatingLogsRef.current.push({ type, details: reason, time: new Date() });
        } catch (e) {
          console.warn('Failed to push cheating log (keyboard):', e);
        }
      }

      const currentKeyboardViolations = keyboardViolationsRef.current;

      if (currentKeyboardViolations === 1) {
        setWarningMessage(`⚠️ Warning: ${reason} This is your first keyboard violation.`);
        setShowWarningOverlay(true);
        toast.warning(`${reason} (1/3 keyboard violations)`);
      }
      else if (currentKeyboardViolations === 2) {
        setWarningMessage(`⚠️ Warning: ${reason} This is your first keyboard violation.`);
        setShowWarningOverlay(true);
        toast.warning(`${reason} (2/3 keyboard violations)`);
      }
      // Auto-submit after 3 violations
      // TEMPORARILY DISABLED FOR TESTING - RE-ENABLE AFTER FIXING HTML ENCODING BUG
      /*
      if (keyboardViolationsRef.current >= 3) {
        autoCheatingDetectedRef.current = true;
        setShowWarningOverlay(false);
        toast.error(`Too many keyboard violations detected. Submitting exam automatically...`);

        // Force submit immediately
        const submitExam = () => {
          if (handleSubmitExamRef.current) {
            console.log('Calling handleSubmitExam from ref (keyboard violation)');
            handleSubmitExamRef.current().catch(err => {
              console.error('Error in auto-submit:', err);
              toast.error("Auto-submit failed. Please submit manually.");
            });
          } else {
            console.error('handleSubmitExam not available in ref, trying fallback');
            setTimeout(() => {
              window.location.href = "/exams";
            }, 500);
          }
        };

        // Call immediately
        submitExam();
      }
      */
    };

    // Helper function to handle other violations (tab switch, window switch, etc.) - 3 warnings
    const handleViolation = (reason) => {
      setLastViolationType("fullscreen");
      // Prevent further violations if already submitting or if exam is null
      if (submittingRef.current || !exam) {
        console.log('Violation blocked:', { submitting: submittingRef.current, exam: !!exam });
        return;
      }

      // Only increment if not already at or above 3
      if (violationsRef.current < 3) {
        violationsRef.current += 1;
        setViolations(violationsRef.current);
        console.log(`Violation recorded: ${reason}. Total: ${violationsRef.current}/3`);

        // Push a cheating log for this violation
        try {
          cheatingLogsRef.current = cheatingLogsRef.current || [];
          let type = 'violation';
          const r = String(reason || '').toLowerCase();
          if (r.includes('tab')) type = 'tab-switch';
          if (r.includes('window') || r.includes('focus')) type = 'window-switch';
          if (r.includes('screenshot') || r.includes('print')) type = 'screenshot-attempt';
          cheatingLogsRef.current.push({ type, details: reason, time: new Date() });
        } catch (e) {
          console.warn('Failed to push cheating log (violation):', e);
        }
      }

      const currentViolations = violationsRef.current;

      if (currentViolations === 1) {
        setWarningMessage(`⚠️ Warning: ${reason} This is your first violation.`);
        setShowWarningOverlay(true);
        toast.warning(`${reason} (1/3 violations)`);
      } else if (currentViolations === 2) {
        setWarningMessage(`🚨 Final Warning: ${reason} This is your second violation. One more violation will result in automatic submission.`);
        setShowWarningOverlay(true);
        toast.error(`${reason} (2/3 violations)`);
      } else if (currentViolations >= 3) {
        autoCheatingDetectedRef.current = true;
        setViolations(3);
        setShowWarningOverlay(false);
        toast.error(`Too many violations detected. Submitting exam automatically...`);

        // Force submit immediately - use the same logic as fullscreen violations
        const submitExam = () => {
          if (handleSubmitExamRef.current) {
            console.log('Calling handleSubmitExam from ref');
            handleSubmitExamRef.current().catch(err => {
              console.error('Error in auto-submit:', err);
              toast.error("Auto-submit failed. Please submit manually.");
            });
          } else {
            console.error('handleSubmitExam not available in ref, trying fallback');
            // Force reload and redirect as last resort
            setTimeout(() => {
              window.location.href = "/exams";
            }, 500);
          }
        };

        // Call immediately, don't wait
        submitExam();
      }
    };

    // 1. Tab/Window Switch Detection
    const onVisibilityChange = () => {
      if (document.hidden && !submittingRef.current) {
        handleViolation("Tab switch detected.");
      }
    };

    const onBlur = () => {
      // Detect window switch, minimize, or focus loss
      if (!submittingRef.current) {
        setTimeout(() => {
          if (document.hidden && !submittingRef.current) {
            handleViolation("Window switch or minimize detected.");
          } else if (!document.hasFocus() && !submittingRef.current) {
            handleViolation("Window focus lost detected.");
          }
        }, 100);
      }
    };

    const onFocus = () => {
      // Check if window was minimized and restored
      if (!document.hidden && !submittingRef.current) {
        // This helps detect minimize/restore cycles
      }
    };

    // 2. Screenshot Detection
    const onKeyDown = (e) => {
      // PrintScreen key (keyCode 44)
      if (e.keyCode === 44 || e.key === 'PrintScreen' || e.key === 'Print') {
        e.preventDefault();
        e.stopPropagation();
        handleViolation("Screenshot attempt detected.");
        return false;
      }

      // Win+Shift+S (Snipping Tool) - detected via blur event
      if (e.key === 's' && e.shiftKey && (e.metaKey || (e.ctrlKey && navigator.platform.includes('Win')))) {
        e.preventDefault();
        e.stopPropagation();
        handleViolation("Screenshot tool detected.");
        return false;
      }

      // Alt+Tab detection
      if (e.key === 'Tab' && e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handleViolation("Alt+Tab detected.");
        return false;
      }

      // Alt+Space (Copilot trigger)
      if (e.key === ' ' && e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handleViolation("Alt+Space detected.");
        return false;
      }

      // Alt+F4
      if (e.key === 'F4' && e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handleViolation("Alt+F4 detected.");
        return false;
      }

      // 3. Shortcut Blocking: Ctrl+C, Ctrl+X, Ctrl+V
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        handleKeyboardViolation("Copy/Paste shortcuts blocked.");
        return false;
      }

      // Block Ctrl+A (select all) and Ctrl+P (print) outside text inputs
      if ((e.ctrlKey || e.metaKey) && ['a', 'p', 's'].includes(e.key.toLowerCase())) {
        const isTextInput = e.target.tagName === 'TEXTAREA' ||
          e.target.tagName === 'INPUT' ||
          e.target.isContentEditable;

        if (!isTextInput) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          if (e.key.toLowerCase() === 'a') {
            handleKeyboardViolation("Select all shortcut blocked.");
          } else {
            handleViolation("Print shortcut blocked.");
          }
          return false;
        }
      }

      // Block F12 and DevTools shortcuts
      if (e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.cancelBubble = true;
        handleViolation("Developer tools access blocked.");
        return false;
      }
    };

    // Prevent copy, cut, paste events - block everywhere during exam
    const onCopy = (e) => {
      // Block all copy operations during exam
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', '');
      }
      handleKeyboardViolation("Copy action blocked.");
      return false;
    };

    const onCut = (e) => {
      // Block all cut operations during exam
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', '');
      }
      handleKeyboardViolation("Cut action blocked.");
      return false;
    };

    const onPaste = (e) => {
      // Block all paste operations during exam
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', '');
      }
      handleKeyboardViolation("Paste action blocked.");
      return false;
    };

    // Block beforeinput event for copy/paste
    const onBeforeInput = (e) => {
      if (e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleKeyboardViolation("Paste action blocked.");
        return false;
      }
    };

    // Right-click context menu (screenshot menu prevention)
    const onContextMenu = (e) => {
      const isTextInput = e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'INPUT' ||
        e.target.isContentEditable;
      if (!isTextInput) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Detect Win+Shift+S via blur (Snipping Tool opens, window loses focus)
    window.addEventListener('blur', onBlur, true);
    window.addEventListener('focus', onFocus, true);
    document.addEventListener("visibilitychange", onVisibilityChange, true);

    // Add event listeners with capture phase for maximum blocking
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("copy", onCopy, true);
    document.addEventListener("cut", onCut, true);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("beforeinput", onBeforeInput, true);
    document.addEventListener("contextmenu", onContextMenu, true);

    // Also add window-level listeners for better blocking of keyboard shortcuts
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("copy", onCopy, true);
    window.addEventListener("cut", onCut, true);
    window.addEventListener("paste", onPaste, true);
    window.addEventListener("beforeinput", onBeforeInput, true);

    // Block clipboard API access
    let originalWriteText = null;
    let originalReadText = null;

    if (navigator.clipboard) {
      originalWriteText = navigator.clipboard.writeText;
      originalReadText = navigator.clipboard.readText;

      navigator.clipboard.writeText = function () {
        handleKeyboardViolation("Clipboard write blocked.");
        return Promise.reject(new Error("Clipboard access blocked during exam"));
      };

      navigator.clipboard.readText = function () {
        handleKeyboardViolation("Clipboard read blocked.");
        return Promise.reject(new Error("Clipboard access blocked during exam"));
      };
    }

    return () => {
      window.removeEventListener('blur', onBlur, true);
      window.removeEventListener('focus', onFocus, true);
      document.removeEventListener("visibilitychange", onVisibilityChange, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("beforeinput", onBeforeInput, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("copy", onCopy, true);
      window.removeEventListener("cut", onCut, true);
      window.removeEventListener("paste", onPaste, true);
      window.removeEventListener("beforeinput", onBeforeInput, true);

      // Restore clipboard API if it was modified
      if (navigator.clipboard && originalWriteText && originalReadText) {
        navigator.clipboard.writeText = originalWriteText;
        navigator.clipboard.readText = originalReadText;
      }
    };
  }, [exam, loading]);

  // ✅ NEW: Track active time spent (increment every second)
  useEffect(() => {
    if (!examReady || submittingRef.current) return;

    const timer = setInterval(() => {
      unreportedTimeRef.current += 1;
    }, 1000);

    return () => clearInterval(timer);
  }, [examReady]);

  // Answer handlers
  const handleChangeMCQ = (qid, choice) => {
    setAnswers((prev) => ({ ...prev, [qid]: choice }));
    updateQuestionStatus(qid, choice);
    saveAnswer(qid, { selectedOption: choice });  // correct
  };



  const handleChangeTheory = (qid, text) => {
    setAnswers((prev) => ({ ...prev, [qid]: text }));
    updateQuestionStatus(qid, text);
  };

  const handleChangeCoding = (qid, code) => {
    setAnswers((prev) => ({ ...prev, [qid]: { ...(prev[qid] || {}), code } }));
    updateQuestionStatus(qid, { code });

    // ✅ FIX: Enable auto-save while typing (Debounced)
    // This ensures that even if user doesn't click "Run", the code is saved to DB
    debouncedSaveCodingAnswer(qid, code);
  };

  const handleChangeLanguage = (qid, lang) => {
    setAnswers((prev) => ({ ...prev, [qid]: { ...(prev[qid] || {}), language: lang } }));
  };

  // Save answer to backend
  const saveAnswer = async (questionId, answer) => {
    try {
      // ✅ Get accumulated time and reset
      const timeSpent = unreportedTimeRef.current;
      unreportedTimeRef.current = 0;

      await examService.submitAnswer(examId, questionId, {
        ...answer,
        timeSpent // ✅ Send accumulated time
      });
    } catch (err) {
      console.error('Error saving answer:', err);
      // Don't show error toast for auto-save to avoid spam
    }
  };

  // ✅ FIX: Debounced save function for coding answers (2 second delay)
  const debouncedSaveCodingAnswer = useCallback(
    debounce((questionId, code) => {
      const answer = answers[questionId] || {};
      const question = getQuestionById(questionId);
      const language = answer.language || question?.language || 'javascript';

      console.log(`Auto-saving coding answer for question ${questionId}`);
      saveAnswer(questionId, {
        code: code,
        language: language,
        // ✅ FIX: Silent Auto-Save
        // Tell backend to skip Judge0 for this save request
        shouldSkipJudge: true
      });
    }, 2000),
    [answers, exam]
  );

  // Run code with Judge0 (client-side testing)
  const handleRunCode = async (question) => {
    const qIndex = exam.questions.indexOf(question);
    const qid = getQuestionId(question, qIndex);

    const val = answers[qid] || {};
    const source = val.code || question.boilerplate || "";
    const language = val.language || question.language || "javascript";

    try {
      setRunning(true);
      setRunResult(null);

      // ✅ CRITICAL FIX: Use submitFinalCode (runType: "all") to save submission to database
      // This ensures auto-submit can find the submission record and use test results
      const response = await submitFinalCode({
        examId: examId,
        questionId: question._id || qid,
        source,
        language,
        testCases: question.testCases || [],
        mainBlock: question.mainBlock || "",
      });

      setRunResult(response.submission);

      // ✅ NEW: Save this code as "last run code" with timestamp
      const now = new Date().toISOString();
      setAnswers((prev) => ({
        ...prev,
        [qid]: {
          ...(prev[qid] || {}),
          code: source,              // Current editor code
          lastRunCode: source,       // ✅ Code that was just tested
          lastRunTimestamp: now,     // ✅ When it was run
          lastRunResult: response.submission, // ✅ Test results
          language: language,
        }
      }));

      // ✅ Save to backend (only the run code, not editor content)
      await saveAnswer(qid, {
        code: source,
        language: language,
        lastRun: true,
        timestamp: now
      });

    } catch (err) {
      toast.error("Run failed: " + (err.message || "Unknown error"));
    } finally {
      setRunning(false);
    }
  };

  // Run sample tests
  const handleRunSampleTests = async (question) => {
    const qIndex = exam.questions.indexOf(question);
    const qid = getQuestionId(question, qIndex);

    const val = answers[qid] || {};
    const source = val.code || question.boilerplate || "";
    const language = val.language || question.language || "javascript";

    try {
      setRunningSamples(true);
      setSampleResults([]);

      const response = await runSampleTests({
        examId: examId,  // ✅ Send examId for session tracking
        questionId: question._id || qid,
        source,
        language,
        testCases: question.testCases || [],
        mainBlock: question.mainBlock || "",
      });

      setSampleResults(response.submission.results || []);
    } catch (err) {
      toast.error("Sample test run failed: " + (err.message || "Unknown error"));
    } finally {
      setRunningSamples(false);
    }
  };

  const handleSubmitCode = async (question) => {
    const qIndex = exam.questions.indexOf(question);
    const qid = getQuestionId(question, qIndex);

    const val = answers[qid] || {};
    const source = val.code || question.boilerplate || "";
    const language = val.language || question.language || "javascript";

    console.log("=== SUBMIT CODE DEBUG ===");
    console.log("Question ID:", qid);
    console.log("Answers object:", answers);
    console.log("Answer for this question:", val);
    console.log("Source code:", source);
    console.log("Language:", language);
    console.log("Test cases:", question.testCases);

    try {
      setSubmittingCode(true);
      setRunResult(null);

      const response = await submitFinalCode({
        examId: examId,  // ✅ Send examId for session tracking
        questionId: question._id || qid,
        source,
        language,
        testCases: question.testCases || [],
        mainBlock: question.mainBlock || "",
      });

      toast.success("Code submitted successfully!");
      setRunResult(response.submission);

      // CRITICAL: Update local state so the code is available when submitting the exam
      const now = new Date().toISOString();
      setAnswers((prev) => ({
        ...prev,
        [qid]: {
          ...(prev[qid] || {}),
          code: source,
          lastRunCode: source,           // ✅ Also track as last run code
          lastRunTimestamp: now,         // ✅ Timestamp
          lastRunResult: response.submission, // ✅ Test results
          language: language,
          submitted: true
        }
      }));

      // Save the answer as final
      saveAnswer(qid, {
        code: source,
        language: language,
        submitted: true,
        timestamp: now
      });
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Submit failed: " + (err.message || "Unknown error"));
    } finally {
      setSubmittingCode(false);
    }
  };

  // Timer auto-submit
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0 || submittingRef.current) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        // ✅ FIX: Save all coding answers when 30 seconds remain
        if (prev === 30) {
          // Move async operations outside setState to avoid React warnings
          setTimeout(() => {
            const codingQuestions = exam?.questions?.filter(q => q.type === 'coding') || [];
            codingQuestions.forEach(async (question) => {
              const qIndex = exam.questions.indexOf(question);
              const qid = getQuestionId(question, qIndex);
              const answer = answers[qid];

              if (answer && answer.code) {
                const language = answer.language || question.language || 'javascript';
                console.log(`30-second warning: Force-saving code for question ${qid}`);
                await saveAnswer(qid, {
                  code: answer.code,
                  language: language
                });
              }
            });
            toast.warning("⏰ 30 seconds remaining! Your code is being saved automatically.", { autoClose: 3000 });
          }, 0);
        }

        // ✅ NEW: Save all coding answers when 5 seconds remain (final safety net)
        if (prev === 5) {
          setTimeout(() => {
            const codingQuestions = exam?.questions?.filter(q => q.type === 'coding') || [];
            codingQuestions.forEach(async (question) => {
              const qIndex = exam.questions.indexOf(question);
              const qid = getQuestionId(question, qIndex);
              const answer = answers[qid];

              if (answer && answer.code) {
                const language = answer.language || question.language || 'javascript';
                console.log(`5-second warning: Final save for question ${qid}`);
                await saveAnswer(qid, {
                  code: answer.code,
                  language: language
                });
              }
            });
            toast.error("⏰ 5 seconds! Saving your work now...", { autoClose: 2000 });
          }, 0);
        }

        if (prev <= 1) {
          clearInterval(timer);  // ✅ Clear timer FIRST to prevent race condition
          autoCheatingDetectedRef.current = true;

          // Use setTimeout to ensure timer is fully cleared before submission
          setTimeout(() => {
            toast.error("Time's up! Submitting exam automatically.");
            if (handleSubmitExamRef.current) {
              handleSubmitExamRef.current();
            }
          }, 100);

          return 0;
        }
        if (prev === 301) { // Trigger at exactly 5 minutes remaining (300s) - using 301 because we return prev-1
          toast.warn(
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>⚠️ 5 Minutes Remaining!</span>
              <span>Please review your answers and ensure all code is run at least once.</span>
            </div>,
            {
              position: "top-center",
              autoClose: false,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              style: { border: '2px solid #ff9800', background: '#fff3e0', color: '#e65100' }
            }
          );
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // Submit exam - using useCallback to ensure stable reference
  const handleSubmitExam = useCallback(async () => {
    if (!exam || submittingRef.current) {
      console.log('Submit blocked:', { exam: !!exam, submitting: submittingRef.current });
      return;
    }
    submittingRef.current = true;
    console.log('Submitting exam due to violations or timer');

    try {
      // Server-side enforcement of attempt limits. No localStorage marker is required.

      // ✅ OPTIMIZED: Save all answers in parallel for faster submission
      console.log('Pre-submission: Saving all answers in parallel...');
      const savePromises = Object.entries(answers).map(async ([questionId, answer]) => {
        if (answer === null || answer === undefined) return;

        let answerPayload;
        if (typeof answer === 'object' && Object.prototype.hasOwnProperty.call(answer, 'code')) {
          const question = getQuestionById(questionId);
          const resolvedLanguage = answer.language || question?.language || 'javascript';
          // ✅ FIX: Use silent save (no grading) for pre-submission save
          // The final grading happens in submitCodingExam
          answerPayload = {
            code: answer.code,
            language: resolvedLanguage,
            shouldSkipJudge: true
          };
          console.log(`Saving coding answer for question ${questionId} (Silent Mode)`);
        } else if (typeof answer === 'string') {
          answerPayload = { textAnswer: answer };
        } else {
          answerPayload = { selectedOption: answer };
        }

        return examService.submitAnswer(examId, questionId, answerPayload);
      });

      // Wait for all saves to complete in parallel
      await Promise.all(savePromises);
      console.log('All answers saved successfully');

      const hasCodingQuestions = exam.questions?.some((q) => q.type === "coding");

      if (hasCodingQuestions) {
        if (!studentId) {
          toast.error("Unable to identify the student account. Please re-login and try again.");
          submittingRef.current = false;
          return;
        }

        const codingAnswers = exam.questions
          .map((question, idx) => ({ question, idx }))
          .filter(({ question }) => question.type === "coding")
          .map(({ question, idx }) => {
            const questionId = getQuestionId(question, idx);
            const storedAnswer = answers[questionId] || {};
            // ✅ FIX: Use latest typed code (code) if available, otherwise fallback to lastRunCode
            // This ensures that even if user didn't click "Run", their typed code is submitted.
            const finalCode = storedAnswer.code !== undefined ? storedAnswer.code : (storedAnswer.lastRunCode ?? "");

            return {
              questionId,
              code: finalCode,
              language: storedAnswer.language || question.language || "javascript",
            };
          });

        // Mark as cheating if auto-submitted, has violations, or has cheating logs
        const isCheatingDetected = !!autoCheatingDetectedRef.current || (violationsRef.current || 0) >= 3 || (Array.isArray(cheatingLogsRef.current) && cheatingLogsRef.current.length > 0);

        const payload = {
          examId,
          studentId,
          answers: codingAnswers,
          cheatingDetected: isCheatingDetected,
          violationCount: violationsRef.current || 0,
          keyboardViolations: keyboardViolationsRef.current || 0,
          submissionReason: autoCheatingDetectedRef.current ? 'Auto-submit: Too many violations' : undefined,
          cheatingLogs: Array.isArray(cheatingLogsRef.current) ? cheatingLogsRef.current.slice() : [],
        };

        await resultService.submitCodingExam(payload);
        toast.success("Exam submitted successfully!");

        // Clean fullscreen exit
        if (document.fullscreenElement) {
          try {
            await document.exitFullscreen();
          } catch (e) {
            console.warn('Error exiting fullscreen:', e);
          }
        }

        navigate(`/exams/${examId}/result`);
        return;
      }

      const submitPayload = {
        cheatingDetected: !!autoCheatingDetectedRef.current,
        violationCount: violationsRef.current || 0,
        keyboardViolations: keyboardViolationsRef.current || 0,
        submissionReason: autoCheatingDetectedRef.current ? 'Auto-submit: Too many violations' : undefined,
        cheatingLogs: Array.isArray(cheatingLogsRef.current) ? cheatingLogsRef.current.slice() : [],
      };

      await examService.submitExam(examId, submitPayload);
      toast.success("Exam submitted successfully!");

      // Clean fullscreen exit
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (e) {
          console.warn('Error exiting fullscreen:', e);
        }
      }

      if (exam.isInModule) {
        navigate(`/exams/${examId}/result`);
      } else {
        navigate("/exams");
      }
    } catch (err) {
      console.error('Error submitting exam:', err);
      toast.error(err.response?.data?.message || "Failed to submit exam");
      submittingRef.current = false;
    }
  }, [exam, examId, answers, user, navigate]);

  // Store handleSubmitExam in ref for access in event handlers
  useEffect(() => {
    handleSubmitExamRef.current = handleSubmitExam;
  }, [handleSubmitExam]);

  // Function to enter fullscreen initially
  const handleEnterFullscreen = async () => {
    try {
      // Multi-screen detection removed per user request

      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        fullscreenEnteredRef.current = true;
        examStartedRef.current = true;
        monitoringActiveRef.current = true;
        setShowInitialFullscreenPrompt(false);
        setExamReady(true);
        toast.success("Exam started. Good luck!");
      } else {
        // Even if fullscreen fails, activate monitoring
        fullscreenEnteredRef.current = true;
        examStartedRef.current = true;
        monitoringActiveRef.current = true;
        setShowInitialFullscreenPrompt(false);
        setExamReady(true);
        toast.error("Fullscreen is not supported in your browser. Please use a modern browser.");
      }
    } catch (err) {
      console.warn('Fullscreen not available:', err);
      // Even if fullscreen fails, activate monitoring
      fullscreenEnteredRef.current = true;
      examStartedRef.current = true;
      monitoringActiveRef.current = true;
      setShowInitialFullscreenPrompt(false);
      setExamReady(true);
      toast.error("Unable to enter fullscreen. Please allow fullscreen permission and try again.");
    }
  };

  // Function to return to fullscreen after violation
  const handleReturnToFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setShowWarningOverlay(false);
        fullscreenEnteredRef.current = true;
        toast.success("Returned to fullscreen mode.");
      }
    } catch (err) {
      console.warn('Fullscreen not available:', err);
      toast.error("Unable to enter fullscreen. Please enable it manually.");
    }
  };


  // ✅ PHASE 5: Render single question
  const renderQuestion = (q, idx) => {
    const qid = getQuestionId(q, idx);
    const isCoding = q.type === "coding";
    const selected = answers[qid];

    return (
      <div key={qid} style={questionCardStyle}>
        {/* ✅ Only show header for non-coding questions - coding questions show title in left panel */}
        {!isCoding && (
          <div style={questionHeadStyle}>
            <div style={{ flex: 1 }}>
              <span style={questionNumberStyle}>Question {idx + 1}</span>
              <h3 style={questionTitleStyle}>{q.title || q.question || "Question text not available"}</h3>
            </div>
            <span style={questionTagStyle(q.type)}>
              {(q.type || "mcq").toUpperCase()}
            </span>
          </div>
        )}

        {q.code && (
          <div style={{ marginTop: '12px' }}>
            <pre style={{ background: '#0f172a08', padding: '12px', borderRadius: '6px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace', overflowX: 'auto', fontSize: '14px', whiteSpace: 'pre' }}>
              <code style={{ whiteSpace: 'pre' }}>{q.code}</code>
            </pre>
          </div>
        )}

        {q.type === "mcq" && (
          <div style={optionGridStyle}>
            {q.options.map((opt, idx) => (
              <label key={idx} style={optionChipStyle(selected === idx)}>
                <input
                  type="radio"
                  name={`q-${qid}`}
                  checked={selected === idx}
                  onChange={() => handleChangeMCQ(qid, idx)}  // Direct index
                  style={{ display: "none" }}
                />
                <span style={optionIndexStyle}>{opt.optionLabel || String.fromCharCode(65 + idx)}</span>
                <span>{opt.text}</span>
              </label>
            ))}
          </div>
        )}






        {q.type === "theory" && (
          <div>
            <textarea
              value={answers[qid] ?? ""}
              onChange={(e) => handleChangeTheory(qid, e.target.value)}
              onBlur={() => {
                const text = answers[qid];
                if (text) saveAnswer(qid, { textAnswer: text });
              }}
              rows={8}
              placeholder="Type your answer here..."
              style={theoryTextareaStyle}
            />
            {q.maxLength && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                Max length: {q.maxLength} characters
              </div>
            )}
          </div>
        )}

        {isCoding && (
          <div style={{
            display: 'flex',
            gap: '0',
            height: 'calc(100vh - 120px)', // ✅ Maximized height (Total - Toolbar - QuestionNav)
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            marginTop: '0'
          }}>
            {/* LEFT PANEL - Problem Description */}
            <div style={{
              width: '35%',
              borderRight: '1px solid #e2e8f0',
              overflowY: 'auto',
              background: '#f8f9fa',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Problem Description - shows full question text with preserved newlines */}
              <div style={{
                padding: '1.5rem',
                flex: 1,
                overflowY: 'auto'
              }}>
                <div style={{
                  marginBottom: '1.5rem',
                  fontSize: '0.938rem',
                  lineHeight: '1.6',
                  color: '#334155',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}>
                  {q.title}
                </div>

                {/* Test Cases Info */}
                {Array.isArray(q.testCases) && q.testCases.length > 0 && (
                  <div>
                    <h4 style={{
                      margin: '0 0 1rem 0',
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        background: '#e0f2fe',
                        color: '#0284c7',
                        borderRadius: '6px',
                        fontSize: '0.75rem'
                      }}>ℹ️</span>
                      Sample Test Cases
                    </h4>

                    {/* Test Cases List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {q.testCases
                        .filter(tc => !tc.isHidden)
                        .slice(0, 3)
                        .map((tc, i) => (
                          <div key={i} style={{
                            background: 'white',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                          }}>
                            <div style={{ marginBottom: '0.75rem' }}>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Input</span>
                              <div style={{
                                marginTop: '0.25rem',
                                fontFamily: "'Courier New', monospace",
                                fontSize: '0.875rem',
                                color: '#334155',
                                background: '#f1f5f9',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {tc.input || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No input</span>}
                              </div>
                            </div>
                            <div>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#64748b',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>Expected Output</span>
                              <div style={{
                                marginTop: '0.25rem',
                                fontFamily: "'Courier New', monospace",
                                fontSize: '0.875rem',
                                color: '#334155',
                                background: '#f1f5f9',
                                padding: '0.5rem',
                                borderRadius: '4px',
                                wordBreak: 'break-word',
                                whiteSpace: 'pre-wrap'
                              }}>
                                {tc.expectedOutput}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Test Case Summary */}
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      background: '#eff6ff',
                      borderRadius: '6px',
                      fontSize: '0.813rem',
                      color: '#1e40af'
                    }}>
                      <strong>Total Test Cases:</strong> {q.testCases.length}
                      <span style={{ marginLeft: '0.5rem' }}>
                        (Visible: {q.testCases.filter(tc => !tc.isHidden).length},
                        Hidden: {q.testCases.filter(tc => tc.isHidden).length})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL - Code Editor */}
            <div style={{
              width: '65%',
              display: 'flex',
              flexDirection: 'column',
              background: '#ffffff',
              overflowY: 'auto' // ✅ Enable scrolling for right panel (laptop friendly)
            }}>
              {/* Language Selector Bar */}
              <div style={{
                padding: '0.75rem 1.5rem',
                borderBottom: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                flexShrink: 0 // Prevent shrinking
              }}>
                <label htmlFor={`language-${qid}`} style={{
                  fontSize: '0.813rem',
                  fontWeight: '600',
                  color: '#374151'
                }}>Language:</label>
                <select
                  id={`language-${qid}`}
                  value={(answers[qid] && answers[qid].language) || q.language || "javascript"}
                  onChange={(e) => handleChangeLanguage(qid, e.target.value)}
                  disabled={!!q.language} // Disable if language is forced by admin
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.813rem',
                    cursor: q.language ? 'not-allowed' : 'pointer', // Change cursor
                    background: q.language ? '#f3f4f6' : 'white', // Grey out if disabled
                    color: '#374151',
                    opacity: q.language ? 0.8 : 1
                  }}
                >
                  {q.language ? (
                    // If language is forced, only show that option
                    <option value={q.language}>
                      {q.language === 'cpp' ? 'C++' :
                        q.language === 'c' ? 'C' :
                          q.language.charAt(0).toUpperCase() + q.language.slice(1)}
                    </option>
                  ) : (
                    // Otherwise show all options
                    <>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="java">Java</option>
                      <option value="c">C</option>
                    </>
                  )}
                </select>
              </div>

              {/* Monaco Code Editor */}
              <div style={{ flex: 1, overflow: 'hidden', minHeight: '300px' }}> {/* ✅ Min-height guarantee */}
                <Editor
                  height="100%"
                  language={(answers[qid] && answers[qid].language) || q.language || "javascript"}
                  value={(() => {
                    let userCode = (answers[qid] && answers[qid].code) || q.boilerplate || "";
                    const mainBlock = q.mainBlock || "";

                    // ✅ FIX: Strip ALL existing test runner blocks to prevent duplication
                    const separator = '\n\n# ========== TEST RUNNER (READ-ONLY) ==========\n';

                    // Keep removing test runner blocks until none are left
                    while (userCode.includes(separator)) {
                      const separatorIndex = userCode.indexOf(separator);
                      if (separatorIndex !== -1) {
                        userCode = userCode.substring(0, separatorIndex);
                      } else {
                        break;
                      }
                    }

                    // Combine user code with mainBlock (shown below, read-only)
                    if (mainBlock) {
                      return `${userCode}${separator}${mainBlock}`;
                    }
                    return userCode;
                  })()}
                  onChange={(value) => {
                    // Extract only the user's code (before the TEST RUNNER comment)
                    if (value) {
                      const separator = '\n\n# ========== TEST RUNNER (READ-ONLY) ==========\n';
                      const separatorIndex = value.indexOf(separator);

                      if (separatorIndex !== -1) {
                        // Only save the part before the separator
                        handleChangeCoding(qid, value.substring(0, separatorIndex));
                      } else {
                        // No separator found, save everything
                        handleChangeCoding(qid, value);
                      }
                    } else {
                      handleChangeCoding(qid, "");
                    }
                  }}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    // ✅ Python indentation fix (4 spaces)
                    tabSize: ((answers[qid] && answers[qid].language) || q.language) === 'python' ? 4 : 2,
                    insertSpaces: true,
                    detectIndentation: false,
                    wordWrap: 'on',
                    // ✅ Auto-indentation features
                    autoIndent: 'full',
                    formatOnPaste: true,
                    formatOnType: true,
                    // ✅ Auto-closing brackets
                    autoClosingBrackets: 'always',
                    autoClosingQuotes: 'always',
                    autoClosingOvertype: 'always',
                    // ✅ Bracket matching
                    matchBrackets: 'always',
                    // ✅ Code suggestions
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    // ✅ Other helpful features
                    folding: true,
                    renderWhitespace: 'selection',
                    cursorBlinking: 'smooth',
                    smoothScrolling: true,
                    contextmenu: false,
                  }}
                  onMount={(editor) => {
                    const model = editor.getModel();

                    if (model && q.mainBlock) {
                      const userCode = (answers[qid] && answers[qid].code) || q.boilerplate || "";
                      const userCodeLines = userCode.split('\n').length;
                      const readOnlyStartLine = userCodeLines + 3; // +3 for blank line, separator, and mainBlock start

                      // Prevent any edits in the read-only zone
                      editor.onDidChangeModelContent((e) => {
                        const changes = e.changes;

                        for (const change of changes) {
                          const startLine = change.range.startLineNumber;
                          const endLine = change.range.endLineNumber;

                          // If change affects read-only area, revert it
                          if (startLine >= readOnlyStartLine || endLine >= readOnlyStartLine) {
                            // Restore the original content
                            const fullContent = model.getValue();
                            const separator = '\n\n# ========== TEST RUNNER (READ-ONLY) ==========\n';
                            const separatorIndex = fullContent.indexOf(separator);

                            if (separatorIndex !== -1) {
                              const userPart = fullContent.substring(0, separatorIndex);
                              const mainBlockPart = q.mainBlock;
                              const correctedContent = `${userPart}${separator}${mainBlockPart}`;

                              // Only update if different
                              if (fullContent !== correctedContent) {
                                const currentPosition = editor.getPosition();
                                model.setValue(correctedContent);

                                // Restore cursor to safe position
                                if (currentPosition && currentPosition.lineNumber < readOnlyStartLine) {
                                  editor.setPosition(currentPosition);
                                } else {
                                  editor.setPosition({ lineNumber: userCodeLines, column: 1 });
                                }
                              }
                            }
                          }
                        }
                      });

                      // Visual indicator for read-only zone
                      const decorations = editor.deltaDecorations([], [
                        {
                          range: new window.monaco.Range(readOnlyStartLine, 1, model.getLineCount(), 1),
                          options: {
                            isWholeLine: true,
                            className: 'read-only-line',
                            glyphMarginClassName: 'read-only-glyph'
                          }
                        }
                      ]);
                    }

                    // Auto-save on blur
                    editor.onDidBlurEditorText(() => {
                      const answer = answers[qid];
                      if (answer && answer.code) {
                        const resolvedLanguage = answer.language || q.language || 'javascript';
                        saveAnswer(qid, { code: answer.code, language: resolvedLanguage });
                      }
                    });
                  }}
                />
              </div>

              {/* ✅ NEW: Run Status Indicator */}
              {(() => {
                const answer = answers[qid] || {};
                const hasLastRun = !!answer.lastRunCode;
                const hasUnsavedChanges = answer.code !== answer.lastRunCode;
                const lastRunResult = answer.lastRunResult;
                const lastRunTime = answer.lastRunTimestamp;

                // Calculate time ago
                let timeAgo = '';
                if (lastRunTime) {
                  const diff = Date.now() - new Date(lastRunTime).getTime();
                  const minutes = Math.floor(diff / 60000);
                  if (minutes < 1) timeAgo = 'just now';
                  else if (minutes === 1) timeAgo = '1 minute ago';
                  else if (minutes < 60) timeAgo = `${minutes} minutes ago`;
                  else timeAgo = `${Math.floor(minutes / 60)} hours ago`;
                }

                // Get test results summary
                let testSummary = '';
                if (lastRunResult) {
                  const passed = lastRunResult.passed || 0;
                  const total = lastRunResult.total || 0;
                  testSummary = `${passed}/${total} tests passed`;
                }

                return (
                  <div style={{
                    padding: '0.75rem 1.5rem',
                    background: hasUnsavedChanges ? '#fef3c7' : hasLastRun ? '#d1fae5' : '#f3f4f6',
                    borderTop: '1px solid #e2e8f0',
                    fontSize: '0.813rem',
                    color: '#0f172a',
                    flexShrink: 0
                  }}>
                    {hasLastRun ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#059669', fontWeight: '600' }}>✅ Last run:</span>
                        <span>{testSummary}</span>
                        {timeAgo && <span style={{ color: '#64748b' }}>({timeAgo})</span>}
                        {hasUnsavedChanges && (
                          <span style={{
                            color: '#92400e',
                            fontWeight: '600',
                            marginLeft: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            background: '#fde68a',
                            borderRadius: '4px'
                          }}>
                            ⚠️ Unsaved changes - click Run Code to test
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: '#64748b' }}>
                        💡 Click Run Code to test your solution before submitting
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Action Buttons Bar */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e2e8f0',
                background: '#ffffff',
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
                flexShrink: 0
              }}>

                {/* SUBMIT CODE (Renamed to Run Code as per user request) */}
                <button
                  onClick={() => handleSubmitCode(q)}
                  disabled={submittingCode}
                  style={{
                    padding: '0.625rem 1.25rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: submittingCode ? 'not-allowed' : 'pointer',
                    background: submittingCode ? '#9ca3af' : '#00b760',
                    color: 'white',
                    opacity: submittingCode ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  {submittingCode ? "Running..." : "Run Code"}
                </button>
              </div>

              {/* Results Section (Collapsible) */}
              {(runResult || (sampleResults && sampleResults.length > 0)) && (
                <div style={{
                  maxHeight: '35vh', // ✅ Dynamic height
                  overflowY: 'auto',
                  borderTop: '1px solid #e2e8f0',
                  background: '#f8f9fa',
                  flexShrink: 0
                }}>
                  {runResult && (
                    <div style={{
                      padding: '1rem',
                      background: '#1e293b',
                      color: '#e2e8f0'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                        paddingBottom: '0.75rem',
                        borderBottom: '1px solid #334155'
                      }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: runResult.passed === runResult.total ? "#4ade80" : "#f87171",
                          }}></span>
                          Execution Result
                        </span>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: runResult.passed === runResult.total ? '#d1fae5' : '#fee2e2',
                          color: runResult.passed === runResult.total ? '#065f46' : '#991b1b'
                        }}>
                          {runResult.passed}/{runResult.total} Passed
                        </span>
                      </div>

                      {/* Test Results */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {runResult.results && runResult.results.map((test, index) => {
                          const isHidden = test.isHidden === true;
                          return (
                            <div key={index} style={{
                              padding: "0.75rem",
                              borderRadius: "6px",
                              background: isHidden ? "#fef08a" : "rgba(30,41,59,0.5)",
                              border: test.status === "accepted" ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(248,113,113,0.4)",
                            }}>
                              <div style={{ marginBottom: "0.5rem", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ color: isHidden ? "#92400e" : "#f1f5f9", fontSize: '0.875rem' }}>
                                  {isHidden ? `Hidden Test Case ${index + 1}` : `Test Case ${index + 1}`}
                                </strong>
                                <span style={{
                                  color: test.status === "accepted" ? "#4ade80" : "#f87171",
                                  fontWeight: "600",
                                  fontSize: '0.813rem'
                                }}>
                                  {test.status.toUpperCase()}
                                </span>
                              </div>

                              {!isHidden && test.stdout && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  <span style={{ display: "block", fontSize: "0.688rem", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.25rem" }}>YOUR OUTPUT</span>
                                  <pre style={{ background: "rgba(15, 23, 42, 0.6)", padding: "0.5rem", borderRadius: "4px", fontSize: "0.813rem", fontFamily: "'Courier New', monospace", color: "#e2e8f0", margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{test.stdout}</pre>
                                </div>
                              )}

                              {!isHidden && test.stderr && (
                                <div style={{ marginTop: "0.5rem" }}>
                                  <span style={{ display: "block", fontSize: "0.688rem", fontWeight: "600", color: "#f87171", textTransform: "uppercase", marginBottom: "0.25rem" }}>ERROR</span>
                                  <pre style={{ background: "rgba(153, 27, 27, 0.2)", padding: "0.5rem", borderRadius: "4px", fontSize: "0.813rem", fontFamily: "'Courier New', monospace", color: "#fca5a5", margin: 0, border: "1px solid rgba(248, 113, 113, 0.2)", whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{test.stderr}</pre>
                                </div>
                              )}

                              {/* ✅ NEW: Show compilation errors */}
                              {!isHidden && test.compile_output && test.compile_output.trim() && (
                                <div style={{ marginTop: "0.5rem" }}>
                                  <span style={{ display: "block", fontSize: "0.688rem", fontWeight: "600", color: "#fb923c", textTransform: "uppercase", marginBottom: "0.25rem" }}>COMPILATION ERROR</span>
                                  <pre style={{ background: "rgba(194, 65, 12, 0.15)", padding: "0.5rem", borderRadius: "4px", fontSize: "0.813rem", fontFamily: "'Courier New', monospace", color: "#fdba74", margin: 0, border: "1px solid rgba(251, 146, 60, 0.3)", whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{test.compile_output}</pre>
                                </div>
                              )}

                              {isHidden && (
                                <div style={{
                                  marginTop: '0.5rem',
                                  padding: '0.75rem',
                                  background: '#fffbeb',
                                  borderRadius: '6px',
                                  border: '2px solid #fbbf24',
                                  textAlign: 'center'
                                }}>
                                  <div style={{ fontSize: '0.813rem', color: '#92400e', fontWeight: '500' }}>
                                    🔒 This is a hidden test case
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#78350f', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                    Submit the assessment to see the output
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {sampleResults && sampleResults.length > 0 && (
                    <div style={{ padding: '1rem', background: '#ffffff' }}>
                      <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>Sample Test Results</h4>

                      {/* Summary */}
                      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: 'wrap' }}>
                        <div style={{ padding: "0.5rem 0.75rem", background: "#f1f5f9", borderRadius: "6px", fontSize: "0.813rem", fontWeight: "600", color: "#475569" }}>
                          Total: {sampleResults.length}
                        </div>
                        <div style={{ padding: "0.5rem 0.75rem", background: "#dcfce7", borderRadius: "6px", fontSize: "0.813rem", fontWeight: "600", color: "#166534" }}>
                          Passed: {sampleResults.filter(t => t.status === "accepted").length}
                        </div>
                        <div style={{ padding: "0.5rem 0.75rem", background: "#fee2e2", borderRadius: "6px", fontSize: "0.813rem", fontWeight: "600", color: "#991b1b" }}>
                          Failed: {sampleResults.filter(t => t.status !== "accepted").length}
                        </div>
                      </div>

                      {/* Each Test Case */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {sampleResults.map((t, i) => (
                          <div key={i} style={{
                            padding: '0.75rem',
                            background: t.status === "accepted" ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${t.status === "accepted" ? '#bbf7d0' : '#fecaca'}`,
                            borderRadius: '6px'
                          }}>
                            <div style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: "0.5rem",
                              paddingBottom: "0.5rem",
                              borderBottom: t.status === "accepted" ? "1px solid rgba(6, 95, 70, 0.1)" : "1px solid rgba(153, 27, 27, 0.1)"
                            }}>
                              <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                                {t.status === "accepted" ? "✅ Passed" : "❌ Failed"}
                              </span>
                              <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                                Test Case {i + 1}
                              </span>
                            </div>

                            <div>
                              <span style={{ display: "block", fontSize: "0.688rem", textTransform: "uppercase", fontWeight: "600", opacity: 0.7, marginBottom: "0.25rem" }}>
                                Your Output
                              </span>
                              <code style={{
                                display: 'block',
                                padding: '0.5rem',
                                background: '#f8fafc',
                                borderRadius: '4px',
                                fontSize: '0.813rem',
                                fontFamily: 'monospace',
                                color: t.status === "accepted" ? "#10b981" : "#dc2626",
                                wordBreak: 'break-word'
                              }}>
                                {t.stdout || "(no output)"}
                              </code>
                            </div>

                            {t.stderr && (
                              <div style={{
                                marginTop: "0.5rem",
                                padding: "0.5rem",
                                background: "rgba(220, 38, 38, 0.05)",
                                borderRadius: "4px",
                                color: "#dc2626",
                                fontSize: "0.75rem",
                                fontFamily: "monospace"
                              }}>
                                <strong>Error:</strong> {t.stderr}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        gap: '1rem'
      }}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: '0' }}>Loading exam...</p>
      </div>
    );
  }

  // Error state
  if (!exam) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        gap: '1rem',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <h3 style={{ color: '#ef4444', margin: '0', fontSize: '1.5rem' }}>Exam not found</h3>
        <p style={{ color: '#64748b', margin: '0' }}>The exam you're looking for doesn't exist or you don't have access to it.</p>
        <button
          onClick={() => navigate("/exams")}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.875rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
        >
          Back to Assessments
        </button>
      </div>
    );
  }

  // Calculate progress
  const totalQuestions = exam.questions?.length || 0;
  const answeredCount = Object.keys(answers).filter((k) => answers[k] != null && answers[k] !== "").length;
  const progressPercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Inline Styles
  const pageStyle = {
    width: '100%',
    minHeight: '100vh',
    padding: '0', // ✅ Remove padding to use full screen
    background: '#f9fafb',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'flex',
    flexDirection: 'column'
  };

  const compactToolbarStyle = {
    height: '60px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' // ✅ Stronger shadow for separation
  };

  const titleStyle = {
    margin: '0 0 0.25rem 0',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#0f172a'
  };

  const subtitleStyle = {
    margin: '0',
    fontSize: '0.875rem',
    color: '#64748b',
    lineHeight: 1.5
  };

  const statsStyle = {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap'
  };

  const statPillStyle = {
    padding: '0.5rem 1rem',
    background: '#f3f4f6',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    minWidth: '80px'
  };

  const statLabelStyle = {
    fontSize: '0.625rem',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const statValueStyle = {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#0f172a'
  };

  const progressCardStyle = {
    background: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    marginBottom: '1rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
  };

  const progressBarStyle = {
    width: '100%',
    height: '6px',
    background: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '0.5rem'
  };

  const progressFillStyle = {
    height: '100%',
    background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
    borderRadius: '5px',
    transition: 'width 0.3s ease'
  };

  const progressInfoStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: '500'
  };

  const questionStackStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '1.5rem'
  };

  const questionCardStyle = {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e2e8f0'
  };

  const questionHeadStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.25rem',
    gap: '1rem'
  };

  const questionNumberStyle = {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'block',
    marginBottom: '0.5rem'
  };

  const questionTitleStyle = {
    margin: '0 0 1rem 0',
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap'
  };

  const questionTagStyle = (type) => {
    const colors = {
      coding: { bg: '#fef3c7', text: '#92400e' },
      theory: { bg: '#fce7f3', text: '#9f1239' },
      mcq: { bg: '#dbeafe', text: '#1e40af' }
    };
    const color = colors[type] || colors.mcq;
    return {
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'uppercase',
      background: color.bg,
      color: color.text
    };
  };

  const optionGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '0.75rem'
  };

  const optionChipStyle = (selected) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    border: selected ? '2px solid #3b82f6' : '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    background: selected ? '#eff6ff' : 'white',
    transition: 'all 0.2s'
  });

  const optionIndexStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#3b82f6',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.875rem',
    flexShrink: 0
  };

  const theoryTextareaStyle = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '150px',
    lineHeight: 1.5
  };

  const codingToolbarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
    gap: '0.75rem',
    flexWrap: 'wrap'
  };

  const languageSelectStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  };

  const languageLabelStyle = {
    fontSize: '0.813rem',
    fontWeight: '600',
    color: '#374151'
  };

  const languageSelectElementStyle = {
    padding: '0.5rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.813rem',
    cursor: 'pointer',
    background: 'white'
  };

  const codingActionsStyle = {
    display: 'flex',
    gap: '0.5rem'
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.813rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db'
  };

  const ghostButtonStyle = {
    ...buttonStyle,
    background: 'transparent',
    color: '#3b82f6',
    border: '1px solid #3b82f6'
  };

  const codeEditorStyle = {
    width: '100%',
    padding: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.813rem',
    fontFamily: "'Courier New', monospace",
    background: '#1e293b',
    color: '#e2e8f0',
    resize: 'vertical',
    minHeight: '250px',
    lineHeight: 1.6
  };

  const codeOutputStyle = {
    marginTop: '1.5rem',
    padding: '0',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  const codeOutputHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    background: '#0f172a',
    borderBottom: '1px solid #334155',
    fontSize: '0.75rem',
    color: '#e2e8f0',
    fontWeight: '600'
  };

  const codeOutputStatusStyle = (status) => ({
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.688rem',
    fontWeight: '600',
    background: status === 'Accepted' ? '#d1fae5' : status === 'Error' ? '#fee2e2' : '#fef3c7',
    color: status === 'Accepted' ? '#065f46' : status === 'Error' ? '#991b1b' : '#92400e'
  });

  const codeOutputBlockStyle = {
    background: 'rgba(0, 0, 0, 0.3)',
    color: '#e2e8f0',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '0.813rem',
    fontFamily: "'Courier New', monospace",
    whiteSpace: 'pre-wrap',
    overflowX: 'auto',
    margin: '0',
    border: '1px solid #334155'
  };

  const sampleResultsStyle = {
    marginTop: '1rem',
    padding: '1rem',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px'
  };

  const sampleResultsTitleStyle = {
    margin: '0 0 0.75rem 0',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#0f172a'
  };

  const sampleResultsListStyle = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  };

  const sampleResultItemStyle = (passed) => ({
    padding: '1rem',
    background: passed ? '#f0fdf4' : '#fef2f2',
    border: passed ? '1px solid #bbf7d0' : '1px solid #fecaca',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    color: passed ? '#166534' : '#991b1b',
    transition: 'all 0.2s'
  });

  const sampleResultCodeStyle = {
    background: 'rgba(255,255,255,0.5)',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    border: '1px solid rgba(0,0,0,0.05)',
    display: 'block',
    width: '100%',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all'
  };

  const footerStyle = {
    background: 'white',
    padding: '1.5rem 2rem',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap',
    position: 'sticky',
    bottom: 0,
    zIndex: 10
  };

  const footerTextStyle = {
    flex: 1,
    minWidth: '200px'
  };

  const footerTitleStyle = {
    margin: '0 0 0.25rem 0',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#0f172a'
  };

  const footerDescStyle = {
    margin: 0,
    fontSize: '0.813rem',
    color: '#64748b'
  };

  const primaryButtonStyle = {
    padding: '0.75rem 1.5rem',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.875rem',
    transition: 'all 0.2s'
  };

  // Format time helper
  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--';
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={pageStyle}>
      {/* Scheduling Status Overlays */}
      {schedulingStatus !== 'active' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 20000,
          padding: '2rem'
        }}>
          <div style={{
            background: 'white',
            padding: '3rem',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: schedulingStatus === 'not-started' ? '#eff6ff' : '#fef2f2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 2rem auto'
            }}>
              {schedulingStatus === 'not-started' ? (
                <Clock size={40} color="#3b82f6" />
              ) : (
                <Lock size={40} color="#ef4444" />
              )}
            </div>

            <h2 style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: '#0f172a',
              marginBottom: '1rem'
            }}>
              {schedulingStatus === 'not-started' ? 'Exam Not Started' : 'Exam Expired'}
            </h2>

            <p style={{
              color: '#64748b',
              fontSize: '1.125rem',
              lineHeight: '1.6',
              marginBottom: '2.5rem'
            }}>
              {schedulingStatus === 'not-started'
                ? `This exam is scheduled to start on ${schedulingDetails?.start?.toLocaleString()}. Please return at the scheduled time.`
                : 'The time window for this exam has already passed. Please contact your instructor for assistance.'}
            </p>

            <div style={{
              background: '#f8fafc',
              padding: '1.5rem',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              marginBottom: '2.5rem',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Starts</span>
                <span style={{ color: '#0f172a', fontWeight: '700' }}>{schedulingDetails?.start?.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontWeight: '500' }}>Ends</span>
                <span style={{ color: '#0f172a', fontWeight: '700' }}>{schedulingDetails?.end?.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/exams')}
              style={{
                width: '100%',
                padding: '1rem',
                background: '#0f172a',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#1e293b'}
              onMouseLeave={(e) => e.target.style.background = '#0f172a'}
            >
              Back to Exams
            </button>
          </div>
        </div>
      )}
      {/* Watermark Overlay */}
      {examReady && user && (
        <WatermarkOverlay
          email={user.email}
          name={user.name || user.username}
        />
      )}

      {/* Initial Fullscreen Prompt Modal */}
      {showInitialFullscreenPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            padding: '2.5rem',
            borderRadius: '20px',
            width: '95%',
            maxWidth: '650px',
            textAlign: 'left',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '72px',
                height: '72px',
                background: '#eff6ff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem auto',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}>
                <Shield size={36} color={COLORS.primary} strokeWidth={2} />
              </div>
              <h2 style={{
                fontSize: '1.875rem',
                fontWeight: '800',
                color: '#0f172a',
                marginBottom: '0.5rem',
                letterSpacing: '-0.025em'
              }}>
                Proctoring & Anti-Cheat Rules
              </h2>
              <p style={{ color: '#64748b', fontSize: '1rem' }}>
                Please review the following strict protocols before beginning your assessment.
              </p>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '2rem'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '700',
                color: '#0f172a',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={18} color="#dc2626" />
                Strictly Prohibited Actions
              </h3>

              <ul style={{
                margin: 0,
                paddingLeft: '1.5rem',
                color: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <li>
                  <strong style={{ color: '#b91c1c' }}>No Copy-Paste:</strong> Usage of <code style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85em', color: '#b91c1c' }}>Ctrl+C</code>, <code style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: '4px', fontSize: '0.85em', color: '#b91c1c' }}>Ctrl+V</code>, or Right-Click menu is strictly forbidden and monitored.
                </li>
                <li>
                  <strong style={{ color: '#b91c1c' }}>Fullscreen Mandatory:</strong> Violating fullscreen mode (e.g., pressing Esc, F11) will trigger a warning.
                </li>
                <li>
                  <strong style={{ color: '#b91c1c' }}>No Switching:</strong> Switching tabs, minimizing the window, or opening other applications is not allowed.
                </li>
                <li>
                  <strong style={{ color: '#b91c1c' }}>No Screenshots:</strong> Using Screenshot tools, Snipping Tool, or Print Screen is a violation.
                </li>
                <li>
                  <strong style={{ color: '#b91c1c' }}>No DevTools:</strong> Opening Developer Tools (F12) is prohibited.
                </li>
              </ul>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                padding: '1rem',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <Clock size={16} color="#15803d" />
                  <span style={{ fontWeight: '700', color: '#15803d', fontSize: '0.875rem' }}>Exam Duration</span>
                </div>
                <p style={{ margin: 0, color: '#166534', fontSize: '0.9rem', fontWeight: '600' }}>
                  {exam.duration} Minutes
                </p>
              </div>

              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                padding: '1rem',
                borderRadius: '12px'
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={16} color="#b91c1c" />
                  <span style={{ fontWeight: '700', color: '#b91c1c', fontSize: '0.875rem' }}>Violation Limit</span>
                </div>
                <p style={{ margin: 0, color: '#991b1b', fontSize: '0.9rem', fontWeight: '600' }}>
                  3 Strikes = Auto-Submission
                </p>
              </div>
            </div>

            <div style={{
              padding: '1rem',
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              color: '#9a3412',
              fontSize: '0.875rem',
              marginBottom: '2rem',
              textAlign: 'center'
            }}>
              By clicking below, you agree to these rules and consent to activity monitoring.
            </div>

            <button
              onClick={handleEnterFullscreen}
              style={{
                width: '100%',
                padding: '1rem',
                background: COLORS.primary,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.125rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
              }}
            >
              <Maximize2 size={20} />
              I Agree & Start Assessment
            </button>
          </div>
        </div>
      )}

      {/* Violation Warning Overlay */}
      {showWarningOverlay && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10001
        }}>
          <div style={{
            background: '#fff',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              background: '#fee2e2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto'
            }}>
              <AlertTriangle size={32} color="#dc2626" />
            </div>
            <h2 style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '1.5rem' }}>Violation Detected!</h2>
            <p style={{ fontSize: '1.125rem', marginBottom: '1.5rem', color: '#334155' }}>{warningMessage}</p>
            <div style={{
              background: '#fef2f2',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              border: '1px solid #fecaca'
            }}>
              <p style={{ margin: 0, color: '#991b1b', fontWeight: '500' }}>
                Violations: {violations}/3
              </p>
            </div>
            <button
              onClick={handleReturnToFullscreen}
              style={{
                padding: '0.875rem 2rem',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Return to Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* Loading Spinner (when not ready and not showing prompt) */}
      {!examReady && !showInitialFullscreenPrompt && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: '1rem', color: '#64748b' }}>Preparing exam environment...</p>
        </div>
      )}

      {/* Exam Content - Only show when ready */}
      {examReady && (
        <div>
          {/* ✅ COMPACT TOOLBAR */}
          <div style={compactToolbarStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>
                {exam.title}
              </h1>
              <span style={{ height: '24px', width: '1px', background: '#e2e8f0' }}></span>

              {/* Progress Line */}
              <div style={{ flex: 1, maxWidth: '200px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.688rem', color: '#64748b' }}>
                  <span>{progressPercent}% Complete</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', background: '#3b82f6', borderRadius: '2px', transition: 'width 0.3s' }}></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.1' }}>
                  <span style={{ fontSize: '0.688rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Time Left</span>
                  <span style={{ fontSize: '1.125rem', fontWeight: '700', color: timeLeft < 300 ? '#ef4444' : '#0f172a', fontFamily: 'monospace' }}>
                    {formatTime(timeLeft)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.1' }}>
                  <span style={{ fontSize: '0.688rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Violations</span>
                  <span style={{ fontSize: '1.125rem', fontWeight: '700', color: violations > 0 ? '#ef4444' : '#10b981' }}>
                    {violations}/3
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmitExam}
                style={{
                  ...primaryButtonStyle,
                  background: '#dc2626',
                  padding: '0.5rem 1rem',
                  fontSize: '0.813rem',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                Submit
              </button>
            </div>
          </div>

          {/* ✅ PHASE 5: Mettl-style Exam Portal Layout */}
          {exam.questions && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Top Bar - Question Navigation (Horizontal) */}
              <div style={{
                background: '#f8fafc', // ✅ Subtle gray background for separation
                padding: '0.5rem 1.5rem',
                borderBottom: '1px solid #e2e8f0', // ✅ Lighter border
                height: '56px', // ✅ Slightly taller for breathing room
                display: 'flex',
                alignItems: 'center',
                boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)' // ✅ Inner shadow to look "recessed" below toolbar
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: '0', fontSize: '0.875rem', fontWeight: '600', color: '#0f172a', flexShrink: 0 }}>Questions:</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'nowrap' }}>
                    {exam.questions.map((q, idx) => {
                      const qid = getQuestionId(q, idx);
                      const status = questionStatuses[qid] || 'not-visited';
                      const colors = {
                        'not-visited': '#d1d5db',
                        'not-answered': '#3b82f6',
                        'answered': '#10b981',
                        'marked': '#f59e0b'
                      };
                      return (
                        <button
                          key={idx}
                          onClick={() => goToQuestion(idx)}
                          style={{
                            padding: '0.75rem 0.5rem',
                            background: colors[status],
                            color: '#fff',
                            border: currentQuestionIndex === idx ? '3px solid #0f172a' : 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '0.813rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = '0.85'}
                          onMouseLeave={(e) => e.target.style.opacity = '1'}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legend - Horizontal */}
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.688rem', color: '#64748b', marginLeft: 'auto', flexShrink: 0 }}>
                  <span style={{ fontWeight: '600' }}>Legend:</span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#d1d5db', borderRadius: '2px' }}></span>
                    <span>Not Visited</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }}></span>
                    <span>Not Answered</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }}></span>
                    <span>Answered</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }}></span>
                    <span>Marked</span>
                  </div>
                </div>
              </div>

              {/* Main Area - Current Question */}
              <div style={{
                flex: 1,
                background: 'white',
                padding: '0', // Removed inner padding for coding
                overflow: 'hidden' // Let inner containers handle scroll
              }}>
                {exam.questions[currentQuestionIndex] && renderQuestion(exam.questions[currentQuestionIndex], currentQuestionIndex)}
              </div>
            </div>
          )}

          {/* Bottom Navigation Bar */}
          {examReady && exam.questions && (
            <div style={{
              background: 'white',
              padding: '1.5rem',
              borderTop: '1px solid #e5e7eb',
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginTop: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '500' }}>
                Question {currentQuestionIndex + 1} of {exam.questions.length}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={goPrev}
                  disabled={currentQuestionIndex === 0}
                  style={{
                    ...secondaryButtonStyle,
                    opacity: currentQuestionIndex === 0 ? 0.5 : 1,
                    cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  ← Previous
                </button>
                <button
                  onClick={markForReview}
                  style={{
                    ...secondaryButtonStyle,
                    background: questionStatuses[getQuestionId(exam.questions[currentQuestionIndex], currentQuestionIndex)] === 'marked' ? '#fef3c7' : '#f3f4f6',
                    borderColor: questionStatuses[getQuestionId(exam.questions[currentQuestionIndex], currentQuestionIndex)] === 'marked' ? '#f59e0b' : '#d1d5db'
                  }}
                >
                  {questionStatuses[getQuestionId(exam.questions[currentQuestionIndex], currentQuestionIndex)] === 'marked' ? '✓ Marked' : 'Mark for Review'}
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentQuestionIndex >= exam.questions.length - 1}
                  style={{
                    ...secondaryButtonStyle,
                    opacity: currentQuestionIndex >= exam.questions.length - 1 ? 0.5 : 1,
                    cursor: currentQuestionIndex >= exam.questions.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next →
                </button>

              </div>
            </div>
          )}
        </div>
      )
      }
    </div >
  );
}
