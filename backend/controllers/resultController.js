const Exam = require('../models/Exam');
const User = require('../models/User');
const mongoose = require('mongoose');
const ExamSubmission = require('../models/ExamSubmission');
const { calculateTotalMarks, applyQualificationAndGrade } = require('../utils/examGrading');

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  return String(value);
};

const asAnswerMap = (answersPayload = []) => {
  if (!answersPayload) return new Map();

  if (Array.isArray(answersPayload)) {
    return new Map(
      answersPayload
        .filter((entry) => entry && entry.questionId)
        .map((entry) => [normalizeId(entry.questionId), entry])
    );
  }

  if (typeof answersPayload === 'object') {
    return new Map(
      Object.entries(answersPayload).map(([questionId, entry]) => [normalizeId(questionId), entry])
    );
  }

  return new Map();
};

exports.submitCodingExam = async (req, res) => {
  try {
    const {
      examId,
      answers,
      cheatingLogs,
      violationCount,
      cheatingDetected,
      submissionReason
    } = req.body || {};

    const studentId = req.user.id;

    if (!examId) {
      return res.status(400).json({ success: false, message: 'examId is required' });
    }

    if (!answers) {
      return res.status(400).json({ success: false, message: 'answers payload is required' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const codingQuestions = (exam.questions || []).filter((q) => q.type === 'coding');
    if (!codingQuestions.length) {
      return res.status(400).json({ success: false, message: 'Exam does not contain coding questions' });
    }

    let submission = await ExamSubmission.findOne({ exam: examId, student: studentId });
    if (!submission) {
      submission = new ExamSubmission({
        exam: examId,
        student: studentId,
        status: 'in_progress',
        startedAt: new Date(),
        answers: [],
      });
    }

    submission.status = 'submitted';
    submission.submitted = true;
    submission.submittedAt = submission.submittedAt || new Date();
    if (submission.startedAt) {
      submission.timeSpent = Math.floor((new Date() - submission.startedAt) / 1000);
    } else {
      submission.startedAt = new Date();
      submission.timeSpent = 0;
    }
    submission.awaitingEvaluation = false;

    // Handle cheating logs
    if (Array.isArray(cheatingLogs)) {
      submission.cheatingLogs = cheatingLogs.map((log) => ({
        time: log?.time ? new Date(log.time) : new Date(),
        type: log?.type ? String(log.type).slice(0, 120) : 'Violation',
        details: log?.details ? String(log.details).slice(0, 500) : '',
      }));
      submission.markModified('cheatingLogs');
    }

    if (typeof violationCount === 'number' && violationCount >= 0) {
      submission.violationCount = Math.floor(violationCount);
    }

    if (submissionReason) {
      submission.submissionReason = String(submissionReason).slice(0, 200);
    }

    const isAutoSubmit = submissionReason &&
      (String(submissionReason).toLowerCase().includes('auto') ||
        String(submissionReason).toLowerCase().includes('violation'));

    if (typeof cheatingDetected === 'boolean') {
      submission.cheatingDetected = cheatingDetected;
    } else if (isAutoSubmit || (Array.isArray(cheatingLogs) && cheatingLogs.length > 0) ||
      (typeof violationCount === 'number' && violationCount >= 3)) {
      submission.cheatingDetected = true;
    }

    const answerMap = asAnswerMap(answers);
    if (
      answerMap.size === 0 &&
      codingQuestions.length === 1 &&
      answers &&
      typeof answers === 'object' &&
      !Array.isArray(answers)
    ) {
      const fallbackQuestionId = normalizeId(codingQuestions[0].id || codingQuestions[0]._id);
      answerMap.set(fallbackQuestionId, answers);
    }

    // ✅ OPTIMIZED: Process questions in parallel
    await Promise.all(codingQuestions.map(async (question) => {
      // Prefer the stable question.id string when present, but be tolerant of either id/_id
      const questionIdPreferred = normalizeId(question.id || question._id);
      const questionIdById = normalizeId(question.id);
      const questionIdByObjectId = normalizeId(question._id);

      // Look up the payload using any of the possible identifiers that might have been sent
      // from the frontend (some flows used _id, others the custom id field).
      let payload =
        answerMap.get(questionIdPreferred) ||
        (questionIdById && answerMap.get(questionIdById)) ||
        (questionIdByObjectId && answerMap.get(questionIdByObjectId)) ||
        {};

      const rawCode = payload.code ?? payload.source ?? '';
      const language = payload.language || question.language || 'javascript';

      // Use the same preferred ID when storing the answer, so future lookups are consistent
      const storedQuestionId = questionIdPreferred;

      // ✅ FIX: Hydrate code from DB if missing in payload (Partial Payload Handling)
      // If the user didn't visit/submit this question in the current "Submit" action,
      // we should fall back to what's saved in the database (from auto-saves or runs).
      if ((!rawCode || !rawCode.trim()) && submission && Array.isArray(submission.answers)) {
        const savedAnswer = submission.answers.find(a => String(a.questionId) === storedQuestionId);
        if (savedAnswer && savedAnswer.code) {
          console.log(`[submitCodingExam] Hydrating missing code for question ${storedQuestionId} from DB`);
          // We use the DB code as the "payload" effectively
          // We assign it to rawCode logic below (conceptually)
          // But since rawCode is const, we'll handle it by checking if submissionCode is empty below
        }
      }

      // HTML decode function to fix &lt; &gt; etc.
      const decodeHTMLEntities = (str) => {
        if (!str) return str;
        return str
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
      };

      // Decode HTML entities in student code
      let submissionCode = typeof rawCode === 'string' ? decodeHTMLEntities(rawCode) : '';

      // ✅ RE-APPLY HYDRATION: If submissionCode is still empty, try to get from DB
      if (!submissionCode && submission && Array.isArray(submission.answers)) {
        const savedAnswer = submission.answers.find(a => String(a.questionId) === storedQuestionId);
        if (savedAnswer && savedAnswer.code) {
          submissionCode = decodeHTMLEntities(savedAnswer.code);
          // Also trust the language from DB if not provided
          // Logic handled by using savedAnswer.language below if needed,
          // but typically language fallback is handled by `language` const above.
          // We should update the language too if we hydrated the code!
        }
      }

      // Debug: Log if HTML entities were decoded
      if (rawCode !== submissionCode) {
        console.log('🔍 HTML entities decoded in student code for question:', storedQuestionId);
        console.log('Before:', rawCode.substring(0, 100));
        console.log('After:', submissionCode.substring(0, 100));
      }

      let answerEntry = submission.answers.find(
        (answer) => normalizeId(answer.questionId) === storedQuestionId
      );

      // ✅ REMOVED: Buggy duplicate check was preventing evaluation
      // The check caused questions to be skipped when marksObtained was 0

      if (!answerEntry) {
        // ✅ FIX: Use submission.answers.create() to get a Mongoose Subdoc.
        // If we push a plain object, answerEntry remains a plain object reference,
        // so setting properties on it later won't update the subdoc in the array.
        answerEntry = submission.answers.create({
          questionId: storedQuestionId,
          questionType: 'coding',
          marksMax: question.marks || 1,
        });
        submission.answers.push(answerEntry);
      }

      // Try to find the latest submission for this question
      // Try to find the latest submission for this question using any of the id variants
      const questionIdCandidates = [questionIdPreferred, questionIdById, questionIdByObjectId].filter(Boolean);

      console.log('[submitCodingExam] Looking for submission:', {
        studentId,
        questionIdCandidates,
        language,
        examId
      });

      // ✅ CRITICAL FIX: Remove 10-minute window, use examId for session tracking
      // OLD BUG: Only searched last 10 minutes, causing loss of marks in 90-minute exams
      // NEW: Search entire exam session using examId

      console.log('[submitCodingExam] Query:', {
        examId: examId,
        userId: studentId,
        questionId: { $in: questionIdCandidates },
        language: language,
        runType: { $in: ['final', 'auto_final'] }
      });

      const latestSubmission = await mongoose.model('Submission').findOne({
        examId: examId,  // ✅ Use exam session (not time window)
        userId: studentId,
        questionId: { $in: questionIdCandidates },
        language: language,
        runType: { $in: ['final', 'auto_final', 'all', 'test_all'] }  // ✅ Include all valid run types
      }).sort({ createdAt: -1 });

      console.log('[submitCodingExam] Found submission:', latestSubmission ? {
        id: latestSubmission._id,
        questionId: latestSubmission.questionId,
        hasSource: !!latestSubmission.source,
        sourceLength: latestSubmission.source?.length,
        passed: latestSubmission.passed,
        total: latestSubmission.total,
        runType: latestSubmission.runType
      } : 'NULL - Will check for auto-execute');

      const testCases = Array.isArray(question.testCases) ? question.testCases : [];

      answerEntry.code = submissionCode;
      answerEntry.language = language;
      answerEntry.marksMax = question.marks || 1;

      if (latestSubmission) {
        // Use the results from the judge submission
        // CRITICAL: If payload didn't have code, retrieve it from the submission
        if (!answerEntry.code && latestSubmission.source) {
          answerEntry.code = latestSubmission.source;
        }
        if (!answerEntry.language && latestSubmission.language) {
          answerEntry.language = latestSubmission.language;
        }

        answerEntry.judge0Status = latestSubmission.status || 'Submitted';
        answerEntry.judge0Output = ''; // Could store stdout if needed
        answerEntry.testCasesPassed = latestSubmission.passed || 0;
        answerEntry.testCasesFailed = (latestSubmission.total || 0) - (latestSubmission.passed || 0);
        answerEntry.testCaseResults = latestSubmission.results || [];

        // ✅ FIX: Award proportional marks based on test case pass rate
        // Example: 2/3 tests passed → (2/3) * marksMax
        const testCasePassRate = latestSubmission.total > 0
          ? latestSubmission.passed / latestSubmission.total
          : 0;
        answerEntry.marksObtained = Math.round(testCasePassRate * answerEntry.marksMax * 100) / 100;
        answerEntry.isCorrect = latestSubmission.passed === latestSubmission.total;
      } else {
        // No submission found - check if code exists and auto-execute it
        if (submissionCode && submissionCode.trim()) {
          // ✅ AUTO-EXECUTE: Code exists but was never run
          console.log(`[AUTO-EXECUTE] Running unexecuted code for question ${storedQuestionId}`);

          // ✅ CRITICAL FIX: Decode HTML entities in mainBlock
          // The mainBlock often contains &lt; and &gt; instead of < and >
          const decodeHTMLEntitiesInternal = (str) => {
            if (!str) return str;
            return str
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
          };

          const decodedMainBlock = decodeHTMLEntitiesInternal(question.mainBlock || '');

          console.log(`[AUTO-EXECUTE] Student code:`, submissionCode.substring(0, 200));
          console.log(`[AUTO-EXECUTE] Main block (RAW):`, question.mainBlock ? question.mainBlock.substring(0, 200) : 'MISSING!');
          console.log(`[AUTO-EXECUTE] Main block (DECODED):`, decodedMainBlock ? decodedMainBlock.substring(0, 200) : 'MISSING!');
          console.log(`[AUTO-EXECUTE] Language:`, language);

          try {
            // Import required modules
            const { runJudge0 } = require('../services/judge0Service');
            const { generateFullCode } = require('../utils/templateGenerator');

            // Generate full executable code with DECODED mainBlock
            const fullCode = generateFullCode({
              userCode: submissionCode,
              mainBlock: decodedMainBlock,
              language: language
            });

            console.log(`[AUTO-EXECUTE] Full code length:`, fullCode.length);
            console.log(`[AUTO-EXECUTE] Full code preview:`, fullCode.substring(0, 300));
            console.log(`[AUTO-EXECUTE] Test cases count:`, testCases.length);

            const results = [];
            let passed = 0;

            // Execute against each test case
            for (const testCase of testCases) {
              console.log(`[AUTO-EXECUTE] Running test case:`, { input: testCase.input, expected: testCase.expectedOutput });

              const judgeRes = await runJudge0({
                source_code: fullCode,
                language: language,
                stdin: testCase.input || ''
              });

              console.log(`[AUTO-EXECUTE] Judge0 response:`, {
                stdout: judgeRes.stdout,
                stderr: judgeRes.stderr,
                status: judgeRes.status
              });

              const actualOutput = (judgeRes.stdout || '').trim();
              const expectedOutput = (testCase.expectedOutput || '').trim();
              const isPassed = actualOutput === expectedOutput;

              if (isPassed) passed++;

              results.push({
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: actualOutput,
                passed: isPassed,
                status: judgeRes.status,
                stderr: judgeRes.stderr,
                compile_output: judgeRes.compile_output
              });
            }

            // Save the auto-executed submission
            const autoSubmission = await mongoose.model('Submission').create({
              examId: examId,
              questionId: storedQuestionId,
              userId: studentId,
              language: language,
              source: submissionCode,
              results: results,
              passed: passed,
              total: testCases.length,
              runType: 'auto_final'
            });

            console.log(`[AUTO-EXECUTE] Completed for question ${storedQuestionId}:`, {
              passed,
              total: testCases.length,
              submissionId: autoSubmission._id
            });

            // Use the auto-execution results for grading
            answerEntry.judge0Status = 'Auto-executed';
            answerEntry.judge0Output = '';
            answerEntry.testCasesPassed = passed;
            answerEntry.testCasesFailed = testCases.length - passed;
            answerEntry.testCaseResults = results;
            answerEntry.marksObtained = Math.round((passed / testCases.length) * answerEntry.marksMax * 100) / 100;
            answerEntry.isCorrect = passed === testCases.length;

          } catch (autoExecError) {
            console.error(`[AUTO-EXECUTE] Error for question ${storedQuestionId}:`, autoExecError);
            console.error(`[AUTO-EXECUTE] Error stack:`, autoExecError.stack);
            // If auto-execution fails, give 0 marks but log the error
            answerEntry.judge0Status = 'Auto-execution failed';
            answerEntry.judge0Output = autoExecError.message;
            answerEntry.testCasesPassed = 0;
            answerEntry.testCasesFailed = testCases.length;
            answerEntry.marksObtained = 0;
            answerEntry.isCorrect = false;
          }
        } else {
          // No code at all - 0 marks
          answerEntry.judge0Status = 'No code submitted';
          answerEntry.judge0Output = '';
          answerEntry.testCasesPassed = 0;
          answerEntry.testCasesFailed = testCases.length;
          answerEntry.testCaseResults = [];
          answerEntry.marksObtained = 0;
          answerEntry.isCorrect = false;
        }
      }

      console.log('[submitCodingExam] Answer entry after processing:', {
        questionId: answerEntry.questionId,
        testCasesPassed: answerEntry.testCasesPassed,
        testCasesFailed: answerEntry.testCasesFailed,
        marksMax: answerEntry.marksMax,
        marksObtained: answerEntry.marksObtained,
        isCorrect: answerEntry.isCorrect
      });
    }));

    submission.markModified('answers');

    // ✅ FIX: Calculate totals on the in-memory object BEFORE saving
    // This avoids race conditions where a concurrent auto-save might verify the DB state
    await calculateTotalMarks(submission);

    // Ensure these are set on the object before qualification check
    submission.totalMarks = submission.totalMarksMax;
    submission.score = submission.totalMarksObtained;

    await applyQualificationAndGrade(submission);

    // ✅ Mark as graded since all coding questions are auto-evaluated
    submission.status = 'graded';
    submission.gradedAt = new Date();

    // Final save of all changes (marks, totals, status)
    await submission.save();

    // ✅ FIX: Mark re-exam request as 'completed' if this was a re-exam
    // This allows students to request another re-exam if needed
    try {
      const ReExamRequest = mongoose.model('ReExamRequest');
      const approvedReExamRequest = await ReExamRequest.findOne({
        studentId,
        examId,
        status: 'approved',
      });

      if (approvedReExamRequest) {
        approvedReExamRequest.status = 'completed';
        approvedReExamRequest.completedAt = new Date();
        await approvedReExamRequest.save();
        console.log(`[submitCodingExam] Marked re-exam request as completed for student ${studentId}, exam ${examId}`);
      }
    } catch (reExamErr) {
      // Don't fail the submission if re-exam update fails
      console.error('[submitCodingExam] Error updating re-exam request:', reExamErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Exam submitted successfully',
      data: {
        submissionId: submission._id,
        marksObtained: submission.totalMarksObtained,
        totalMarks: submission.totalMarksMax,
        percentage: submission.percentage,
        grade: submission.grade,
        gradeColor: submission.gradeColor,
        qualified: submission.qualified,
      },
    });
  } catch (err) {
    console.error('Error in submitCodingExam:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit exam',
      error: err.message,
    });
  }
};
