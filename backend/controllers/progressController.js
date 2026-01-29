const User = require('../models/User');
const Course = require('../models/Course');
const ExamResult = require('../models/ExamResult');
const ExamSubmission = require('../models/ExamSubmission');
const Exam = require('../models/Exam');
const mongoose = require('mongoose');

/**
 * @desc Get student progress across all their courses (Module/Topic based)
 * @route GET /api/progress/:studentId
 * @access Private (Student or Admin)
 */
exports.getStudentProgress = async (req, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user?.id;

    // Allow only self or Admin
    if (userId !== studentId && req.user?.role !== 'Admin') {
      return res
        .status(403)
        .json({ message: "Forbidden: cannot access other users' progress" });
    }

    // Fetch student and enrolled courses
    const student = await User.findById(studentId)
      .populate({
        path: 'enrolledCourses.courseId',
        model: 'Course',
      })
      .select('name email enrolledCourses batch rewardPoints');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Calculate per-course progress
    const courses = await Promise.all(
      student.enrolledCourses.map(async (enrollment) => {
        const course = enrollment.courseId;
        if (!course) return null;

        // ✅ FIX: Use weeks/days instead of modules/topics
        // Count total video days
        let totalVideos = 0;
        if (course.weeks && Array.isArray(course.weeks)) {
          course.weeks.forEach(wk => {
            if (wk.days && Array.isArray(wk.days)) {
              wk.days.forEach(d => {
                if (d && (d.videoUrl || d.videoGridFSId)) totalVideos++;
              });
            }
          });
        }

        // Count watched videos (primary source: progress number)
        // If progress is 0, check completedDays array length as fallback
        let watchedVideos = typeof enrollment.progress === 'number' ? enrollment.progress : 0;
        if (watchedVideos === 0 && Array.isArray(enrollment.completedDays)) {
          // We can re-calculate from completedDays if needed, but progress should be source of truth
          // Just to be safe, if progress is 0 but we have completedDays, use that
          // However, let's trust enrollment.progress for now or 0
        }

        const completionPercent =
          totalVideos > 0
            ? Math.round((watchedVideos / totalVideos) * 100)
            : 0;

        let status = 'Not Started';
        if (completionPercent === 100) status = 'Completed';
        else if (completionPercent > 0) status = 'In Progress';

        return {
          courseId: course._id,
          courseName: course.title,
          description: course.description || '',
          totalModules: course.weeks?.length || 0, // Using weeks as modules count
          totalTopics: totalVideos, // Renamed mainly for variable clarity but keeping output key same for frontend compat
          completedTopics: watchedVideos,
          completionPercent,
          status,
        };
      })
    );

    const validCourses = courses.filter(Boolean);

    // === MODULE & NORMAL EXAM RESULTS (ExamResult collection) ===
    const examResults = await ExamResult.find({ student: studentId })
      .populate('course', 'title')
      .sort({ createdAt: -1 });

    // Fetch all module exams for these courses to calculate total progress correctly
    const activeCourseIds = validCourses.map(c => c.courseId);
    const moduleExams = await Exam.find({
      courseId: { $in: activeCourseIds },
      isInModule: true,
      published: true
    }).select('courseId _id');

    // Fetch all passed submissions for this student
    const passedSubmissions = await ExamSubmission.find({
      student: studentId,
      status: { $in: ['graded', 'evaluated'] },
      qualified: true
    }).select('exam');
    const passedExamIds = new Set(passedSubmissions.map(s => String(s.exam)));

    // Re-map courses to include exams in progress
    const coursesWithExams = validCourses.map(course => {
      // Find all exams for this course
      const courseExams = moduleExams.filter(e => String(e.courseId) === String(course.courseId));
      const totalExams = courseExams.length;

      // Count passed exams
      const passedCount = courseExams.filter(e => passedExamIds.has(String(e._id))).length;

      // New Totals
      // completedTopics (videos) + passedExams
      const totalItems = course.totalTopics + totalExams; // totalTopics here means totalVideos from previous step
      const completedItems = course.completedTopics + passedCount;

      const newCompletionPercent = totalItems > 0
        ? Math.round((completedItems / totalItems) * 100)
        : 0;

      let newStatus = 'Not Started';
      if (newCompletionPercent === 100) newStatus = 'Completed';
      else if (newCompletionPercent > 0) newStatus = 'In Progress';

      return {
        ...course,
        totalExams,
        passedExams: passedCount,
        completionPercent: newCompletionPercent,
        status: newStatus
      };
    });

    const examSummary = examResults.map((exam) => {
      const moduleValue =
        typeof exam.module === 'number'
          ? exam.module
          : typeof exam.week === 'number'
            ? exam.week
            : exam.moduleName ?? null;

      return {
        courseName: exam.course?.title || 'N/A',
        courseId: exam.course?._id,
        module: moduleValue,
        score: exam.score,
        totalQuestions: exam.totalQuestions,
        passed: exam.passed,
        attemptedAt: exam.createdAt,
        // Prefer server-side percentage if present, otherwise compute from score/totalQuestions when available
        percentage:
          typeof exam.percentage === 'number'
            ? exam.percentage
            : typeof exam.score === 'number' && typeof exam.totalQuestions === 'number' && exam.totalQuestions > 0
              ? (exam.score / exam.totalQuestions) * 100
              : null,
      };
    });

    // === ADDITION: ExamSubmission results (normal/final exams) ===
    const submittedExams = await ExamSubmission.find({
      student: studentId,
      status: { $in: ['submitted', 'graded', 'evaluated'] },
    })
      .populate({
        path: 'exam',
        select: 'title module course passPercentage',
      })
      .sort({ submittedAt: -1 });

    // Populate course title for final/normal exam submissions if possible
    // We might need to fetch the course title if the exam doesn't contain it (some legacy exams store only course id)
    // Since submittedExams populates exam.course (id), we can fetch course titles map
    const courseIdsFromSubmissions = [...new Set(submittedExams.map(s => (s.exam?.course ? String(s.exam.course) : null)).filter(Boolean))]
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
    const coursesMap = {};
    if (courseIdsFromSubmissions.length) {
      const coursesFetched = await Course.find({ _id: { $in: courseIdsFromSubmissions } }).select('_id title').lean();
      coursesFetched.forEach((c) => { coursesMap[String(c._id)] = c.title; });
    }

    const submissionSummary = submittedExams
      .filter((sub) => sub.exam) // avoid null exam refs
      .map((sub) => ({
        examId: sub.exam._id,
        title: sub.exam.title,
        module: sub.exam.module || null,
        courseId: sub.exam.course,
        courseName: sub.exam?.course ? (coursesMap[String(sub.exam.course)] || '') : '',
        score: sub.totalMarksObtained || sub.score || 0,
        totalMarks: sub.totalMarksMax || sub.totalMarks || 0,
        percentage: typeof sub.percentageScore === 'number' ? sub.percentageScore : (typeof sub.percentage === 'number' ? sub.percentage : null),
        qualified: sub.qualified,
        status: sub.status,
        attempt: sub.attemptNumber,
        attemptedAt: sub.submittedAt,
      }));

    // 🎯 FINAL RESPONSE (WITH EXAM RESULTS)
    return res.status(200).json({
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        rewardPoints: student.rewardPoints,
      },
      courses: coursesWithExams, // Use the new list with exams included in percentage
      // StudentExamDashboard uses this:
      exams: [...examSummary, ...submissionSummary],
      statistics: {
        totalCourses: validCourses.length,
        completedCount: validCourses.filter(
          (c) => c.status === 'Completed'
        ).length,
        inProgressCount: validCourses.filter(
          (c) => c.status === 'In Progress'
        ).length,
        notStartedCount: validCourses.filter(
          (c) => c.status === 'Not Started'
        ).length,
        overallCompletion:
          coursesWithExams.length > 0
            ? Math.round(
              coursesWithExams.reduce(
                (sum, c) => sum + c.completionPercent,
                0
              ) / coursesWithExams.length
            )
            : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Get all students' progress (Admin only)
 * @route GET /api/progress/admin/all/progress
 * @access Private (Admin)
 */
exports.getAllStudentsProgress = async (req, res) => {
  try {
    if (req.user?.role !== 'Admin') {
      return res
        .status(403)
        .json({ message: 'Forbidden: only admins can access all progress' });
    }

    const students = await User.find({ role: 'Student' })
      .populate({
        path: 'enrolledCourses.courseId',
        model: 'Course',
      })
      .select('name email enrolledCourses rewardPoints');

    const studentsProgress = await Promise.all(
      students.map(async (student) => {
        // ✅ FIX: Use weeks instead of modules
        const courses = await Promise.all(student.enrolledCourses.map(async (enrollment) => {
          const course = enrollment.courseId;
          if (!course) return null;

          let totalVideos = 0;
          if (course.weeks && Array.isArray(course.weeks)) {
            course.weeks.forEach(wk => {
              if (wk.days && Array.isArray(wk.days)) {
                wk.days.forEach(d => {
                  if (d && (d.videoUrl || d.videoGridFSId)) totalVideos++;
                });
              }
            });
          }

          const watchedVideos = typeof enrollment.progress === 'number' ? enrollment.progress : 0;

          // Note: Ideally we should include exams here too for Admin view, 
          // but for now fixing the video schema mismatch is the critical first step.
          // Calculating exams for ALL students in bulk might be slow. 
          // Keeping it video-based for now unless requested.

          const completionPercent =
            totalVideos > 0
              ? Math.round((watchedVideos / totalVideos) * 100)
              : 0;

          let status = 'Not Started';
          if (completionPercent === 100) status = 'Completed';
          else if (completionPercent > 0) status = 'In Progress';

          return {
            courseName: course.title,
            completionPercent,
            status,
          };
        }));

        const validCourses = courses.filter(Boolean);
        const overallCompletion =
          validCourses.length > 0
            ? Math.round(
              validCourses.reduce(
                (sum, c) => sum + c.completionPercent,
                0
              ) / validCourses.length
            )
            : 0;

        return {
          studentId: student._id,
          studentName: student.name,
          email: student.email,
          coursesEnrolled: validCourses.length,
          overallCompletion,
          rewardPoints: student.rewardPoints,
        };
      })
    );

    res.status(200).json({
      students: studentsProgress,
      totalStudents: studentsProgress.length,
    });
  } catch (error) {
    console.error('Error fetching all students progress:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc Get progress for a specific course (Module/Topic based)
 * @route GET /api/progress/:studentId/course/:courseId
 * @access Private (Student, Trainer, Admin)
 */
exports.getCourseProgress = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const userId = req.user?.id;

    if (
      userId !== studentId &&
      req.user?.role !== 'Admin' &&
      req.user?.role !== 'Trainer'
    ) {
      return res
        .status(403)
        .json({ message: "Forbidden: cannot access other users' progress" });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const enrollment = student.enrolledCourses.find(
      (e) => e.courseId?.toString() === courseId
    );

    if (!enrollment) {
      const totalTopics =
        course.modules?.reduce(
          (sum, mod) => sum + (mod.topics?.length || 0),
          0
        ) || 0;

      return res.status(200).json({
        course: {
          id: course._id,
          title: course.title,
          description: course.description,
          totalModules: course.modules?.length || 0,
          totalTopics,
        },
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
        },
        progress: {
          completedTopics: 0,
          totalTopics,
          completionPercent: 0,
          status: 'Not Enrolled',
        },
        exams: [],
      });
    }

    // === Calculate per-course progress ===
    const totalTopics =
      course.modules?.reduce(
        (sum, mod) => sum + (mod.topics?.length || 0),
        0
      ) || 0;

    const completedTopics =
      Array.isArray(enrollment.completedTopics) &&
        enrollment.completedTopics.length
        ? enrollment.completedTopics.length
        : typeof enrollment.progress === 'number'
          ? enrollment.progress
          : 0;

    // Compute watched modules count and total modules for trainer-friendly data
    let totalModules = 0;
    if (Array.isArray(course.weeks)) {
      for (const wk of course.weeks) {
        if (wk && Array.isArray(wk.days)) {
          for (const d of wk.days) {
            if (d && (d.videoUrl || d.videoGridFSId)) totalModules++;
          }
        }
      }
    }

    let watchedCount = 0;
    if (typeof enrollment.progress === 'number') {
      watchedCount = enrollment.progress;
    } else if (
      Array.isArray(enrollment.completedWeeks) &&
      enrollment.completedWeeks.length
    ) {
      watchedCount = enrollment.completedWeeks.length;
    } else if (
      Array.isArray(enrollment.completedmodules) &&
      enrollment.completedmodules.length
    ) {
      watchedCount = enrollment.completedmodules.length;
    } else if (
      totalTopics > 0 &&
      Array.isArray(enrollment.completedTopics) &&
      enrollment.completedTopics.length
    ) {
      watchedCount = Math.round(
        (enrollment.completedTopics.length / Math.max(1, totalTopics)) *
        totalModules
      );
    } else {
      watchedCount = 0;
    }

    // === Calculate correct progress including exams ===
    const courseExams = await Exam.find({
      courseId: courseId,
      isInModule: true,
      published: true
    }).select('_id');
    const totalExams = courseExams.length;

    // Fetch passed submissions
    const passedSubmissions = await ExamSubmission.find({
      student: studentId,
      exam: { $in: courseExams.map(e => e._id) },
      status: { $in: ['graded', 'evaluated'] },
      qualified: true
    }).countDocuments();

    const totalItems = totalModules + totalExams; // totalModules is actually totalVideos here
    const completedItems = watchedCount + passedSubmissions;

    const completionPercent =
      totalItems > 0
        ? Math.round(
          (completedItems / Math.max(1, totalItems)) * 100
        )
        : 0;

    let status = 'Not Started';
    if (completionPercent === 100) status = 'Completed';
    else if (completionPercent > 0) status = 'In Progress';

    // === Course Exam Results ===
    const examResults = await ExamResult.find({
      student: studentId,
      course: courseId,
    });

    res.status(200).json({
      course: {
        id: course._id,
        title: course.title,
        description: course.description,
        totalModules,
        totalTopics,
      },
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
      },
      progress: {
        completedTopics,
        totalTopics,
        completionPercent,
        status,
        watchedCount,
        totalModules,
        completedWeeks: enrollment.completedWeeks || [],
      },
      exams: examResults.map((r) => ({
        id: r._id,
        score: r.score,
        totalMarks: r.totalMarks,
        passed: r.passed,
        attemptedAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ message: error.message });
  }
};
