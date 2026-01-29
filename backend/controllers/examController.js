const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const ExamSubmission = require('../models/ExamSubmission');
const ExamResult = require('../models/ExamResult');
const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const axios = require('axios');
const { sendExamAssignmentEmail } = require('../utils/emailSender');

// ===== NEW EXAM CRUD OPERATIONS =====

// Get all exams (admin only)
exports.getAllExams = async (req, res) => {
  try {
    console.log('Getting all exams...');
    // ⭐ Exclude module exams - they only appear in course modules
    const exams = await Exam.find({
      isInModule: { $ne: true } // ⭐ Only show standalone/external exams
    })
      .sort({ createdAt: -1 });

    console.log(`Found ${exams.length} exams`);

    res.status(200).json({
      success: true,
      data: exams,
      message: 'Exams retrieved successfully',
    });
  } catch (err) {
    console.error('Error in getAllExams:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve exams',
      error: err.message,
    });
  }
};



// Get exam by ID
// Get exam by ID
exports.getExamById = async (req, res) => {
  try {
    const examId = req.params.id;

    const exam = await Exam.findById(examId).lean();
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: exam,  // Returns as-is, no shuffling
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve exam",
      error: err.message,
    });
  }
};




// Get student submission report (for admin)
exports.getStudentReport = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await ExamSubmission.findById(submissionId)
      .populate('exam', 'title description duration totalMarks qualificationPercentage')
      .populate('student', 'name email')
      .lean();

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Get full exam with questions for answer review
    const exam = await Exam.findById(submission.exam._id);

    res.status(200).json({
      success: true,
      data: {
        submission,
        exam: exam.toObject()
      }
    });

  } catch (err) {
    console.error('Error fetching student report:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student report',
      error: err.message
    });
  }
};

// Create exam
exports.createExam = async (req, res) => {
  try {
    // ⭐ DEBUG: Log incoming request data
    console.log('[createExam] Received request body:', {
      title: req.body.title,
      courseId: req.body.courseId,
      weekNumber: req.body.weekNumber,
      isInModule: req.body.isInModule,
      type: req.body.type,
      questionCount: req.body.questions?.length
    });
    const {
      title,
      type,
      duration,
      questions,
      qualificationPercentage,
      excellentMin,
      goodMin,
      averageMin,
      courseId,
      weekNumber,
      startDate,
      endDate
    } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Exam title is required',
      });
    }

    if (!duration || duration < 1 || duration > 480) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 1 and 480 minutes',
      });
    }

    const resolvedQuestions = Array.isArray(questions) ? questions : [];

    if (resolvedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one question is required',
      });
    }

    // Validate and normalize questions
    const validatedQuestions = resolvedQuestions.map((q, index) => {
      if (!q.title || !q.title.trim()) {
        throw new Error(`Question ${index + 1} must have a title`);
      }

      if (!q.type || !['mcq', 'coding', 'theory'].includes(q.type)) {
        throw new Error(`Question ${index + 1} has invalid type`);
      }

      // Ensure question has id
      if (!q.id) {
        q.id = q._id?.toString() || Date.now().toString() + index;
      }

      // Validate based on type
      if (q.type === 'mcq') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          throw new Error(`Question ${index + 1} (MCQ) must have at least 2 options`);
        }
        if (!q.options.some(opt => opt.isCorrect === true)) {
          throw new Error(`Question ${index + 1} (MCQ) must have at least one correct option`);
        }
      } else if (q.type === 'coding') {
        if (!q.language) {
          throw new Error(`Question ${index + 1} (Coding) must specify a language`);
        }
        if (!Array.isArray(q.testCases) || q.testCases.length === 0) {
          throw new Error(`Question ${index + 1} (Coding) must have at least one test case`);
        }
      }

      // Ensure marks field
      if (!q.marks || q.marks < 1) {
        q.marks = 1;
      }

      return q;
    });

    // Calculate total marks
    const computedTotalMarks = validatedQuestions.reduce(
      (sum, q) => sum + (q.marks || 1),
      0
    );

    const courseIdProvided = req.body.courseId || null;
    const weekNumberProvided =
      typeof req.body.weekNumber !== 'undefined' && req.body.weekNumber !== null
        ? Number(req.body.weekNumber)
        : null;

    const isModuleExam = !!(
      req.body.isInModule === true ||
      (courseIdProvided && weekNumberProvided !== null && weekNumberProvided !== undefined)
    );

    const newExam = new Exam({
      title: title.trim(),
      type: type || 'mcq',
      duration: parseInt(duration, 10),
      totalMarks: computedTotalMarks,
      questions: validatedQuestions,
      createdBy: req.user.id,
      assignedTo: {
        users: [],
        batches: [],
      },
      // Force publish when tied to a course/week (module exam)
      published: isModuleExam ? true : req.body.published === true,
      courseId: courseIdProvided || null,
      weekNumber: weekNumberProvided !== null ? weekNumberProvided : null,
      isInModule: isModuleExam,
      qualificationPercentage: Math.min(
        100,
        Math.max(1, Number(qualificationPercentage ?? 65))
      ),
      excellentMin: Math.min(100, Math.max(1, Number(excellentMin ?? 90))),
      goodMin: Math.min(100, Math.max(1, Number(goodMin ?? 80))),
      averageMin: Math.min(100, Math.max(1, Number(averageMin ?? 65))),
      startDate: startDate || null,
      endDate: endDate || null,
    });

    const savedExam = await newExam.save();

    // ⭐ DEBUG: Log what was saved
    console.log('[createExam] Saved exam to database:', {
      _id: savedExam._id,
      title: savedExam.title,
      courseId: savedExam.courseId,
      weekNumber: savedExam.weekNumber,
      isInModule: savedExam.isInModule,
      published: savedExam.published
    });
    // Auto-assign module exams to enrolled students and batches
    if (isModuleExam) {
      try {
        // Convert to ObjectId if needed
        const courseObjId = mongoose.Types.ObjectId.isValid(courseIdProvided)
          ? mongoose.Types.ObjectId(courseIdProvided)
          : courseIdProvided;

        const enrolledStudents = await User.find({
          'enrolledCourses.courseId': courseObjId,
          role: 'Student',
        }).select('_id');

        const batches = await Batch.find({ course: courseObjId }).select('_id');
        const batchIds = batches.map((b) => b._id.toString());

        // Assign to batches on exam document
        if (batchIds.length > 0) {
          savedExam.assignedTo.batches = Array.from(new Set([...savedExam.assignedTo.batches.map(id => id.toString()), ...batchIds]));
          await savedExam.save();
        }

        const batchStudents = await User.find({
          batch: { $in: batches.map((b) => b._id) },
          role: 'Student',
        }).select('_id');

        // Unique student ids
        const studentIdsSet = new Set();
        enrolledStudents.forEach((s) => studentIdsSet.add(String(s._id)));
        batchStudents.forEach((s) => studentIdsSet.add(String(s._id)));
        const studentIds = Array.from(studentIdsSet);

        const submissions = studentIds.map((sid) => ({
          exam: savedExam._id,
          student: sid,
          status: 'not_started',
          attemptNumber: 1,
          answers: [],
          violationCount: 0,
        }));

        if (submissions.length > 0) {
          await ExamSubmission.insertMany(submissions, { ordered: false }).catch(
            (err) => {
              if (err)
                console.warn(
                  'Error inserting initial submissions (ignored):',
                  err.message || err
                );
            }
          );
        }
      } catch (assignmentErr) {
        console.error('Error auto-assigning module exam: ', assignmentErr);
      }

      // Also update the Course's week metadata: set hasExam=true and store examId
      try {
        if (courseIdProvided) {
          const course = await Course.findById(courseIdProvided);
          if (course && Array.isArray(course.weeks)) {
            const wk = course.weeks.find((w) => w.weekNumber === weekNumberProvided);
            if (wk) {
              wk.hasExam = true;
              wk.examId = savedExam._id;
              course.markModified('weeks');
              await course.save();
            }
          }
        }
      } catch (courseErr) {
        console.error(
          'Error updating course week hasExam flag:',
          courseErr.message || courseErr
        );
      }
    }

    res.status(201).json({
      success: true,
      data: {
        _id: savedExam._id,
        title: savedExam.title,
        type: savedExam.type,
        duration: savedExam.duration,
        totalMarks: savedExam.totalMarks,
        qualificationPercentage: savedExam.qualificationPercentage,
        excellentMin: savedExam.excellentMin,
        goodMin: savedExam.goodMin,
        averageMin: savedExam.averageMin,
        questionCount: savedExam.questions.length,
        published: savedExam.published,
        createdAt: savedExam.createdAt,
      },
      message: 'Exam created successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to create exam',
      error: err.message,
    });
  }
};

// 👇 EVERYTHING BELOW WAS PREVIOUSLY FLOATING OUTSIDE ANY FUNCTION.
//    IT MUST BE WRAPPED IN AN ASYNC CONTROLLER FUNCTION.

exports.updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      type,
      duration,
      questions,
      published,
      qualificationPercentage,
      excellentMin,
      goodMin,
      averageMin,
      startDate,
      endDate
    } = req.body;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Only creator can update, unless Admin or Master
    if (exam.createdBy.toString() !== req.user.id && !['Admin', 'Master'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this exam',
      });
    }

    if (title !== undefined) exam.title = title;
    if (type !== undefined) exam.type = type;
    if (duration !== undefined) exam.duration = duration;
    if (questions !== undefined) {
      exam.questions = questions;
      exam.totalMarks = questions.reduce(
        (sum, q) => sum + (q?.marks || 1),
        0
      );
    }
    if (published !== undefined) exam.published = published;
    if (qualificationPercentage !== undefined) {
      exam.qualificationPercentage = Math.min(100, Math.max(1, Number(qualificationPercentage)));
    }
    if (excellentMin !== undefined) {
      exam.excellentMin = Math.min(100, Math.max(1, Number(excellentMin)));
    }
    if (goodMin !== undefined) {
      exam.goodMin = Math.min(100, Math.max(1, Number(goodMin)));
    }
    if (averageMin !== undefined) {
      exam.averageMin = Math.min(100, Math.max(1, Number(averageMin)));
    }
    if (startDate !== undefined) exam.startDate = startDate;
    if (endDate !== undefined) exam.endDate = endDate;

    const updatedExam = await exam.save();

    res.status(200).json({
      success: true,
      data: updatedExam,
      message: 'Exam updated successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update exam',
      error: err.message,
    });
  }
};

// Delete exam
exports.deleteExam = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Only creator can delete, unless Admin or Master
    if (exam.createdBy.toString() !== req.user.id && !['Admin', 'Master'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this exam',
      });
    }

    await Exam.findByIdAndDelete(id);
    // Also delete all submissions for this exam
    await ExamSubmission.deleteMany({ exam: id });

    res.status(200).json({
      success: true,
      message: 'Exam deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete exam',
      error: err.message,
    });
  }
};

// Assign exam to users or batches
exports.assignExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds = [], batchIds = [] } = req.body;

    if (userIds.length === 0 && batchIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one user or batch to assign',
      });
    }

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Validate users exist (only if provided)
    if (userIds.length > 0) {
      const users = await User.find({ _id: { $in: userIds }, role: 'Student' });
      if (users.length !== userIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some user IDs are invalid or not students',
        });
      }
    }

    // Validate batches exist (only if provided)
    if (batchIds.length > 0) {
      const batches = await Batch.find({ _id: { $in: batchIds } });
      if (batches.length !== batchIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Some batch IDs are invalid',
        });
      }
    }

    const existingUserIds = new Set((exam.assignedTo?.users || []).map((value) => value.toString()));
    const existingBatchIds = new Set((exam.assignedTo?.batches || []).map((value) => value.toString()));

    userIds.forEach((userId) => existingUserIds.add(userId.toString()));
    batchIds.forEach((batchId) => existingBatchIds.add(batchId.toString()));

    const allUserIdsSet = new Set();
    userIds.forEach((id) => allUserIdsSet.add(id.toString()));

    // ✅ ENHANCEMENT: When assigning to batch, also add batch users to exam.assignedTo.users
    // This ensures sync between batch and individual user assignments
    if (batchIds.length > 0) {
      const batchUsers = await User.find({ batch: { $in: batchIds }, role: 'Student' }).select('_id');
      batchUsers.forEach((user) => {
        const userIdStr = user._id.toString();
        allUserIdsSet.add(userIdStr);
        existingUserIds.add(userIdStr);  // ✅ Add to exam.assignedTo.users
      });
    }

    const allUserIds = Array.from(allUserIdsSet);

    const existingSubmissions = await ExamSubmission.find({
      exam: id,
      student: { $in: allUserIds },
    }).select('student');

    const existingSubmissionStudentIds = new Set(existingSubmissions.map((sub) => sub.student.toString()));

    const newSubmissions = allUserIds
      .filter((userId) => !existingSubmissionStudentIds.has(userId))
      .map((userId) => ({
        exam: id,
        student: userId,
        status: 'not_started',
        attemptNumber: 1,
        answers: [],
        violationCount: 0
      }));

    if (newSubmissions.length > 0) {
      await ExamSubmission.insertMany(newSubmissions, { ordered: false });

      // Send email notifications to new assignees
      try {
        const userIdsToNotify = newSubmissions.map(s => s.student);
        const usersToNotify = await User.find({ _id: { $in: userIdsToNotify } }).select('email name');

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        // Construct deep link to exam instructions/start page
        const examLink = `${frontendUrl}/exams/${id}/take`;

        console.log(`Sending assignment emails to ${usersToNotify.length} users...`);

        // Send concurrently but don't block the response significantly
        Promise.allSettled(usersToNotify.map(u => {
          if (u.email) {
            return sendExamAssignmentEmail(
              u.email,
              exam.title,
              examLink,
              exam.startDate,
              exam.endDate,
              exam.duration
            );
          }
        }));
      } catch (emailErr) {
        console.error('Failed to send assignment emails:', emailErr);
        // Don't fail the request, just log error
      }
    }

    exam.assignedTo.users = Array.from(existingUserIds);
    exam.assignedTo.batches = Array.from(existingBatchIds);
    await exam.save();

    const assignedCount = await ExamSubmission.countDocuments({ exam: id });

    res.status(200).json({
      success: true,
      data: {
        _id: exam._id,
        title: exam.title,
        assignedCount,
        assignedTo: {
          users: exam.assignedTo.users.length,
          batches: exam.assignedTo.batches.length,
        },
        summary: {
          newAssignments: newSubmissions.length,
          reactivated: allUserIds.length - newSubmissions.length,
        },
      },
      message: `Exam assignment updated. ${newSubmissions.length} new student(s) added.`,
    });
  } catch (err) {
    console.error('Error assigning exam:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to assign exam',
      error: err.message,
    });
  }
};

// ✅ NEW: Un-assign exam from users/batches
exports.unassignExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds = [], batchIds = [] } = req.body;

    if (userIds.length === 0 && batchIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one user or batch to un-assign',
      });
    }

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Get all user IDs to un-assign (including batch users)
    const allUserIdsToUnassign = new Set();
    userIds.forEach((id) => allUserIdsToUnassign.add(id.toString()));

    if (batchIds.length > 0) {
      const batchUsers = await User.find({ batch: { $in: batchIds }, role: 'Student' }).select('_id');
      batchUsers.forEach((user) => allUserIdsToUnassign.add(user._id.toString()));
    }

    // Check if any users have started/submitted the exam
    const startedSubmissions = await ExamSubmission.find({
      exam: id,
      student: { $in: Array.from(allUserIdsToUnassign) },
      status: { $in: ['in_progress', 'submitted', 'graded'] },
    }).populate('student', 'name email');

    if (startedSubmissions.length > 0) {
      const startedUsers = startedSubmissions.map(s => s.student.name || s.student.email).join(', ');
      return res.status(400).json({
        success: false,
        message: `Cannot un-assign: ${startedSubmissions.length} user(s) have already started or submitted the exam`,
        startedUsers: startedUsers,
      });
    }

    // Remove users from exam.assignedTo.users
    const existingUserIds = new Set((exam.assignedTo?.users || []).map(v => v.toString()));
    userIds.forEach((userId) => existingUserIds.delete(userId.toString()));

    // If un-assigning batch, also remove all batch users
    if (batchIds.length > 0) {
      allUserIdsToUnassign.forEach((userId) => existingUserIds.delete(userId));
    }

    // Remove batches from exam.assignedTo.batches
    const existingBatchIds = new Set((exam.assignedTo?.batches || []).map(v => v.toString()));
    batchIds.forEach((batchId) => existingBatchIds.delete(batchId.toString()));

    // Delete ExamSubmission records (only not_started)
    const deleteResult = await ExamSubmission.deleteMany({
      exam: id,
      student: { $in: Array.from(allUserIdsToUnassign) },
      status: 'not_started',
    });

    // Update exam
    exam.assignedTo.users = Array.from(existingUserIds);
    exam.assignedTo.batches = Array.from(existingBatchIds);
    await exam.save();

    const remainingCount = await ExamSubmission.countDocuments({ exam: id });

    res.status(200).json({
      success: true,
      data: {
        _id: exam._id,
        title: exam.title,
        assignedCount: remainingCount,
        assignedTo: {
          users: exam.assignedTo.users.length,
          batches: exam.assignedTo.batches.length,
        },
        summary: {
          unassignedUsers: userIds.length,
          unassignedBatches: batchIds.length,
          deletedSubmissions: deleteResult.deletedCount,
        },
      },
      message: `Successfully un-assigned ${deleteResult.deletedCount} student(s) from exam.`,
    });
  } catch (err) {
    console.error('Error un-assigning exam:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to un-assign exam',
      error: err.message,
    });
  }
};

// ✅ NEW: Get exam assignment details
exports.getExamAssignments = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findById(id).select('assignedTo title');
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    // Get all assigned user IDs (both direct and via batch)
    const assignedUserIds = exam.assignedTo?.users || [];

    // Get assigned batches with student info
    const assignedBatches = await Batch.find({
      _id: { $in: exam.assignedTo?.batches || [] }
    }).populate('users', 'name email');

    // Get batch user IDs
    const batchUserIds = new Set();
    assignedBatches.forEach(batch => {
      batch.users?.forEach(student => {
        batchUserIds.add(student._id.toString());
      });
    });

    // Separate direct assignments from batch assignments
    const directUserIds = assignedUserIds.filter(id => !batchUserIds.has(id.toString()));

    // Get user details
    const directUsers = await User.find({
      _id: { $in: directUserIds }
    }).select('name email');

    res.status(200).json({
      success: true,
      data: {
        examId: exam._id,
        examTitle: exam.title,
        directUsers: directUsers,
        batches: assignedBatches,
        totalAssigned: assignedUserIds.length,
        summary: {
          directAssignments: directUsers.length,
          batchAssignments: assignedBatches.length,
          totalUsers: assignedUserIds.length,
        },
      },
    });
  } catch (err) {
    console.error('Error getting exam assignments:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get exam assignments',
      error: err.message,
    });
  }
};

// Get exams assigned to logged-in student
exports.getAssignedExams = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await User.findById(studentId).select('batch');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const studentBatch = student.batch;

    const assignmentFilters = [
      { 'assignedTo.users': studentId },
      { 'assignedToUsers': studentId },
      { 'assigned.users': studentId },
      { users: studentId },
      { assignedUsers: studentId },
    ];

    if (studentBatch) {
      assignmentFilters.push(
        { 'assignedTo.batches': studentBatch },
        { 'assigned.batches': studentBatch },
        { assignedBatches: studentBatch }
      );
    }

    const exams = await Exam.find({
      $or: assignmentFilters,
      isInModule: { $ne: true } // ⭐ Exclude module exams
    })
      .select('title type duration questions totalMarks createdAt qualificationPercentage excellentMin goodMin averageMin examType assignedTo assignedToUsers assigned assignedUsers assignedBatches users published startDate endDate')
      .sort({ createdAt: -1 })
      .lean();

    const defaults = {
      qualificationPercentage: 65,
      excellentMin: 90,
      goodMin: 80,
      averageMin: 65,
    };

    const normalized = exams.map((exam) => {
      const questionCount = Array.isArray(exam.questions) ? exam.questions.length : exam.questionCount || 0;
      const duration = exam.duration || 0;
      const type = exam.type || exam.examType || 'mcq';
      const qualificationPercentage = exam.qualificationPercentage ?? defaults.qualificationPercentage;
      const excellentMin = exam.excellentMin ?? defaults.excellentMin;
      const goodMin = exam.goodMin ?? defaults.goodMin;
      const averageMin = exam.averageMin ?? defaults.averageMin;

      return {
        examId: exam._id.toString(),
        title: exam.title || 'Untitled Exam',
        duration,
        examType: type,
        questionCount,
        qualificationPercentage,
        gradeConfig: {
          excellent: { from: excellentMin, to: 100 },
          good: { from: goodMin, to: excellentMin },
          average: { from: averageMin, to: goodMin },
        },
        rawExam: exam,
      };
    });

    const examIds = normalized.map((exam) => exam.examId);

    const submissions = await ExamSubmission.find({
      exam: { $in: examIds },
      student: studentId,
    })
      .select('exam status totalMarksObtained totalMarksMax percentageScore submittedAt createdAt updatedAt startedAt submitted evaluated grade timeSpent answers score totalMarks percentage')
      .lean();

    const submissionMap = new Map();
    submissions.forEach((sub) => {
      submissionMap.set(sub.exam.toString(), sub);
    });

    const result = normalized.map((exam) => {
      const submission = submissionMap.get(exam.examId);
      let status = 'not_started';
      let scoreBlock = null;
      let questionsAnswered = 0;

      if (submission) {
        questionsAnswered = Array.isArray(submission.answers) ? submission.answers.length : 0;
        if (submission.status === 'graded' || submission.evaluated === true) {
          status = 'graded';
          scoreBlock = {
            totalMarksObtained: submission.totalMarksObtained ?? 0,
            totalMarksMax: submission.totalMarksMax ?? exam.questionCount ?? 0,
            percentageScore: submission.percentageScore ?? submission.percentage ?? 0,
            submittedAt: submission.submittedAt || submission.updatedAt,
            score: submission.score ?? submission.totalMarksObtained ?? 0,
            totalMarks: submission.totalMarks ?? submission.totalMarksMax ?? exam.questionCount ?? 0,
            percentage: submission.percentage ?? submission.percentageScore ?? 0,
          };
        } else if (submission.status === 'submitted') {
          status = 'submitted';
        } else if (submission.status === 'in_progress' || submission.status === 'started' || submission.startedAt) {
          status = 'in_progress';
        }
      }

      return {
        examId: exam.examId,
        title: exam.title,
        duration: exam.duration,
        examType: exam.examType,
        questionCount: exam.questionCount,
        qualificationPercentage: exam.qualificationPercentage,
        gradeConfig: exam.gradeConfig,
        status,
        assignmentStatus: status,
        questionsAnswered,
        score: scoreBlock?.score ?? 0,
        percentage: scoreBlock?.percentage ?? 0,
        totalMarks: scoreBlock?.totalMarks ?? exam.questionCount ?? 0,
        submission: scoreBlock,
        startDate: exam.rawExam?.startDate || null,
        endDate: exam.rawExam?.endDate || null,
      };
    });

    res.status(200).json({
      success: true,
      data: result,
      message: 'Assigned exams retrieved successfully',
    });
  } catch (err) {
    console.error('Error in getAssignedExams:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve assigned exams',
      error: err.message,
    });
  }
};

// Get module exams for a specific course
exports.getModuleExamsByCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const userId = req.user?.id;
    // Ensure course id provided
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId required' });
    }

    // If the requester is a Student, ensure they're enrolled in the course
    if (req.user?.role === 'Student') {
      const student = await User.findById(userId).select('enrolledCourses');
      if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
      const enrolled = (student.enrolledCourses || []).some(ec => String(ec.courseId) === String(courseId));
      if (!enrolled) {
        return res.status(403).json({ success: false, message: 'Forbidden: not enrolled in course' });
      }
    }

    // Find module exams for that course
    const moduleExams = await Exam.find({ courseId: courseId, $or: [{ isInModule: true }, { weekNumber: { $ne: null } }] })
      .select('title duration courseId weekNumber published createdBy')
      .sort({ weekNumber: 1, createdAt: -1 })
      .lean();

    const normalized = moduleExams.map((e) => ({
      examId: e._id.toString(),
      title: e.title || 'Untitled Exam',
      weekNumber: e.weekNumber ?? null,
      duration: e.duration || 0,
      published: !!e.published,
      courseId: e.courseId,
    }));

    return res.status(200).json({ success: true, data: normalized });
  } catch (err) {
    console.error('Error fetching module exams for course:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch module exams', error: err.message });
  }
};

// Get specific module exam by course and week
exports.getModuleExam = async (req, res) => {
  try {
    const { courseId, weekNumber } = req.params;
    if (!courseId || !weekNumber) {
      return res.status(400).json({ success: false, message: 'Missing courseId or weekNumber' });
    }

    const exam = await Exam.findOne({
      courseId: courseId,
      weekNumber: Number(weekNumber)
    });

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found for this module/week' });
    }

    return res.status(200).json({
      success: true,
      data: exam
    });
  } catch (err) {
    console.error('Error fetching module exam:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch module exam',
      error: err.message
    });
  }
};

// ===== LEGACY EXAM RESULT (Keep existing functionality) =====

// Submit a weekly exam (student)
exports.submitWeeklyExam = async (req, res) => {
  try {
    const { courseId, week, answers, score, totalQuestions } = req.body;
    if (req.user.role !== 'Student')
      return res.status(403).json({ message: 'Students only' });
    // Must be enrolled
    const user = await User.findById(req.user.id);
    const enrolled = user.enrolledCourses.find(ec => ec.courseId.toString() === courseId);
    if (!enrolled) return res.status(403).json({ message: 'Not enrolled in this course' });
    // All 5 days must be acknowledged before exam
    if (!enrolled.completedWeeks.includes(Number(week)))
      return res.status(403).json({ message: 'You must complete all days before attempting the exam.' });
    // Only one submission per week
    const alreadySubmitted = await ExamResult.findOne({ user: user._id, course: courseId, week });
    if (alreadySubmitted) return res.status(400).json({ message: 'You have already submitted this exam.' });
    // Score and pass logic (RAG: Green >= 80, Amber >= 50)
    const percent = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
    let grade = 'Red';
    let passed = false;

    if (percent >= 80) {
      grade = 'Green';
      passed = true;
    } else if (percent >= 50) {
      grade = 'Amber';
      passed = true;
    } else {
      grade = 'Red';
      passed = false;
    }

    // Block unlocking next week if <50% (Amber threshold)
    // Reward points
    let rewardPoints = 0;
    if (percent >= 95) rewardPoints = 100;
    if (rewardPoints > 0) {
      user.rewardPoints += (user.rewardPoints || 0) + rewardPoints;
      await user.save();
    }
    const result = await ExamResult.create({
      user: user._id,
      course: courseId,
      week,
      answers,
      score,
      totalQuestions,
      passed,
      grade,
    });
    res.status(201).json({
      message: passed ? 'Passed' : 'Failed',
      score,
      percent,
      passed,
      rewardPointsEarned: rewardPoints,
      result
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createPlaceholderExam = async (req, res) => {
  try {
    const { courseId, weekNumber } = req.body;

    if (!courseId || (weekNumber === undefined || weekNumber === null)) {
      return res.status(400).json({ message: "courseId and weekNumber are required" });
    }

    // Create a minimal placeholder exam
    const exam = await Exam.create({
      title: "Untitled Exam",
      courseId,
      weekNumber,
      duration: 0,
      totalMarks: 0,
      questions: [],
      isModuleExam: true, // mark it as module exam (so attempts default = 3)
    });

    // Auto-assign: find all students enrolled in this course OR students in batches that have this course
    // First, students with enrollment in enrolledCourses
    const enrolledStudents = await User.find({
      'enrolledCourses.courseId': mongoose.Types.ObjectId(courseId),
      role: 'Student'
    }).select('_id');

    // Next, find batches that reference this course
    const batches = await Batch.find({ course: courseId }).select('_id');

    // Find students in those batches as well
    const batchStudents = await User.find({
      batch: { $in: batches.map(b => b._id) },
      role: 'Student'
    }).select('_id');

    // Merge unique student ids
    const studentIdsSet = new Set();
    enrolledStudents.forEach(s => studentIdsSet.add(String(s._id)));
    batchStudents.forEach(s => studentIdsSet.add(String(s._id)));
    const studentIds = Array.from(studentIdsSet);

    // Create blank ExamSubmission records for each student (with not_started or in_progress depending on your workflow)
    const submissions = [];
    for (const sid of studentIds) {
      submissions.push({
        exam: exam._id,
        student: sid,
        status: 'not_started',
        attempts: 0,
        answers: [],
        violationCount: 0
      });
    }

    if (submissions.length > 0) {
      // Use insertMany with ordered=false to skip duplicates gracefully
      await ExamSubmission.insertMany(submissions, { ordered: false }).catch(err => {
        // ignore duplicate key errors etc.
        if (err) console.warn('Error inserting initial submissions (ignored):', err.message || err);
      });
    }

    res.status(201).json(exam);
  } catch (err) {
    console.error("Error creating placeholder exam:", err);
    res.status(500).json({ message: "Failed to create placeholder exam", error: err.message });
  }
};

// ===== NEW: GENERATE TEMPLATE FOR ADVANCED CODING =====
/**
 * Generate boilerplate code template based on input schema
 * POST /api/admin/exams/generate-template
 * Body: { language, problemType, inputSchema, outputType, functionName }
 */
exports.generateTemplate = async (req, res) => {
  try {
    const { language, problemType, inputSchema, outputType, functionName } = req.body;

    // Validate required fields
    if (!language || !inputSchema || !outputType || !functionName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: language, inputSchema, outputType, functionName'
      });
    }

    // Import template generator
    const templateGenerator = require('../utils/templateGenerator');

    // DEBUG: Log the received inputSchema to see the format
    console.log('🔍 DEBUG - Received inputSchema:', JSON.stringify(inputSchema, null, 2));
    console.log('🔍 DEBUG - Language:', language);
    console.log('🔍 DEBUG - OutputType:', JSON.stringify(outputType, null, 2));

    // FIX: Decode HTML entities in types (array&lt;int&gt; -> array<int>)
    const decodeHTMLEntities = (str) => {
      if (!str) return str;
      return str.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    };

    // Decode inputSchema types
    const decodedInputSchema = inputSchema.map(param => ({
      ...param,
      type: decodeHTMLEntities(param.type)
    }));

    // Decode outputType
    const decodedOutputType = {
      ...outputType,
      type: decodeHTMLEntities(outputType.type)
    };

    console.log('✅ DEBUG - Decoded inputSchema:', JSON.stringify(decodedInputSchema, null, 2));
    console.log('✅ DEBUG - Decoded outputType:', JSON.stringify(decodedOutputType, null, 2));

    // Generate template
    const template = templateGenerator.generateTemplate({
      language,
      problemType: problemType || 'simple',
      inputSchema: decodedInputSchema,
      outputType: decodedOutputType,
      functionName
    });

    res.status(200).json({
      success: true,
      data: template,
      message: 'Template generated successfully'
    });

  } catch (err) {
    console.error('Error generating template:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: err.message
    });
  }
};

module.exports = {
  getAllExams: exports.getAllExams,
  getExamById: exports.getExamById,
  createExam: exports.createExam,
  updateExam: exports.updateExam,
  getStudentReport: exports.getStudentReport,
  deleteExam: exports.deleteExam,
  assignExam: exports.assignExam,
  unassignExam: exports.unassignExam,  // ✅ NEW
  getExamAssignments: exports.getExamAssignments,  // ✅ NEW
  getAssignedExams: exports.getAssignedExams,
  getAssignedExams: exports.getAssignedExams,
  getModuleExamsByCourse: exports.getModuleExamsByCourse,
  getModuleExam: exports.getModuleExam, // ⭐ NEW
  submitWeeklyExam: exports.submitWeeklyExam,
  createPlaceholderExam: exports.createPlaceholderExam,
  generateTemplate: exports.generateTemplate,  // NEW
};

