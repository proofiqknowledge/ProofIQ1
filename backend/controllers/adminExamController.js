const Exam = require('../models/Exam');
const ExamSubmission = require('../models/ExamSubmission');

const ATTEMPTED_STATUSES = new Set(['submitted', 'graded']);

const getCandidateStatus = (status) => {
  switch (status) {
    case 'submitted':
    case 'graded':
      return 'submitted';
    case 'evaluated':
      return 'evaluated';
    case 'in_progress':
      return 'in_progress';
    default:
      return 'pending';
  }
};

const computePercentage = (submission) => {
  if (typeof submission.percentageScore === 'number' && !Number.isNaN(submission.percentageScore)) {
    return Number(submission.percentageScore.toFixed(2));
  }

  if (submission.totalMarksMax) {
    const percentage = (submission.totalMarksObtained / submission.totalMarksMax) * 100;
    return Number(Number.isFinite(percentage) ? percentage.toFixed(2) : 0);
  }

  return null;
};

const determineGrade = (percentage, { excellentMin, goodMin, averageMin, qualificationPercentage }) => {
  if (percentage === null || percentage === undefined) {
    return null;
  }

  const greenThreshold = excellentMin ?? 80;
  const amberThreshold = goodMin ?? 50;

  if (percentage >= greenThreshold) return 'Green';
  if (percentage >= amberThreshold) return 'Amber';
  return 'Red';
};

const buildCandidateRecord = (submission, thresholds) => {
  const attempted = ATTEMPTED_STATUSES.has(submission.status);
  const percentage = attempted ? computePercentage(submission) : null;
  const grade = attempted ? determineGrade(percentage, thresholds) : null;
  const qualified = attempted ? percentage >= thresholds.qualificationPercentage : false;
  const timeTakenSeconds = submission.timeSpent
    ? Math.max(0, submission.timeSpent)
    : (submission.startedAt && submission.submittedAt
      ? Math.max(0, Math.round((submission.submittedAt - submission.startedAt) / 1000))
      : null);

  const student = submission.student || {};
  const name = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown Candidate';
  const batchName = student.batch?.name || 'Unassigned';
  const batchId = student.batch?._id || null;

  return {
    userId: student._id || null,
    name,
    email: student.email || '',
    batchName,
    batchId,
    status: getCandidateStatus(submission.status),
    joinedAt: submission.createdAt || null,
    submittedAt: submission.submittedAt || null,
    timeTaken: timeTakenSeconds,
    percentage,
    grade,
    qualified,
    cheatingDetected: submission.cheatingDetected || false,
    cheatingLogs: submission.cheatingLogs || [], // ✅ Added cheatingLogs
    submissionId: submission._id,
  };
};

exports.getExamAnalytics = async (req, res) => {
  try {
    const { examId } = req.params;

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: 'Exam ID is required',
      });
    }

    const exam = await Exam.findById(examId)
      .select('title duration qualificationPercentage excellentMin goodMin averageMin questions assignedTo')
      .lean();

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    const submissions = await ExamSubmission.find({ exam: examId })
      .populate({
        path: 'student',
        select: 'name email role batch',
        populate: {
          path: 'batch',
          select: 'name'
        }
      })
      .lean();

    // Also fetch all assigned students who may not have submissions yet
    const User = require('../models/User');
    const assignedUserIds = exam.assignedTo?.users || [];
    const assignedStudents = await User.find({
      _id: { $in: assignedUserIds }
    })
      .populate('batch', 'name')
      .select('name email role batch')
      .lean();

    const assignedCount = assignedUserIds.length;
    const thresholds = {
      qualificationPercentage: exam.qualificationPercentage ?? 65,
      excellentMin: exam.excellentMin ?? 90,
      goodMin: exam.goodMin ?? 80,
      averageMin: exam.averageMin ?? 65,
    };

    // Build candidates from submissions
    const submissionCandidates = submissions
      .map((submission) => buildCandidateRecord(submission, thresholds));

    // Build candidates for assigned students without submissions
    const submittedStudentIds = new Set(submissions.map(s => s.student?._id?.toString()).filter(Boolean));
    const pendingCandidates = assignedStudents
      .filter(student => !submittedStudentIds.has(student._id.toString()))
      .map(student => ({
        userId: student._id,
        name: student.name || 'Unknown',
        email: student.email || '',
        batchName: student.batch?.name || 'Unassigned',
        batchId: student.batch?._id || null,
        status: 'pending',
        joinedAt: null,
        submittedAt: null,
        timeTaken: null,
        percentage: null,
        grade: null,
        qualified: false,
        cheatingDetected: false,
        submissionId: null,
      }));

    // Merge and sort all candidates
    const candidates = [...submissionCandidates, ...pendingCandidates]
      .sort((a, b) => a.name.localeCompare(b.name));

    const attemptedCandidates = candidates.filter((candidate) =>
      ['submitted', 'evaluated'].includes(candidate.status)
    );
    const attemptedCount = attemptedCandidates.length;
    const qualifiedCandidates = attemptedCandidates.filter((candidate) => candidate.qualified);
    const qualifiedCount = qualifiedCandidates.length;

    const passFail = {
      qualified: qualifiedCount,
      notQualified: attemptedCount - qualifiedCount,
    };

    const gradeDistribution = { green: 0, amber: 0, red: 0 };
    attemptedCandidates.forEach((candidate) => {
      switch (candidate.grade) {
        case 'Green':
          gradeDistribution.green += 1;
          break;
        case 'Amber':
          gradeDistribution.amber += 1;
          break;
        case 'Red':
        default:
          gradeDistribution.red += 1;
      }
    });

    const percentageQualified = attemptedCount > 0
      ? Number(((qualifiedCount / attemptedCount) * 100).toFixed(1))
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        exam,
        assignedCount,
        attemptedCount,
        qualifiedCount,
        percentageQualified,
        passFail,
        gradeDistribution,
        candidates,
      },
    });
  } catch (error) {
    console.error('Error generating assessment analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate assessment analytics',
      error: error.message,
    });
  }
};
