const ExamSubmission = require('../models/ExamSubmission');
const Exam = require('../models/Exam');
const mongoose = require('mongoose');  // ✅ ADDED: Required for re-exam completion logic
const axios = require('axios');
const { calculateTotalMarks, applyQualificationAndGrade } = require('../utils/examGrading');

// Fisher-Yates shuffle algorithm
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Start an exam
// Start/resume an exam for the logged-in student
// ✅ CONCURRENCY-SAFE: Uses atomic upsert to prevent race conditions
exports.startExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;

    if (!['Student', 'Admin', 'Master'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Only students (or admins/masters) can start exams" });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: "Assessment not found" });
    }

    // Generate question order (No Shuffling per user request)
    const questionIds = (exam.questions || []).map((q, idx) => String(q.id || q._id || idx));
    const shuffledOrder = questionIds; // No shuffling

    // ✅ ATOMIC OPERATION: findOneAndUpdate with upsert
    // This guarantees only ONE submission is created even under concurrent load
    const submission = await ExamSubmission.findOneAndUpdate(
      { exam: examId, student: studentId },
      {
        $setOnInsert: {
          exam: examId,
          student: studentId,
          questionOrder: shuffledOrder,
          status: "in_progress",
          startedAt: new Date(),
          answers: [],
          violationCount: 0
        }
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    console.log(`[DEBUG] startExam: Result for Student ${studentId} Exam ${examId}: ${submission._id} Status: ${submission.status}`);

    const populatedSubmission = await ExamSubmission.findById(submission._id)
      .populate("exam")
      .populate("student", "name email");

    res.status(200).json({
      success: true,
      message: "Assessment started",
      data: {
        exam,
        submission: populatedSubmission,
      },
    });

  } catch (err) {
    console.error("Start assessment error:", err);

    // ✅ Handle duplicate key error gracefully (E11000)
    if (err.code === 11000) {
      // Race condition detected - return existing submission
      try {
        const existingSubmission = await ExamSubmission.findOne({
          exam: req.params.examId,
          student: req.user.id
        })
          .populate("exam")
          .populate("student", "name email");

        return res.status(200).json({
          success: true,
          message: "Assessment already started",
          data: {
            exam: await Exam.findById(req.params.examId),
            submission: existingSubmission,
          },
        });
      } catch (fetchErr) {
        console.error("Error fetching existing submission:", fetchErr);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};



// Submit answer to a question
// Submit answer to a question (auto-create submission if missing; enforce attempts)
// NOTE: Changed — DO NOT auto-create a submission here. Require an active attempt.
exports.submitAnswer = async (req, res) => {
  try {
    const { examId, questionId } = req.params;
    const { answer, timeSpent = 0, violationCount = 0, cheatingLogs = [], cheatingDetected = false } = req.body || {};
    const studentId = req.user.id;

    // Load exam first (we need exam metadata)
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    // Force single attempt for all exams
    const maxAttempts = 1;

    // Try find an active submission for this student+exam
    console.log(`[DEBUG] submitAnswer: Looking for submission. ExamId: ${examId}, StudentId: ${studentId}`);

    let submission = await ExamSubmission.findOne({
      exam: examId,
      student: studentId,
      status: { $in: ['in_progress', 'pending'] }
    });

    if (submission) {
      console.log(`[DEBUG] submitAnswer: Found active submission ${submission._id}`);
    } else {
      console.log(`[DEBUG] submitAnswer: No active submission found.`);
    }

    // If not found, check if it's already submitted (idempotency)
    if (!submission) {
      const existingSubmission = await ExamSubmission.findOne({
        exam: examId,
        student: studentId
      });

      console.log(`[DEBUG] submitAnswer: Existing submission check: ${existingSubmission ? existingSubmission.status : 'null'}`);

      if (existingSubmission && ['submitted', 'graded', 'evaluated'].includes(existingSubmission.status)) {
        // Silently accept the "late" answer to avoid client errors, but don't save it
        return res.status(200).json({
          success: true,
          message: 'Exam already submitted (answer ignored)',
          data: {
            // Return dummy data to satisfy frontend expectations if needed
            submissionId: existingSubmission._id,
            questionId: questionId,
            marksObtained: 0,
            isCorrect: false
          }
        });
      }

      // ✅ RECOVERY: Auto-create submission if missing
      console.warn(`[RECOVERY] Auto-creating missing submission for ${studentId} exam ${examId}`);
      try {
        const questionIds = (exam.questions || []).map((q, idx) => String(q.id || q._id || idx));
        const shuffledOrder = questionIds; // No shuffling

        submission = await ExamSubmission.create({
          exam: examId,
          student: studentId,
          questionOrder: shuffledOrder,
          status: "in_progress",
          startedAt: new Date(),
          answers: [],
          violationCount: 0
        });
      } catch (createErr) {
        // Handle race condition if created in parallel
        if (createErr.code === 11000) {
          submission = await ExamSubmission.findOne({ exam: examId, student: studentId });
        } else {
          throw createErr;
        }
      }
    }

    // Normalize question id string
    const qId = String(questionId);

    // Find question from exam questions by id or fallback by index
    // Improved lookup: check both id and _id, and handle ObjectId vs String comparison
    let question = (exam.questions || []).find(q => {
      const qIdStr = q.id ? String(q.id) : null;
      const qObjIdStr = q._id ? String(q._id) : null;
      return qIdStr === qId || qObjIdStr === qId;
    });

    let resolvedQuestionId = qId;

    // ❌ REMOVED: Index-based fallback is unsafe with question shuffling
    // Questions MUST be matched by ID only (q.id or q._id)
    // With shuffling, array positions change - we cannot rely on index matching

    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // ✅ FIX: Validate answer BEFORE creating database entry
    // This prevents invalid/unanswered questions from persisting in submission.answers

    let answerData;

    // Validate and prepare answer data by question type
    if (question.type === 'mcq') {
      // MCQ validation
      if (answer.selectedOption === undefined || answer.selectedOption === null) {
        return res.status(400).json({
          success: false,
          message: 'MCQ answer must include selectedOption',
        });
      }

      const selectedIndex = answer.selectedOption;

      if (typeof selectedIndex !== 'number' || selectedIndex < 0 || selectedIndex >= question.options.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid option index for MCQ',
        });
      }

      // Validation passed - prepare answer data
      const correctOptionIndex = question.options?.findIndex(opt => opt.isCorrect === true);
      answerData = {
        selectedOption: selectedIndex,
        isCorrect: selectedIndex === correctOptionIndex,
        marksObtained: selectedIndex === correctOptionIndex ? (question.marks || 1) : 0,
        answered: true,
      };

    } else if (question.type === 'coding') {
      // Coding validation
      if (!answer.code || !answer.language) {
        return res.status(400).json({
          success: false,
          message: 'Coding answer must include code and language',
        });
      }

      // Validation passed - prepare answer data
      answerData = {
        code: answer.code,
        language: answer.language,
        // ✅ NEW: Persist lastRun state
        lastRun: answer.lastRun || false,
        lastRunCode: answer.lastRun ? answer.code : undefined, // only set if this is a "Run" action
        lastRunTimestamp: answer.timestamp || new Date(),

        judge0Status: 'pending',
        answered: true,
      };

    } else if (question.type === 'theory') {
      // Theory validation
      if (answer === undefined || answer === null) {
        return res.status(400).json({ success: false, message: 'Theory answer must include textAnswer' });
      }

      // Validation passed - prepare answer data
      answerData = {
        textAnswer: (answer.textAnswer !== undefined) ? answer.textAnswer : answer,
        answered: true,
      };

    } else {
      return res.status(400).json({ success: false, message: 'Unknown question type' });
    }

    // ✅ Validation passed! Now find or create answerEntry
    let answerEntry = (submission.answers || []).find(a => String(a.questionId) === String(resolvedQuestionId));

    if (!answerEntry) {
      // Create new entry only for valid answers
      answerEntry = {
        questionId: String(resolvedQuestionId),
        questionType: question.type,
        timeSpentOnQuestion: 0,
        marksMax: question.marks || 1,
      };
      submission.answers.push(answerEntry);
    }

    // Apply validated answer data to entry
    Object.assign(answerEntry, answerData);

    // For coding questions, trigger Judge0 asynchronously
    // ✅ FIX: Silent Auto-Save should NOT trigger Judge0
    // This allows saving the draft code without overwriting verified grades with 0s
    if (question.type === 'coding' && !answer.shouldSkipJudge) {
      submitToJudge0(answerEntry, question, submission._id).catch(err => {
        console.error('Judge0 submit error:', err);
      });
    } else if (question.type === 'coding' && answer.shouldSkipJudge) {
      console.log(`[submitAnswer] Silent auto-save for Q${resolvedQuestionId}: Skipped Judge0`);
    }

    // Update time spent on question and total time
    if (answer.timeSpent) {
      answerEntry.timeSpentOnQuestion = (Number(answerEntry.timeSpentOnQuestion) || 0) + Number(answer.timeSpent || 0);
      submission.timeSpent = (Number(submission.timeSpent) || 0) + Number(answer.timeSpent || 0);
    }

    // Update violation/cheating fields if provided
    if (typeof violationCount !== 'undefined') {
      submission.violationCount = Number(violationCount) || submission.violationCount || 0;
    }
    if (Array.isArray(cheatingLogs) && cheatingLogs.length > 0) {
      submission.cheatingLogs = (submission.cheatingLogs || []).concat(cheatingLogs);
    }
    if (cheatingDetected) {
      submission.cheatingDetected = true;
    }

    // Recompute progress counters
    submission.currentQuestionIndex = submission.currentQuestionIndex || 0;
    submission.questionsVisited = submission.questionsVisited || 0;
    submission.questionsAnswered = (submission.answers || []).filter(a => a.answered).length;
    submission.progressPercentage = calculateProgressPercentage(submission, exam);

    await submission.save();

    // If violations reached threshold, optionally auto-submit (3 or more)
    if (submission.violationCount >= 3 || submission.cheatingDetected === true) {
      try {
        submission.status = 'submitted';
        submission.submittedAt = new Date();
        submission.submissionReason = submission.submissionReason || 'auto-submitted due to violations';
        await submission.save();
        // Optionally kick grading pipeline here
      } catch (autoErr) {
        console.error('Auto-submit on violation error:', autoErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Answer saved',
      data: {
        submissionId: submission._id,
        questionId: resolvedQuestionId,
        marksObtained: answerEntry.marksObtained,
        isCorrect: answerEntry.isCorrect
      }
    });
  } catch (err) {
    console.error('Error in submitAnswer:', err);
    return res.status(500).json({ success: false, message: 'Failed to save answer', error: err.message });
  }
};

// Submit entire exam
// Submit entire exam (student final submit)
// NOTE: Changed — DO NOT auto-create a submission here. Require an active attempt.
exports.submitExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { submissionReason = '', violationCount = 0, cheatingLogs = [], cheatingDetected = false } = req.body || {};
    const studentId = req.user.id;

    // Find an active submission
    let submission = await ExamSubmission.findOne({
      exam: examId,
      student: studentId,
      status: { $in: ['in_progress', 'pending'] }
    });

    // If not found, check if it's already submitted (idempotency)
    if (!submission) {
      const existingSubmission = await ExamSubmission.findOne({
        exam: examId,
        student: studentId
      });

      if (existingSubmission && ['submitted', 'graded', 'evaluated'].includes(existingSubmission.status)) {
        return res.status(200).json({
          success: true,
          message: 'Exam already submitted',
          data: existingSubmission
        });
      }

      // ✅ RECOVERY: Auto-create submission if missing (and then we will submit it immediately below)
      console.warn(`[RECOVERY] Auto-creating missing submission for submitExam: ${studentId}`);
      try {
        const questionIds = (await Exam.findById(examId))?.questions?.map((q, idx) => String(q.id || q._id || idx)) || [];
        // Generate question order (No Shuffling per user request)
        const shuffledOrder = questionIds; // No shuffling

        submission = await ExamSubmission.create({
          exam: examId,
          student: studentId,
          questionOrder: shuffledOrder,
          status: "in_progress",
          startedAt: new Date(),
          answers: [],
          violationCount: 0
        });
      } catch (createErr) {
        if (createErr.code === 11000) {
          submission = await ExamSubmission.findOne({ exam: examId, student: studentId });
        } else {
          throw createErr;
        }
      }
    }

    // Merge incoming violation info
    if (typeof violationCount !== 'undefined') submission.violationCount = Number(violationCount) || submission.violationCount;
    if (Array.isArray(cheatingLogs) && cheatingLogs.length) submission.cheatingLogs = (submission.cheatingLogs || []).concat(cheatingLogs);
    if (cheatingDetected) submission.cheatingDetected = true;
    if (submissionReason) submission.submissionReason = submissionReason;

    // Prevent double submit
    if (['submitted', 'graded', 'evaluated'].includes(submission.status)) {
      return res.status(400).json({ success: false, message: 'This submission is already submitted' });
    }

    // Finalize
    submission.status = 'submitted';
    submission.submittedAt = new Date();

    // basic auto-scoring for MCQs if possible (non-destructive)
    try {
      const exam = await Exam.findById(examId);
      if (exam && Array.isArray(exam.questions) && Array.isArray(submission.answers)) {
        let totalMarks = 0;
        let obtained = 0;
        exam.questions.forEach(q => { totalMarks += (q.marks || 1); });
        submission.answers.forEach(ans => {
          if (ans && ans.questionType === 'mcq') {
            // Only score if question was actually answered
            if (ans.answered === true && typeof ans.isCorrect === 'boolean') {
              obtained += (ans.isCorrect ? (ans.marksObtained || (ans.marksMax || 1)) : 0);
            }
          }
        });
        submission.totalMarksMax = totalMarks;
        submission.totalMarksObtained = obtained;
        submission.percentageScore = totalMarks > 0 ? Math.round((obtained / totalMarks) * 100) : 0;
        submission.score = obtained;
        submission.percentage = submission.percentageScore;

        // ⭐ NEW: Mark module as completed immediately upon submission (Pass or Fail)
        if (exam.courseId && exam.weekNumber) {
          const User = require('../models/User');
          console.log(`[submitExam] Marking week ${exam.weekNumber} as completed for student ${studentId}`);

          await User.updateOne(
            { _id: studentId, "enrolledCourses.courseId": exam.courseId },
            { $addToSet: { "enrolledCourses.$.completedWeeks": Number(exam.weekNumber) } }
          );
        }
      }
    } catch (scoreErr) {
      console.warn('Auto-score error during submit:', scoreErr && scoreErr.message);
    }

    await submission.save();

    await submission.save();

    // ✅ FIX: Trigger grading immediately
    // This ensures that if there are no pending async questions (coding), the student gets their result immediately.
    await gradeSubmission(submission._id);

    // ✅ FIX: Mark re-exam request as 'completed' if this was a re-exam
    // This allows students to request another re-exam if needed
    console.log(`[submitExam] Checking for re-exam request: studentId=${studentId}, examId=${examId}`);
    try {
      const ReExamRequest = mongoose.model('ReExamRequest');
      const approvedReExamRequest = await ReExamRequest.findOne({
        studentId,
        examId,
        status: 'approved',
      });

      console.log(`[submitExam] Re-exam request found:`, approvedReExamRequest ? 'YES' : 'NO');

      if (approvedReExamRequest) {
        console.log(`[submitExam] Updating re-exam request ${approvedReExamRequest._id} to completed`);
        approvedReExamRequest.status = 'completed';
        approvedReExamRequest.completedAt = new Date();
        await approvedReExamRequest.save();
        console.log(`[submitExam] ✅ Marked re-exam request as completed for student ${studentId}, exam ${examId}`);
      } else {
        console.log(`[submitExam] No approved re-exam request found for student ${studentId}, exam ${examId}`);
      }
    } catch (reExamErr) {
      // Don't fail the submission if re-exam update fails
      console.error('[submitExam] ❌ Error updating re-exam request:', reExamErr);
    }

    // Reload submission to get the graded status and score
    const finalSubmission = await ExamSubmission.findById(submission._id).populate('exam');

    return res.status(200).json({ success: true, message: 'Exam submitted successfully', data: finalSubmission });
  } catch (err) {
    console.error('Error in submitExam:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit exam', error: err.message });
  }
};

// Get submission status
exports.getSubmissionStatus = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;
    const { cheatingLogs, violationCount, cheatingDetected, submissionReason } = req.body || {};

    // Find the most recent submission for this exam & student (covers old and new attempts)
    const submission = await ExamSubmission.findOne({
      exam: examId,
      student: studentId,
      status: { $in: ['in_progress', 'pending', 'submitted', 'graded', 'evaluated'] }
    })
      .sort({ createdAt: -1 })
      .populate('exam')
      .populate('student', 'name email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve submission status',
      error: err.message,
    });
  }
};

// ===== HELPER FUNCTIONS =====

// Helper: compute a naive progress percentage based on answers vs questions
function calculateProgressPercentage(submission, exam) {
  try {
    const totalQ = (exam.questions || []).length || 0;
    const answered = (submission.answers || []).filter(a => a.answered).length;
    if (totalQ === 0) return 0;
    return Math.round((answered / totalQ) * 100);
  } catch (e) {
    return submission.progressPercentage || 0;
  }
}

// Submit coding solution to Judge0
async function submitToJudge0(answerEntry, question, submissionId) {
  try {
    const judge0Url = process.env.JUDGE0_PUBLIC_URL || process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
    const judge0Mode = process.env.JUDGE0_MODE || 'public';

    console.log(`[Judge0] Using ${judge0Mode} mode with URL: ${judge0Url}`);

    const languageMap = {
      javascript: 63,
      python: 71,
      cpp: 54,
      java: 62,
      c: 50,
    };

    const languageId = languageMap[answerEntry.language?.toLowerCase()] || 63;

    if (!answerEntry.code || !answerEntry.code.trim()) {
      console.error('Empty code submitted to Judge0');
      answerEntry.judge0Status = 'error: empty code';
      return;
    }

    // Use first test case input
    const testInput = question.testCases?.[0]?.input || '';

    // Build headers based on Judge0 mode
    const headers = { 'Content-Type': 'application/json' };
    const judge0ApiKey = process.env.JUDGE0_RAPIDAPI_KEY;

    if (judge0Mode === 'rapidapi' && judge0ApiKey) {
      headers['X-RapidAPI-Key'] = judge0ApiKey;
      headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
    }

    const response = await axios.post(
      `${judge0Url}/submissions?base64_encoded=false&wait=false`,
      {
        source_code: answerEntry.code,
        language_id: languageId,
        stdin: testInput,
      },
      {
        headers,
        timeout: 10000,
      }
    );

    if (!response.data || !response.data.token) {
      throw new Error('Invalid response from Judge0');
    }

    answerEntry.judge0SubmissionId = response.data.token;
    answerEntry.judge0Status = 'pending';

    // Save immediately
    const submission = await ExamSubmission.findById(submissionId);
    if (submission) {
      await submission.save();
    }

    // Poll for result (async, don't wait)
    pollJudge0Result(response.data.token, submissionId, answerEntry.questionId, question).catch(err => {
      console.error('Error in pollJudge0Result:', err);
    });
  } catch (err) {
    console.error('Judge0 submission error:', err);
    answerEntry.judge0Status = `error: ${err.message || 'Unknown error'}`;

    // Try to save error status
    try {
      const submission = await ExamSubmission.findById(submissionId);
      if (submission) {
        const entry = submission.answers.find(a => a.questionId?.toString() === answerEntry.questionId?.toString());
        if (entry) {
          entry.judge0Status = answerEntry.judge0Status;
          await submission.save();
        }
      }
    } catch (saveErr) {
      console.error('Error saving Judge0 error status:', saveErr);
    }
  }
}

// Poll Judge0 for result
async function pollJudge0Result(token, submissionId, questionId, question, attempts = 0) {
  const MAX_ATTEMPTS = 15;
  const POLL_INTERVAL = 1500; // 1.5 seconds

  if (attempts >= MAX_ATTEMPTS) {
    console.log(`Judge0 polling timeout for token: ${token} after ${MAX_ATTEMPTS} attempts`);

    // Mark as timeout
    try {
      const submission = await ExamSubmission.findById(submissionId);
      const answerEntry = submission.answers.find(a => a.questionId?.toString() === questionId?.toString());
      if (answerEntry) {
        answerEntry.judge0Status = 'timeout';
        answerEntry.isCorrect = false;
        answerEntry.marksObtained = 0;
        await submission.save();
        await calculateTotalMarks(submission);
      }
    } catch (err) {
      console.error('Error updating timeout status:', err);
    }
    return;
  }

  try {
    const judge0Url = process.env.JUDGE0_PUBLIC_URL || process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
    const judge0Mode = process.env.JUDGE0_MODE || 'public';

    // Build headers based on Judge0 mode
    const headers = { 'Content-Type': 'application/json' };
    const judge0ApiKey = process.env.JUDGE0_RAPIDAPI_KEY;

    if (judge0Mode === 'rapidapi' && judge0ApiKey) {
      headers['X-RapidAPI-Key'] = judge0ApiKey;
      headers['X-RapidAPI-Host'] = 'judge0-ce.p.rapidapi.com';
    }

    const response = await axios.get(
      `${judge0Url}/submissions/${token}?base64_encoded=true`,  // ✅ FIX: Use base64 to avoid UTF-8 errors
      {
        headers,
        timeout: 5000,
      }
    );

    const result = response.data;

    // ✅ FIX: Decode Base64 encoded fields
    if (result.stdout) {
      result.stdout = Buffer.from(result.stdout, 'base64').toString('utf-8');
    }
    if (result.stderr) {
      result.stderr = Buffer.from(result.stderr, 'base64').toString('utf-8');
    }
    if (result.compile_output) {
      result.compile_output = Buffer.from(result.compile_output, 'base64').toString('utf-8');
    }

    // Status IDs: 1=In Queue, 2=Processing, 3=Accepted, 4+=Various errors
    if (result.status.id === 1 || result.status.id === 2) {
      // Still processing - poll again
      setTimeout(() => {
        pollJudge0Result(token, submissionId, questionId, question, attempts + 1);
      }, POLL_INTERVAL);
      return;
    }

    // Processing complete - update submission
    const submission = await ExamSubmission.findById(submissionId);
    if (!submission) {
      console.error('Submission not found for Judge0 result update');
      return;
    }

    const answerEntry = submission.answers.find(a =>
      a.questionId?.toString() === questionId?.toString()
    );

    if (!answerEntry) {
      console.error('Answer entry not found for Judge0 result update');
      return;
    }

    // Update status and output
    answerEntry.judge0Status = result.status.description || 'completed';
    answerEntry.judge0Output = result.stdout || result.stderr || '';

    // Grade based on test cases
    if (result.status.id === 3) {
      // Accepted - check all test cases
      const testCases = question.testCases || [];
      let allPassed = true;

      if (testCases.length > 0) {
        // For now, check first test case (can be enhanced to check all)
        const firstTestCase = testCases[0];
        const expectedOutput = (firstTestCase.expectedOutput || '').trim();
        const actualOutput = (result.stdout || '').trim();
        allPassed = actualOutput === expectedOutput;
      }

      if (allPassed) {
        answerEntry.isCorrect = true;
        answerEntry.marksObtained = question.marks || 1;
      } else {
        answerEntry.isCorrect = false;
        answerEntry.marksObtained = 0;
      }
    } else {
      // Compilation error, runtime error, etc.
      answerEntry.isCorrect = false;
      answerEntry.marksObtained = 0;
    }


    await submission.save();

    await submission.save();

    // ✅ FIX: Trigger grading checks if the exam is already submitted
    // This ensures that when the last async question finishes, the exam status moves to 'graded'
    if (submission.status === 'submitted' || submission.status === 'in_progress') {
      console.log(`[Judge0] Triggering grade check for submission ${submissionId}`);
      await gradeSubmission(submissionId);
    }

    console.log(`Judge0 grading complete for question ${questionId}: ${answerEntry.isCorrect ? 'PASSED' : 'FAILED'}`);
  } catch (err) {
    console.error('Error polling Judge0:', err);

    // Retry on network errors
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || err.response?.status >= 500) {
      if (attempts < MAX_ATTEMPTS - 1) {
        setTimeout(() => {
          pollJudge0Result(token, submissionId, questionId, question, attempts + 1);
        }, POLL_INTERVAL);
      }
    }
  }
}

// Grade submission (handle coding + theory)
async function gradeSubmission(submissionId) {
  try {
    const submission = await ExamSubmission.findById(submissionId).populate('exam');
    if (!submission) {
      console.error('Submission not found for grading');
      return;
    }

    // Check if all questions are graded
    const allAnswers = submission.answers || [];
    const theoryAnswers = allAnswers.filter(a => a.questionType === 'theory');
    const codingAnswers = allAnswers.filter(a => a.questionType === 'coding');
    console.log(`[GRADE] Filtered counts for ${submission._id}: theory=${theoryAnswers.length}, coding=${codingAnswers.length}`);

    // Check if coding answers are still pending
    const pendingCoding = codingAnswers.some(a =>
      a.judge0Status === 'pending' || !a.judge0Status || a.isCorrect === undefined
    );
    if (pendingCoding) console.log(`[GRADE] Detected pending coding answers for ${submission._id}`);

    // Theory questions need manual grading
    const hasTheoryPending = theoryAnswers.some(a => a.isCorrect === null || a.isCorrect === undefined);
    if (hasTheoryPending) console.log(`[GRADE] Detected pending theory answers for ${submission._id}`);

    if (hasTheoryPending || pendingCoding) {
      console.log(`[GRADE] Setting status to 'submitted' (awaiting evaluation) for ${submission._id}`);
      submission.awaitingEvaluation = true;
      submission.status = 'submitted';
    } else {
      console.log(`[GRADE] All automated/manual requirements met. Setting status to 'graded' for ${submission._id}`);
      submission.awaitingEvaluation = false;
      submission.status = 'graded';
      submission.submitted = true;
      submission.evaluated = true;
      submission.gradedAt = new Date();
      submission.evaluatedAt = new Date();
      await calculateTotalMarks(submission);
      submission.totalMarks = submission.totalMarksMax;
      submission.score = submission.totalMarksObtained;
      submission.percentage = submission.percentageScore;
      // Apply qualification and grade based on percentage
      await applyQualificationAndGrade(submission);

      // ⭐ NEW: Mark module as completed upon grading finalization
      if (submission.exam && submission.exam.courseId && submission.exam.weekNumber) {
        const User = require('../models/User');
        console.log(`[gradeSubmission] Marking week ${submission.exam.weekNumber} as completed for student ${submission.student}`);

        await User.updateOne(
          { _id: submission.student, "enrolledCourses.courseId": submission.exam.courseId },
          { $addToSet: { "enrolledCourses.$.completedWeeks": Number(submission.exam.weekNumber) } }
        );
      }
    }

    await submission.save();
  } catch (err) {
    console.error('Error grading submission:', err);
  }
}

// ✅ Get exam attempts for a student
exports.getExamAttempts = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;

    // Count submissions (attempts) for this student on this exam
    const submissions = await ExamSubmission.find({
      exam: examId,
      student: studentId,
    }).select('attemptNumber status qualified percentageScore grade gradeColor createdAt');

    const completedAttempts = submissions.filter(s =>
      ['submitted', 'graded', 'evaluated'].includes(s.status)
    );

    const attemptsUsed = completedAttempts.length;

    // Determine max attempts based on exam type
    // Force single attempt for all exams
    const maxAttempts = 1;
    const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed);

    // Check if student passed any attempt
    const qualified = completedAttempts.some(s => s.qualified === true);

    res.status(200).json({
      success: true,
      data: {
        attemptsUsed,
        attemptsRemaining,
        maxAttempts,
        qualified,
        submissions: submissions.map(s => ({
          attemptNumber: s.attemptNumber,
          status: s.status,
          qualified: s.qualified,
          grade: s.grade,
          gradeColor: s.gradeColor,
          percentage: s.percentageScore,
          attemptedAt: s.createdAt,
        })),
      },
      message: 'Assessment attempts retrieved successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to get assessment attempts',
      error: err.message,
    });
  }
};

// === REPLACED saveAnswer/answer handler ===
exports.saveAnswer = async (req, res) => {
  try {
    const { examId, questionId } = req.params;
    const { answer, timeSpent = 0 } = req.body || {};
    const studentId = req.user.id;

    // Try find an active submission
    let submission = await ExamSubmission.findOne({ exam: examId, student: studentId, status: { $in: ['in_progress', 'pending'] } });

    // If no active submission, require explicit start
    if (!submission) {
      return res.status(403).json({
        success: false,
        message: "Assessment attempt not started. Please start assessment first."
      });
    }

    // Ensure answers is array
    if (!Array.isArray(submission.answers)) submission.answers = [];

    // Upsert the answer for the questionId
    const existingIndex = submission.answers.findIndex(a => String(a.questionId) === String(questionId));
    const answerPayload = {
      questionId,
      answer,
      answeredAt: new Date(),
      timeSpent: Number(timeSpent) || 0
    };

    if (existingIndex >= 0) {
      submission.answers[existingIndex] = { ...submission.answers[existingIndex], ...answerPayload };
    } else {
      submission.answers.push(answerPayload);
    }

    // update timeSpent cumulatively
    submission.timeSpent = (Number(submission.timeSpent) || 0) + (Number(timeSpent) || 0);

    await submission.save();

    return res.status(200).json({
      success: true,
      message: 'Answer saved',
      data: submission
    });
  } catch (err) {
    console.error('Error saving answer:', err);
    return res.status(500).json({ success: false, message: 'Failed to save answer', error: err.message });
  }
};

module.exports = exports;
