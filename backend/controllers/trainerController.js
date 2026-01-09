// backend/controllers/trainerController.js

const Batch = require('../models/Batch');
const Course = require('../models/Course');
const CourseContentProposal = require('../models/CourseContentProposal');
const User = require('../models/User');
const ExamResult = require('../models/ExamResult');
const Exam = require('../models/Exam');
const ExamSubmission = require('../models/ExamSubmission');
const mongoose = require('mongoose');

// ---------------------------------------------------------------------------
// Fetch all batches assigned to the logged-in trainer
// ---------------------------------------------------------------------------
exports.getTrainerBatches = async (req, res) => {
  try {
    const trainerId = req.user.id;

    const batches = await Batch.find({ trainer: trainerId })
      .populate('users', 'name email rewardPoints')
      .populate('course', 'title description')
      .lean();

    const normalized = batches.map(b => ({
      ...b,
      students: b.users || [],
    }));

    res.status(200).json(normalized);
  } catch (error) {
    console.error('Error fetching trainer batches:', error);
    res.status(500).json({ message: 'Error fetching trainer batches' });
  }
};

// ---------------------------------------------------------------------------
// Fetch all students under a specific batch for trainer
// ---------------------------------------------------------------------------
exports.getBatchStudents = async (req, res) => {
  try {
    const id = req.params.id;
    const batch = await Batch.findById(id)
      .populate('users', 'name email rewardPoints')
      .populate('trainer', 'name');

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Ensure only assigned trainer can view this batch
    if (batch.trainer?._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(batch.users || []);
  } catch (error) {
    console.error('Error fetching batch students:', error);
    res.status(500).json({ message: 'Error fetching batch students' });
  }
};

// ---------------------------------------------------------------------------
// Fetch trainer’s assigned courses
// ---------------------------------------------------------------------------
// ✅ Fetch all courses assigned to this trainer (by admin)
exports.getTrainerCourses = async (req, res) => {
  try {
    const trainerId = req.user.id;

    const courses = await Course.find({
      $or: [
        { assignedTrainers: trainerId },
        { trainer: trainerId }
      ]
    })
      .populate('createdBy', 'name role email')
      .select('title description createdBy status weeks')
      .lean();

    res.status(200).json(courses);
  } catch (error) {
    console.error('Error fetching trainer courses:', error);
    res.status(500).json({ message: 'Error fetching trainer courses' });
  }
};


// ---------------------------------------------------------------------------
// Get all course content proposals created by this trainer
// ---------------------------------------------------------------------------
exports.getPendingProposals = async (req, res) => {
  try {
    const trainerId = req.user.id;

    const pending = await CourseContentProposal.find({
      proposedBy: trainerId,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(pending);
  } catch (error) {
    console.error('Error fetching trainer content proposals:', error);
    res.status(500).json({ message: 'Error fetching trainer content proposals' });
  }
};

// ---------------------------------------------------------------------------
// Trainer proposes new course content (requires admin approval)
// ---------------------------------------------------------------------------
exports.proposeCourse = async (req, res) => {
  try {
    const trainerId = req.user.id;
    const { title, description, weeks } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Course title is required' });
    }

    const proposal = await CourseContentProposal.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      totalWeeks: weeks ? Number(weeks) : 0,
      proposedBy: trainerId,
    });

    res.status(201).json({
      message: 'Course content proposal submitted successfully!',
      proposal,
    });
  } catch (error) {
    console.error('Error submitting course content proposal:', error);
    res.status(500).json({ message: 'Error submitting course content proposal' });
  }
};

// ---------------------------------------------------------------------------
// Fetch progress of a specific student under a specific course
// ---------------------------------------------------------------------------
exports.getStudentCourseProgress = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    const student = await User.findById(studentId)
      .populate('enrolledCourses.courseId', 'title weeks')
      .lean();

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const enrollment = (student.enrolledCourses || []).find(ec => {
      if (!ec) return false;
      if (ec.courseId && ec.courseId._id) {
        return ec.courseId._id.toString() === courseId;
      }
      return String(ec.courseId) === courseId;
    });

    if (!enrollment) {
      return res.status(404).json({ message: 'Student is not enrolled in this course' });
    }

    const course = enrollment.courseId || {};

    // Count total modules/days that contain a video
    let totalModules = 0;
    if (course.weeks && Array.isArray(course.weeks)) {
      for (const wk of course.weeks) {
        if (wk.days && Array.isArray(wk.days)) {
          for (const d of wk.days) {
            if (d && (d.videoUrl || d.videoGridFSId)) totalModules++;
          }
        }
      }
    }

    const watchedCount = typeof enrollment.progress === 'number' ? enrollment.progress : 0;
    const completion = totalModules > 0 ? Math.min(100, Math.round((watchedCount / totalModules) * 100)) : 0;
    const remainingModules = totalModules > watchedCount ? totalModules - watchedCount : 0;
    const completedWeeks = Array.isArray(enrollment.completedWeeks) ? enrollment.completedWeeks : [];

    const exams = await ExamResult.find({ user: studentId, course: courseId }).sort({ date: -1 }).lean();
    const examsSummary = {
      attempted: exams.length,
      green: exams.filter(e => e.grade === 'Green').length,
      amber: exams.filter(e => e.grade === 'Amber').length,
      red: exams.filter(e => e.grade === 'Red' || (e.grade === undefined && !e.passed)).length,
      lastAttempt: exams[0]?.date || null,
    };

    res.status(200).json({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        rewardPoints: student.rewardPoints || 0,
      },
      course: {
        id: course._id || courseId,
        title: course.title || '',
        totalModules,
      },
      watchedCount,
      totalModules,
      completion,
      remainingModules,
      completedWeeks,
      lastActivity: enrollment.lastAcknowledgedAt || enrollment.updatedAt || student.updatedAt || null,
      examsSummary,
    });
  } catch (error) {
    console.error('Error fetching student course progress:', error);
    res.status(500).json({ message: 'Error fetching student progress' });
  }
};

// ---------------------------------------------------------------------------
// Upload trainer course content (video/docs) for assigned course
// ---------------------------------------------------------------------------
exports.uploadTrainerContent = async (req, res) => {
  try {
    const { courseId, weekId, dayId } = req.params;
    const { video, document } = req.files || {};

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Ensure trainer is assigned to this course
    if (course.trainer?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to upload for this course' });
    }

    const week = course.weeks?.id ? course.weeks.id(weekId) : null;
    if (!week) return res.status(404).json({ message: 'Week not found' });

    const day = week.days?.id ? week.days.id(dayId) : null;
    if (!day) return res.status(404).json({ message: 'Day not found' });

    if (video) day.videoUrl = `/api/files/video/${video.filename}`;
    if (document) day.documentUrl = `/api/files/doc/${document.filename}`;

    await course.save();

    res.status(200).json({ message: 'Content uploaded successfully' });
  } catch (error) {
    console.error('Error uploading trainer content:', error);
    res.status(500).json({ message: 'Error uploading trainer content' });
  }
};

// ---------------------------------------------------------------------------
// Trainer: Get exam analytics limited to trainer's batch
// ---------------------------------------------------------------------------
exports.getExamAnalyticsForTrainer = async (req, res) => {
  try {
    const trainerId = req.user.id;
    const { examId } = req.params;
    const { batchId } = req.query;

    if (!examId) return res.status(400).json({ message: 'Exam ID is required' });

    const exam = await Exam.findById(examId).lean();
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Determine the batch to use
    let targetBatchId = batchId;
    if (!targetBatchId) {
      // Find batches that belong to this trainer and match the exam's course
      const batches = await Batch.find({ trainer: trainerId, course: exam.courseId }).select('_id');
      if (!batches || batches.length === 0) {
        return res.status(404).json({ message: 'No batch found for trainer for this exam/course' });
      }
      if (batches.length === 1) {
        targetBatchId = batches[0]._id.toString();
      } else {
        // Multiple batches — require batchId for clarity
        return res.status(400).json({ message: 'Multiple batches found for trainer. Please provide a batchId query parameter.' });
      }
    }

    // Verify trainer owns the batch
    const batch = await Batch.findOne({ _id: targetBatchId, trainer: trainerId }).lean();
    if (!batch) return res.status(403).json({ message: 'Not authorized for this batch' });

    // Fetch submissions for the exam, populate student info including batch
    let submissions = await ExamSubmission.find({ exam: examId })
      .populate({ path: 'student', select: 'name email batch role' })
      .lean();

    // Filter by batch id
    submissions = submissions.filter(s => s.student && String(s.student.batch) === String(targetBatchId));

    // Build simple analytics similar to admin but only for filtered submissions
    const thresholds = {
      qualificationPercentage: exam.qualificationPercentage ?? 65,
      excellentMin: exam.excellentMin ?? 90,
      goodMin: exam.goodMin ?? 80,
      averageMin: exam.averageMin ?? 65,
    };

    const buildCandidateRecord = (submission) => {
      const student = submission.student || {};
      const attempted = ['submitted', 'graded'].includes(submission.status);
      const percentage = attempted ? (submission.percentageScore ?? submission.percentage ?? null) : null;
      const qualified = attempted && percentage !== null ? percentage >= thresholds.qualificationPercentage : false;

      return {
        userId: student._id || null,
        name: student.name || 'Unknown',
        email: student.email || '',
        status: submission.status,
        submittedAt: submission.submittedAt || null,
        percentage: percentage !== null ? Number(percentage) : null,
        qualified,
        submissionId: submission._id,
      };
    };

    const candidates = submissions.map(s => buildCandidateRecord(s));
    const assignedCount = candidates.length;
    const attemptedCount = candidates.filter(c => c.status === 'submitted' || c.status === 'graded' || c.status === 'evaluated').length;
    const qualifiedCount = candidates.filter(c => c.qualified).length;
    const percentageQualified = attemptedCount > 0 ? Number(((qualifiedCount / attemptedCount) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        exam: exam,
        batch: batch,
        assignedCount,
        attemptedCount,
        qualifiedCount,
        percentageQualified,
        candidates,
      },
    });
  } catch (error) {
    console.error('Error in trainer getExamAnalytics:', error);
    return res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};
