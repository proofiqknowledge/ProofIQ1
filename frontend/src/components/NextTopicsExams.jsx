import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaChevronUp, FaLock, FaPlayCircle, FaFileAlt, FaQuestionCircle } from 'react-icons/fa';
import './NextTopicsExams.css';

/**
 * NextTopicsExams Component
 * 
 * Displays upcoming topics and exams in an expandable accordion or sidebar modal
 * Locks content that hasn't been unlocked yet (requires previous content completion)
 * 
 * Props:
 * - currentCourseData: Full course structure with weeks/days/exams
 * - currentWeekNumber: Current week (1-based)
 * - currentDayNumber: Current day (1-5)
 * - studentProgress: Student's progress data (includes completedWeeks, progress index)
 * - role: User role (Student, Trainer, Admin)
 * - onNavigateToDay: Callback when user clicks on an unlocked day
 * - onNavigateToExam: Callback when user clicks on an unlocked exam
 * - isModal: If true, displays as a modal overlay; if false, accordion style
 * - onClose: Callback to close modal (used when isModal={true})
 */
export default function NextTopicsExams({
  currentCourseData,
  currentWeekNumber,
  currentDayNumber,
  studentProgress,
  role,
  onNavigateToDay,
  onNavigateToExam,
  isModal = false,
  onClose,
}) {
  const [isExpanded, setIsExpanded] = useState(isModal ? true : false);
  const [nextItems, setNextItems] = useState([]);

  // Determine if a specific day is locked
  const isDayLocked = (weekNum, dayNum) => {
    if (role !== 'Student') return false; // Trainers/Admins can see everything
    
    // Calculate the linear index (0-based)
    // Each week has 5 days, so week 1 = days 0-4, week 2 = days 5-9, etc.
    const linearIndex = (weekNum - 1) * 5 + (dayNum - 1);
    
    // Get student's current progress (linear index of their position)
    const currentProgressIndex = studentProgress?.progress || 0;
    
    // A day is locked if it hasn't been reached yet
    return linearIndex >= currentProgressIndex;
  };

  // Determine if an exam (day 5 of a week) is accessible
  const isExamLocked = (weekNum) => {
    if (role !== 'Student') return false;
    
    // Exam is locked if the week hasn't been completed
    const completedWeeks = studentProgress?.completedWeeks || [];
    return !completedWeeks.includes(weekNum);
  };

  // Build the list of next items
  useEffect(() => {
    if (!currentCourseData || !currentCourseData.weeks) return;

    const items = [];
    const currentLinearIndex = (currentWeekNumber - 1) * 5 + (currentDayNumber - 1);

    // Iterate through all weeks
    currentCourseData.weeks.forEach((week) => {
      // Iterate through days 1-4 (regular content days)
      for (let dayNum = 1; dayNum <= 4; dayNum++) {
        const day = week.days?.find(d => d.dayNumber === dayNum);
        if (!day) continue;

        const linearIndex = (week.weekNumber - 1) * 5 + (dayNum - 1);

        // Only include days that are current or future
        if (linearIndex >= currentLinearIndex) {
          const isCurrentDay = week.weekNumber === currentWeekNumber && dayNum === currentDayNumber;
          
          items.push({
            id: `week-${week.weekNumber}-day-${dayNum}`,
            type: 'day',
            weekNumber: week.weekNumber,
            dayNumber: dayNum,
            title: `Day ${dayNum}`,
            hasVideo: !!day.video,
            hasDocument: !!day.document,
            isLocked: isDayLocked(week.weekNumber, dayNum),
            isCurrent: isCurrentDay,
            linearIndex,
            day,
          });
        }
      }

      // Check for weekly exam (day 5)
      const weeklyExamLinearIndex = (week.weekNumber - 1) * 5 + 4; // Day 5 = index 4
      if (weeklyExamLinearIndex >= currentLinearIndex) {
        items.push({
          id: `week-${week.weekNumber}-exam`,
          type: 'exam',
          weekNumber: week.weekNumber,
          title: `Week ${week.weekNumber} Exam`,
          isLocked: isExamLocked(week.weekNumber),
          isCurrent: false,
          linearIndex: weeklyExamLinearIndex,
        });
      }
    });

    // Sort by linear index
    items.sort((a, b) => a.linearIndex - b.linearIndex);
    setNextItems(items);
  }, [currentCourseData, currentWeekNumber, currentDayNumber, studentProgress, role]);

  const handleDayClick = (weekNum, dayNum) => {
    if (isDayLocked(weekNum, dayNum)) return; // Can't click locked items
    if (onNavigateToDay) onNavigateToDay(weekNum, dayNum);
  };

  const handleExamClick = (weekNum) => {
    if (isExamLocked(weekNum)) return; // Can't click locked exams
    if (onNavigateToExam) onNavigateToExam(weekNum);
  };

  if (role?.toLowerCase?.() !== 'student' && role !== 'Student') {
    // Trainers/Admins don't see this component
    return null;
  }

  return (
    <>
      {isModal ? (
        // Modal Overlay Mode
        <div 
            className="next-topics-modal-overlay"
            onClick={(e) => {
                // Close ONLY if clicking outside the content box
                if (e.target.classList.contains("next-topics-modal-overlay")) {
                onClose();
                }
            }}
            >
          <div className="next-topics-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="next-topics-modal-header">
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                📚 Upcoming Topics & Assessments
              </h2>
              <button
                className="next-topics-modal-close"
                onClick={onClose}
                title="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
            <div className="next-topics-list modal-list">
              {nextItems.length === 0 ? (
                <div className="next-topics-empty">
                  <p>No upcoming topics or exams</p>
                </div>
              ) : (
                nextItems.map((item) => {
                  const isLocked = item.isLocked;
                  const isCurrent = item.isCurrent;

                  if (item.type === 'day') {
                    return (
                      <div
                        key={item.id}
                        className={`next-topics-item next-topics-day ${isLocked ? 'locked' : ''} ${isCurrent ? 'current' : ''}`}
                        onClick={() => {
                          handleDayClick(item.weekNumber, item.dayNumber);
                          if (!isLocked) onClose?.();
                        }}
                        style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                      >
                        <div className="next-topics-item-left">
                          <div className="next-topics-icon-container">
                            {isLocked ? (
                              <FaLock className="next-topics-lock-icon" title="Complete previous content to unlock" />
                            ) : (
                              <FaPlayCircle className="next-topics-play-icon" />
                            )}
                          </div>
                          <div className="next-topics-item-content">
                            <div className="next-topics-item-title">
                              Week {item.weekNumber} - {item.title}
                            </div>
                            <div className="next-topics-item-meta">
                              {item.hasVideo && (
                                <span className="next-topics-meta-badge">
                                  <FaPlayCircle size={12} /> Video
                                </span>
                              )}
                              {item.hasDocument && (
                                <span className="next-topics-meta-badge">
                                  <FaFileAlt size={12} /> Document
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isCurrent && <div className="next-topics-current-badge">Current</div>}
                        {isLocked && <div className="next-topics-locked-badge">Locked</div>}
                      </div>
                    );
                  } else if (item.type === 'exam') {
                    return (
                      <div
                        key={item.id}
                        className={`next-topics-item next-topics-exam ${isLocked ? 'locked' : ''}`}
                        onClick={() => {
                          handleExamClick(item.weekNumber);
                          if (!isLocked) onClose?.();
                        }}
                        style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                      >
                        <div className="next-topics-item-left">
                          <div className="next-topics-icon-container">
                            {isLocked ? (
                              <FaLock className="next-topics-lock-icon" title="Complete all week content to unlock" />
                            ) : (
                              <FaQuestionCircle className="next-topics-exam-icon" />
                            )}
                          </div>
                          <div className="next-topics-item-content">
                            <div className="next-topics-item-title">{item.title}</div>
                            <div className="next-topics-item-meta">
                              <span className="next-topics-meta-badge exam">
                                📝 Quiz/Assessment
                              </span>
                            </div>
                          </div>
                        </div>
                        {isLocked && <div className="next-topics-locked-badge">Locked</div>}
                      </div>
                    );
                  }
                  return null;
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        // Accordion Mode (unchanged)
        <div className="next-topics-exams-container">
          <div className="next-topics-header" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="next-topics-title">
              <span>📚 Upcoming Topics & Assessments</span>
            </div>
            <div className="next-topics-toggle">
              {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </div>
          </div>

          {isExpanded && (
            <div className="next-topics-list">
              {nextItems.length === 0 ? (
                <div className="next-topics-empty">
                  <p>No upcoming topics or exams</p>
                </div>
              ) : (
                nextItems.map((item) => {
                  const isLocked = item.isLocked;
                  const isCurrent = item.isCurrent;

                  if (item.type === 'day') {
                    return (
                      <div
                        key={item.id}
                        className={`next-topics-item next-topics-day ${isLocked ? 'locked' : ''} ${isCurrent ? 'current' : ''}`}
                        onClick={() => handleDayClick(item.weekNumber, item.dayNumber)}
                        style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                      >
                        <div className="next-topics-item-left">
                          <div className="next-topics-icon-container">
                            {isLocked ? (
                              <FaLock className="next-topics-lock-icon" title="Complete previous content to unlock" />
                            ) : (
                              <FaPlayCircle className="next-topics-play-icon" />
                            )}
                          </div>
                          <div className="next-topics-item-content">
                            <div className="next-topics-item-title">
                              Week {item.weekNumber} - {item.title}
                            </div>
                            <div className="next-topics-item-meta">
                              {item.hasVideo && (
                                <span className="next-topics-meta-badge">
                                  <FaPlayCircle size={12} /> Video
                                </span>
                              )}
                              {item.hasDocument && (
                                <span className="next-topics-meta-badge">
                                  <FaFileAlt size={12} /> Document
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isCurrent && <div className="next-topics-current-badge">Current</div>}
                        {isLocked && <div className="next-topics-locked-badge">Locked</div>}
                      </div>
                    );
                  } else if (item.type === 'exam') {
                    return (
                      <div
                        key={item.id}
                        className={`next-topics-item next-topics-exam ${isLocked ? 'locked' : ''}`}
                        onClick={() => handleExamClick(item.weekNumber)}
                        style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                      >
                        <div className="next-topics-item-left">
                          <div className="next-topics-icon-container">
                            {isLocked ? (
                              <FaLock className="next-topics-lock-icon" title="Complete all week content to unlock" />
                            ) : (
                              <FaQuestionCircle className="next-topics-exam-icon" />
                            )}
                          </div>
                          <div className="next-topics-item-content">
                            <div className="next-topics-item-title">{item.title}</div>
                            <div className="next-topics-item-meta">
                              <span className="next-topics-meta-badge exam">
                                📝 Quiz/Assessment
                              </span>
                            </div>
                          </div>
                        </div>
                        {isLocked && <div className="next-topics-locked-badge">Locked</div>}
                      </div>
                    );
                  }
                  return null;
                })
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
