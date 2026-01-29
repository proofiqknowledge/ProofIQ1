const Batch = require('../models/Batch');
const User = require('../models/User');
const Exam = require('../models/Exam');
const ExamSubmission = require('../models/ExamSubmission');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const { notifyStudentAddedToBatch, notifyBatchAssigned } = require('../utils/notificationHelper');

// Admin: set per-batch course access duration
exports.setBatchAccessDuration = async (req, res) => {
  try {
    const batchId = req.params.id;
    const { accessDurationWeeks = 0, accessDurationDays = 0, accessStartDate } = req.body;

    // Validate numbers
    const weeks = Number(accessDurationWeeks) || 0;
    const days = Number(accessDurationDays) || 0;

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    // Determine effective start date: explicit accessStartDate -> batch.accessStartDate -> batch.startDate -> now
    const start = accessStartDate ? new Date(accessStartDate) : (batch.accessStartDate || batch.startDate || new Date());

    // Compute expiry: start + weeks*7 days + days
    const totalDays = weeks * 7 + days;
    const expiry = totalDays > 0 ? new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000) : null;

    batch.accessDurationWeeks = weeks;
    batch.accessDurationDays = days;
    batch.accessStartDate = start;
    batch.courseAccessExpiry = expiry;

    await batch.save();

    const populated = await Batch.findById(batch._id).populate('trainer users course');
    return res.json({ message: 'Batch access duration updated', batch: populated });
  } catch (err) {
    console.error('setBatchAccessDuration error:', err);
    return res.status(500).json({ message: 'Failed to set access duration', error: err.message });
  }
};


// Create Batch (admin)
exports.createBatch = async (req, res) => {
  try {
    const { name, startDate, endDate, trainerId, courseId } = req.body;

    // Validate trainer exists
    const trainer = await User.findOne({ _id: trainerId, role: 'Trainer' });
    if (!trainer) {
      return res.status(400).json({ message: 'Invalid trainer selected' });
    }

    // ensure unique batch name
    const existing = await Batch.findOne({ name: name.trim() });
    if (existing) return res.status(400).json({ message: 'Batch name already exists' });

    // Fetch course to check courseStay settings
    let courseAccessExpiry = null;
    if (courseId) {
      try {
        const Course = require('../models/Course');
        const course = await Course.findById(courseId);
        if (course && course.courseStayEnabled) {
          // Calculate expiry: startDate + duration
          const start = startDate ? new Date(startDate) : new Date();
          if (course.courseStayDurationDays > 0) {
            // Days override weeks
            const totalDays = course.courseStayDurationDays;
            courseAccessExpiry = new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000);
          } else if (course.courseStayDurationWeeks > 0) {
            const totalDays = course.courseStayDurationWeeks * 7;
            courseAccessExpiry = new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000);
          }
        }
      } catch (err) {
        console.error('Error fetching course for batch expiry calculation:', err && err.message);
      }
    }

    const batch = await Batch.create({
      name: name.trim(),
      startDate,
      endDate,
      trainer: trainerId,
      course: courseId,
      users: [], // Start with empty users array
      courseAccessExpiry // Store computed expiry
    });

    // Populate trainer and course details for response
    const populatedBatch = await Batch.findById(batch._id)
      .populate('trainer', 'name email')
      .populate('course', 'title');

    // Sync trainer to Course: set course.trainer and ensure assignedTrainers contains trainerId
    if (courseId) {
      try {
        const Course = require('../models/Course');
        const course = await Course.findById(courseId);

        if (!req.body.durationWeeks) {
          req.body.durationWeeks = course.durationWeeks || 0;
        }
        await Course.findByIdAndUpdate(courseId, { $addToSet: { assignedTrainers: trainerId }, $set: { trainer: trainerId } });
      } catch (err) {
        console.error('Error syncing trainer to course for createBatch:', err && err.message);
      }
    }

    // Send notification to trainer about batch assignment
    await notifyBatchAssigned(trainerId, batch.name);
    console.log(`📢 Sent batch assignment notification to trainer`);

    res.status(201).json(populatedBatch);
  } catch (err) {
    console.error('Create batch error:', err);
    res.status(500).json({
      message: err.message || 'Error creating batch',
      error: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
};


// Create batch from uploaded Excel file containing student emails
exports.createBatchWithExcel = async (req, res) => {
  try {
    console.log('📋 Batch creation with Excel started');
    const { name, startDate, endDate, trainerId, courseId, accessDurationWeeks, accessDurationDays, accessStartDate } = req.body;

    // Validate required fields
    if (!name || !trainerId || !courseId) {
      return res.status(400).json({ message: 'Batch name, trainer, and course are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Excel file is required' });
    }

    // Validate trainer
    const trainer = await User.findOne({ _id: trainerId, role: 'Trainer' });
    if (!trainer) {
      return res.status(400).json({ message: 'Invalid trainer selected' });
    }

    // Check for duplicate batch name
    const existing = await Batch.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: 'Batch name already exists' });
    }

    // Read Excel file from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

    console.log(`📊 Parsed ${data.length} rows from Excel`);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty' });
    }

    // Extract student emails
    const emails = data.map(row => {
      const email = row.email || row.Email || row.EMAIL || row['Email Address'];
      return email ? String(email).toLowerCase().trim() : null;
    }).filter(Boolean);

    console.log(`📧 Found ${emails.length} valid emails`);

    if (emails.length === 0) {
      return res.status(400).json({ message: 'No valid emails found in Excel file' });
    }

    // Find students by email
    const students = await User.find({
      email: { $in: emails },
      role: 'Student'
    });

    console.log(`👥 Found ${students.length} students in database`);

    if (students.length === 0) {
      return res.status(400).json({
        message: 'No matching students found in database.'
      });
    }

    // ✅ ONLY filter - DON'T reject if some are assigned
    const unassignedStudents = students.filter(s => !s.batch);
    const alreadyAssigned = students.filter(s => s.batch);

    console.log(`✅ ${unassignedStudents.length} unassigned students`);
    console.log(`⚠️ ${alreadyAssigned.length} already assigned (will be skipped)`);

    if (unassignedStudents.length === 0) {
      return res.status(400).json({
        message: 'All students are already assigned to other batches.'
      });
    }

    // Create batch with unassigned students ONLY
    const batch = await Batch.create({
      name: name.trim(),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      trainer: trainerId,
      course: courseId,
      users: unassignedStudents.map(s => s._id),
      // Access duration fields
      accessDurationWeeks: Number(accessDurationWeeks) || 0,
      accessDurationDays: Number(accessDurationDays) || 0,
      accessStartDate: accessStartDate || undefined,
      // Compute courseAccessExpiry if access duration is set
      ...(accessDurationWeeks || accessDurationDays ? {
        courseAccessExpiry: (() => {
          const start = accessStartDate ? new Date(accessStartDate) : (startDate ? new Date(startDate) : new Date());
          const totalDays = (Number(accessDurationWeeks) || 0) * 7 + (Number(accessDurationDays) || 0);
          return new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000);
        })()
      } : {})
    });

    // Update students' batch field
    await User.updateMany(
      { _id: { $in: unassignedStudents.map(s => s._id) } },
      { $set: { batch: batch._id } }
    );

    // Enroll students in course
    for (const student of unassignedStudents) {
      if (!student.enrolledCourses.some(ec => ec.courseId?.toString() === courseId.toString())) {
        student.enrolledCourses.push({ courseId, progress: 0, completedWeeks: [] });
        await student.save();
      }
    }

    // Send notifications
    for (const student of unassignedStudents) {
      try {
        await notifyStudentAddedToBatch(student._id, batch._id);
      } catch (err) {
        console.error('Notification error:', err);
      }
    }

    // Populate and return
    const populatedBatch = await Batch.findById(batch._id)
      .populate('trainer', 'name email')
      .populate('course', 'title')
      .populate('users', 'name email');

    console.log(`✅ Batch created with ${unassignedStudents.length} students`);

    res.status(201).json({
      message: `Batch created! ${unassignedStudents.length} students added${alreadyAssigned.length > 0 ? `, ${alreadyAssigned.length} skipped (already assigned)` : ''}`,
      batch: populatedBatch,
      stats: {
        total: emails.length,
        added: unassignedStudents.length,
        skipped: alreadyAssigned.length,
        notFound: emails.length - students.length
      }
    });

  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



// Get all batches
exports.getAllBatches = async (req, res) => {
  try {
    const user = req.user;
    let batches;
    if (user.role === 'Admin' || user.role === 'Master') {
      batches = await Batch.find().populate('trainer users course');
    } else if (user.role === 'Trainer') {
      batches = await Batch.find({ trainer: user.id }).populate('trainer users course');
    } else { // Student
      batches = await Batch.find({ users: user.id }).populate('trainer users course');
    }
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/batches/progress-dashboard
// Returns batches visible to the user (admin -> all, trainer -> own) with precomputed progress
exports.getBatchesProgressDashboard = async (req, res) => {
  try {
    const user = req.user;
    const match = {};
    if (user.role === 'Trainer') {
      match.trainer = require('mongoose').Types.ObjectId(user.id);
    }

    // Aggregation: lookup course and students, compute totalModules and per-student completion
    const pipeline = [
      { $match: match },
      // lookup course document
      { $lookup: { from: 'courses', localField: 'course', foreignField: '_id', as: 'courseDoc' } },
      { $unwind: { path: '$courseDoc', preserveNullAndEmptyArrays: true } },
      // lookup student user documents
      { $lookup: { from: 'users', localField: 'users', foreignField: '_id', as: 'students' } },
      // compute totalModules as number of weeks (modules), not number of video days
      {
        $addFields: {
          totalModules: { $size: { $ifNull: ['$courseDoc.weeks', []] } }
        }
      },
      // compute per-student percentage array
      // compute per-student percentage array (FIXED TO MATCH STUDENT DASHBOARD PERCENT)
      {
        $addFields: {
          studentPercents: {
            $map: {
              input: { $ifNull: ["$students", []] },
              as: "s",
              in: {
                $let: {
                  vars: {
                    enrolled: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ["$$s.enrolledCourses", []] },
                            as: "ec",
                            cond: {
                              $eq: [
                                { $toString: "$$ec.courseId" },
                                { $toString: "$course" }
                              ]
                            }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: {
                    $let: {
                      vars: {
                        // Explicit percentCompleted from student dashboard
                        explicitPercent: {
                          $ifNull: ["$$enrolled.percentCompleted", null]
                        },

                        // Fallback watchedCount if explicitPercent is missing
                        watched: {
                          $ifNull: [
                            "$$enrolled.watchedCount",
                            "$$enrolled.progress"
                          ]
                        }
                      },
                      in: {
                        // Prefer explicit percent
                        $cond: [
                          { $ne: ["$$explicitPercent", null] },
                          { $round: ["$$explicitPercent", 0] },

                          // Else compute from watchedCount / totalModules * 100
                          {
                            $cond: [
                              { $gt: ["$totalModules", 0] },
                              {
                                $round: [
                                  {
                                    $multiply: [
                                      {
                                        $divide: [
                                          "$$watched",
                                          "$totalModules"
                                        ]
                                      },
                                      100
                                    ]
                                  },
                                  0
                                ]
                              },
                              0
                            ]
                          }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },

      // average percent (0 if no students)
      {
        $addFields: {
          avgProgress: {
            $cond: [
              { $gt: [{ $size: '$studentPercents' }, 0] },
              { $avg: '$studentPercents' },
              0
            ]
          }
        }
      },
      // project desired fields
      {
        $project: {
          _id: 1,
          name: 1,
          trainer: 1,
          course: 1,
          'courseTitle': '$courseDoc.title',
          totalTrainees: { $size: { $ifNull: ['$students', []] } },
          totalModules: 1,
          avgProgress: { $round: ['$avgProgress', 0] }
        }
      }
    ];

    const batches = await Batch.aggregate(pipeline).allowDiskUse(true);

    res.json({ success: true, batches });
  } catch (err) {
    console.error('getBatchesProgressDashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};


// Get single batch
exports.getBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate("trainer", "name email")
      .populate("course")
      // include employeeId so frontend can display it
      .populate("users", "name email enrolledCourses employeeId");

    if (!batch) return res.status(404).json({ message: "Batch not found" });

    // Auth checks
    const user = req.user;
    if (user.role !== "Admin" && user.role !== "Master") {
      if (user.role === "Trainer" && String(batch.trainer._id) !== String(user.id)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (user.role === "Student" && !batch.users.some(u => String(u._id) === String(user.id))) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    // ----- FIX: Compute percentCompleted for each student -----
    const courseId = String(batch.course._id);
    // Use number of days/videos as total content count for accurate percentage
    const totalContentItems = batch.course.weeks?.reduce((acc, week) => acc + (week.days?.length || 0), 0) || 0;

    // 1. Find all exams for this course
    const courseExams = await Exam.find({ courseId: courseId }).select('title weekNumber isInModule totalMarks').lean();
    const courseExamIds = courseExams.map(e => e._id);

    // 2. Find submissions for these exams by these students
    // We want the LATEST submission for each exam per student if they have multiple
    const allSubmissions = await ExamSubmission.find({
      exam: { $in: courseExamIds },
      student: { $in: batch.users.map(u => u._id) }
    })
      .populate('exam', 'title weekNumber isInModule totalMarks') // Populate exam details
      .sort({ createdAt: -1 }) // Sort by new to old to easily pick latest
      .lean();


    // Create lookup for exams by weekNumber (Optimization: moved outside loop)
    const examsByWeek = new Map();
    courseExams.forEach(exam => {
      if (exam.weekNumber) examsByWeek.set(Number(exam.weekNumber), exam);
    });

    const usersWithProgress = batch.users.map(u => {
      const enrolled = u.enrolledCourses?.find(
        ec => String(ec.courseId) === courseId
      );




      // Clamp percentage to 100 max
      const percent = enrolled?.percentCompleted ?? (
        totalContentItems > 0
          ? Math.min(100, Math.round(((enrolled?.watchedCount || enrolled?.progress || 0) / totalContentItems) * 100))
          : 0
      );

      // Filter submissions for this user
      const userSubmissions = allSubmissions.filter(sub => String(sub.student) === String(u._id));

      // Group by exam to get latest attempt only
      const latestSubmissionsMap = new Map();
      userSubmissions.forEach(sub => {
        const examId = String(sub.exam._id);
        if (!latestSubmissionsMap.has(examId)) {
          latestSubmissionsMap.set(examId, sub);
        }
      });
      // const uniqueSubmissions = Array.from(latestSubmissionsMap.values()); // No longer iterating this directly

      // Format for frontend: Iterate ALL weeks in course
      let formattedResults = [];
      if (batch.course && Array.isArray(batch.course.weeks)) {
        formattedResults = batch.course.weeks.map(week => {
          const weekNum = Number(week.weekNumber);
          const moduleExam = examsByWeek.get(weekNum);
          const submission = moduleExam ? latestSubmissionsMap.get(String(moduleExam._id)) : null;

          // Video Progress Calculation
          let videoProgress = { watched: 0, total: 0 };
          if (week.days && Array.isArray(week.days)) {
            const moduleVideoIds = week.days
              .filter(d => d.videoGridFSId)
              .map(d => String(d.videoGridFSId));

            videoProgress.total = moduleVideoIds.length;

            if (enrolled) {
              let watchedCount = 0;
              // Strategy 1: Precise tracking
              if (Array.isArray(enrolled.watchedVideos) && enrolled.watchedVideos.length > 0) {
                const watchedSet = new Set(enrolled.watchedVideos.map(v => String(v.videoGridFSId || '')));
                watchedCount = moduleVideoIds.filter(vid => watchedSet.has(vid)).length;
              }
              // Strategy 2: Completed Weeks Override
              if (enrolled.completedWeeks && enrolled.completedWeeks.includes(weekNum)) {
                watchedCount = videoProgress.total;
              }
              // Strategy 3: Global Progress derivation
              if (watchedCount === 0 && (!enrolled.watchedVideos || enrolled.watchedVideos.length === 0)) {
                let videosBeforeThisWeek = 0;
                batch.course.weeks.forEach(w => {
                  if (w.weekNumber < weekNum && Array.isArray(w.days)) {
                    videosBeforeThisWeek += w.days.filter(d => d.videoGridFSId).length;
                  }
                });
                const totalUserProgress = enrolled.progress || 0;
                if (totalUserProgress > videosBeforeThisWeek) {
                  const progressForThisWeek = totalUserProgress - videosBeforeThisWeek;
                  watchedCount = Math.min(videoProgress.total, progressForThisWeek);
                }
              }
              videoProgress.watched = watchedCount;
            }
          }

          // Status Determination
          let status = 'NO_EXAM';
          let score = 0;
          let totalQuestions = 0;
          let passed = false;
          let date = null;
          let title = week.title || `Module ${weekNum}`;

          if (moduleExam) {
            title = moduleExam.title;
            totalQuestions = moduleExam.totalMarks || 100;

            if (submission) {
              // Check if actually submitted
              const isSubmitted = submission.submitted || ['submitted', 'graded', 'evaluated'].includes(submission.status);

              if (isSubmitted) {
                status = 'ATTEMPTED';
                score = submission.totalMarksObtained || submission.score || 0;
                passed = submission.qualified || (submission.percentageScore >= 50);
                date = submission.submittedAt || submission.updatedAt;
              } else {
                status = 'IN_PROGRESS';
                score = 0; // Don't show score for in-progress
                date = submission.createdAt;
              }
            } else {
              status = 'NOT_ATTEMPTED';
              totalQuestions = moduleExam.totalMarks || 100; // Show total even if not attempted
            }
          }

          return {
            module: weekNum,
            title: title,
            score: score,
            totalQuestions: totalQuestions,
            passed: passed,
            date: date,
            videoProgress: videoProgress,
            status: status, // 'NO_EXAM', 'ATTEMPTED', 'NOT_ATTEMPTED'
            examId: moduleExam ? moduleExam._id : null
          };
        });

        // Sort by module/week
        formattedResults.sort((a, b) => (a.module || 99) - (b.module || 99));
      }


      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        employeeId: u.employeeId || null,
        percentCompleted: percent,
        examResults: formattedResults
      };
    });

    // Attach computed values
    const safeBatch = batch.toObject();
    safeBatch.users = usersWithProgress;

    res.json(safeBatch);
  } catch (err) {
    console.error("getBatch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// Update Batch (admin)
exports.updateBatch = async (req, res) => {
  try {
    // If trainer is being changed, validate the trainer id and role
    if (req.body && req.body.trainer) {
      const trainerUser = await User.findOne({ _id: req.body.trainer, role: 'Trainer' });
      if (!trainerUser) {
        return res.status(400).json({ message: 'Invalid trainer selected' });
      }
    }

    // Load existing batch to detect changes (especially course changes)
    const existingBatch = await Batch.findById(req.params.id).populate('trainer users course');
    if (!existingBatch) return res.status(404).json({ message: 'Batch not found' });

    const oldCourseId = existingBatch.course ? (existingBatch.course._id ? String(existingBatch.course._id) : String(existingBatch.course)) : null;
    const newCourseId = req.body && req.body.course ? String(req.body.course) : null;

    // Prepare list of user IDs in this batch for later updates
    const usersInBatch = (existingBatch.users || []).map(u => u._id ? u._id : u);

    // Perform the update inside a transaction when possible to reduce race-conditions
    const session = await mongoose.startSession();
    let batch;
    try {
      session.startTransaction();

      // Update the batch document within the session
      batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true, session }).populate('trainer users course');
      if (!batch) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: 'Batch not found' });
      }

      // Recalculate courseAccessExpiry based on course stay duration settings
      try {
        const Course = require('../models/Course');
        const courseToCheck = batch.course && batch.course._id ? batch.course._id : (req.body.course ? req.body.course : oldCourseId);
        if (courseToCheck) {
          const course = await Course.findById(courseToCheck);
          if (course && course.courseStayEnabled) {
            // Calculate expiry: batch.startDate + duration
            const start = batch.startDate ? new Date(batch.startDate) : new Date();
            let courseAccessExpiry = null;
            if (course.courseStayDurationDays > 0) {
              // Days override weeks
              const totalDays = course.courseStayDurationDays;
              courseAccessExpiry = new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000);
            } else if (course.courseStayDurationWeeks > 0) {
              const totalDays = course.courseStayDurationWeeks * 7;
              courseAccessExpiry = new Date(start.getTime() + totalDays * 24 * 60 * 60 * 1000);
            }
            batch.courseAccessExpiry = courseAccessExpiry;
            await batch.save({ session });
          }
        }
      } catch (err) {
        console.error('Error calculating courseAccessExpiry in updateBatch:', err && err.message);
      }

      console.log(`[updateBatch] batchId=${req.params.id} oldCourse=${oldCourseId} newCourse=${newCourseId} users=${usersInBatch.length}`);

      // If trainer was updated and this batch references a course, sync the course's trainer and assignedTrainers
      try {
        if (req.body && req.body.trainer && batch.course) {
          const Course = require('../models/Course');
          const course = await Course.findById(courseId);

          if (!req.body.durationWeeks) {
            req.body.durationWeeks = course.durationWeeks || 0;
          }
          const courseId = batch.course._id ? batch.course._id : batch.course;
          const courseUpdateRes = await Course.findByIdAndUpdate(courseId, { $addToSet: { assignedTrainers: req.body.trainer }, $set: { trainer: req.body.trainer } }, { session });
          console.log('[updateBatch] synced trainer to course result:', courseUpdateRes ? 'ok' : 'no-course');
        }
      } catch (err) {
        console.error('Error syncing trainer to course during batch update:', err && err.message);
      }

      // If the course for this batch changed, ensure students keep previous enrolled courses and also get the new course added
      if (newCourseId && oldCourseId !== newCourseId) {
        if (usersInBatch.length > 0) {
          try {
            const userUpdateResult = await User.updateMany(
              { _id: { $in: usersInBatch }, 'enrolledCourses.courseId': { $ne: mongoose.Types.ObjectId(newCourseId) } },
              { $push: { enrolledCourses: { courseId: mongoose.Types.ObjectId(newCourseId), progress: 0, completedmodules: [] } } },
              { session }
            );
            console.log('[updateBatch] added new course to users result:', userUpdateResult && (userUpdateResult.nModified || userUpdateResult.modifiedCount || userUpdateResult.n));
          } catch (e) {
            // Fallback if newCourseId is not a valid ObjectId string
            const userUpdateResult = await User.updateMany(
              { _id: { $in: usersInBatch }, 'enrolledCourses.courseId': { $ne: newCourseId } },
              { $push: { enrolledCourses: { courseId: newCourseId, progress: 0, completedmodules: [] } } },
              { session }
            );
            console.log('[updateBatch] added new course to users (fallback) result:', userUpdateResult && (userUpdateResult.nModified || userUpdateResult.modifiedCount || userUpdateResult.n));
          }
        }

        // Ensure the trainer for this batch is recorded on the new Course.assignedTrainers (do not overwrite course.trainer)
        try {
          const Course = require('../models/Course');
          const trainerIdToAdd = batch.trainer && batch.trainer._id ? String(batch.trainer._id) : (existingBatch.trainer && existingBatch.trainer._id ? String(existingBatch.trainer._id) : null);
          if (trainerIdToAdd) {
            const courseTrainerRes = await Course.findByIdAndUpdate(newCourseId, { $addToSet: { assignedTrainers: trainerIdToAdd } }, { session });
            console.log('[updateBatch] added trainer to new course result:', courseTrainerRes ? 'ok' : 'no-course');
          }
        } catch (err) {
          console.error('Error adding trainer to new course during batch update:', err && err.message);
        }
      }

      // Ensure the old course is preserved for students: if oldCourseId exists, re-add it if missing
      if (oldCourseId && usersInBatch && usersInBatch.length > 0) {
        try {
          const oldCourseResult = await User.updateMany(
            { _id: { $in: usersInBatch }, 'enrolledCourses.courseId': { $ne: mongoose.Types.ObjectId(oldCourseId) } },
            { $push: { enrolledCourses: { courseId: mongoose.Types.ObjectId(oldCourseId), progress: 0, completedmodules: [] } } },
            { session }
          );
          console.log('[updateBatch] re-added old course to users result:', oldCourseResult && (oldCourseResult.nModified || oldCourseResult.modifiedCount || oldCourseResult.n));
        } catch (e) {
          const oldCourseResult = await User.updateMany(
            { _id: { $in: usersInBatch }, 'enrolledCourses.courseId': { $ne: oldCourseId } },
            { $push: { enrolledCourses: { courseId: oldCourseId, progress: 0, completedmodules: [] } } },
            { session }
          );
          console.log('[updateBatch] re-added old course to users (fallback) result:', oldCourseResult && (oldCourseResult.nModified || oldCourseResult.modifiedCount || oldCourseResult.n));
        }
      }

      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      try {
        await session.abortTransaction();
        session.endSession();
      } catch (e) {
        // ignore
      }
      console.error('updateBatch transaction error:', err && err.stack ? err.stack : err);
      return res.status(500).json({ message: err.message || 'Server error' });
    }

    res.json(batch);
  } catch (err) {
    console.error('updateBatch error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};


// Delete Batch (admin)
exports.deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json({ message: 'Batch deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};


// Assign user(s) to batch (admin)
exports.assignUserToBatch = async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if user can be added to this batch
    try {
      await Batch.canAddUser(userId);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    // First, check if the user is already in another batch
    const existingUserBatch = await User.findOne({
      _id: userId,
      batch: { $exists: true, $ne: null, $ne: req.params.id }
    });

    if (existingUserBatch) {
      return res.status(400).json({
        message: 'This student is already assigned to another batch. Students can only be in one batch at a time.'
      });
    }

    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { users: userId } },
      { new: true, runValidators: true }
    ).populate('trainer users course');

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Update user's batch field
    await User.findByIdAndUpdate(userId, { batch: req.params.id });

    // ⭐ FIXED: Enroll user in ALL courses assigned to this batch
    try {
      const Course = require('../models/Course');
      // Find all courses that have this batch in their assignedBatches array
      const assignedCourses = await Course.find({
        assignedBatches: req.params.id
      }).select('_id');

      console.log(`Found ${assignedCourses.length} courses assigned to batch ${req.params.id}`);

      // Enroll the student in each course
      for (const course of assignedCourses) {
        const courseId = course._id.toString();
        try {
          const user = await User.findById(userId);
          const alreadyEnrolled = user.enrolledCourses.some(
            ec => ec.courseId.toString() === courseId
          );

          if (!alreadyEnrolled) {
            await User.updateOne(
              { _id: userId },
              {
                $push: {
                  enrolledCourses: {
                    courseId: mongoose.Types.ObjectId(courseId),
                    progress: 0,
                    completedmodules: []
                  }
                }
              }
            );
            console.log(`✅ Enrolled user ${userId} in course ${courseId}`);
          } else {
            console.log(`ℹ️ User ${userId} already enrolled in course ${courseId}`);
          }
        } catch (enrollErr) {
          console.error(`Error enrolling user in course ${courseId}:`, enrollErr.message);
        }
      }
    } catch (err) {
      console.error('Error enrolling user in batch courses:', err.message);
    }

    // Send notification to the student about being added to batch
    await notifyStudentAddedToBatch(userId, batch.name);
    console.log(`📢 Sent batch assignment notification to student`);

    res.json(batch);
  } catch (err) {
    console.error('assignUserToBatch error:', err);
    res.status(500).json({
      message: err.message || 'Error assigning user to batch',
      error: process.env.NODE_ENV === 'development' ? err : undefined
    });
  }
};


// Remove user from batch (admin)
exports.removeUserFromBatch = async (req, res) => {
  try {
    const { userId } = req.body;
    // Remove from batch users array
    const batch = await Batch.findByIdAndUpdate(
      req.params.id,
      { $pull: { users: userId } },
      { new: true }
    ).populate('trainer users course');

    // Clear user's batch field
    await User.findByIdAndUpdate(userId, { batch: null });


    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};


// Get students in a batch
exports.getBatchStudents = async (req, res) => {
  try {
    const { id } = req.params;

    // First populate the batch to get users array
    const batch = await Batch.findById(id)
      .populate({
        path: 'users',
        match: { role: 'Student' },
        select: 'name email role rewardPoints'
      });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }


    res.json(batch.users);
  } catch (err) {
    console.error('getBatchStudents error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



// Get all batches with student count
exports.getBatchesWithCount = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate('trainer', 'name email')
      .populate('course', 'title')
      .populate({
        path: 'users',
        match: { role: 'Student' }
      });

    // Add student count based on populated users array
    const batchesWithCount = batches.map((batch) => {
      const studentCount = batch.users.length;
      return {
        ...batch.toObject(),
        studentCount
      };
    });

    res.json(batchesWithCount);
  } catch (err) {
    console.error('getBatchesWithCount error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// Add students to an existing batch from uploaded Excel
exports.addStudentsFromExcel = async (req, res) => {
  try {
    const batchId = req.params.id;

    const batch = await Batch.findById(batchId).populate('course');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    // parse excel buffer
    if (!req.file || !req.file.buffer) return res.status(400).json({ message: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const emailCandidates = rows.map(r => r.email || r.Email || r.EMAIL || r['Email Address'] || '').filter(Boolean);
    const emails = Array.from(new Set(emailCandidates.map(e => String(e).trim().toLowerCase())));

    // find students matching emails
    const students = await User.find({
      email: { $in: emails },
      role: 'Student'
    });

    // Identify students already in other batches
    // const assignedStudents = students.filter(s => s.batch && String(s.batch) !== String(batchId));
    // if (assignedStudents.length > 0) {
    //   const assignedEmails = assignedStudents.map(s => s.email).join(', ');
    //   return res.status(400).json({ message: `The following students are already assigned to other batches: ${assignedEmails}. Students can only be in one batch at a time.` });
    // }

    // Students that can be added (not already in this batch)
    const toAdd = students.filter(s => !s.batch || String(s.batch) === String(batchId));
    const toAddIds = toAdd.map(s => s._id);

    if (toAddIds.length === 0) {
      return res.status(400).json({ message: 'No eligible students found to add' });
    }

    // Add students to batch.users
    await Batch.findByIdAndUpdate(batchId, { $addToSet: { users: { $each: toAddIds } } });

    // Update users' batch field
    await User.updateMany({ _id: { $in: toAddIds } }, { $set: { batch: batchId } });

    // Add course to enrolledCourses for these students if batch has a course
    if (batch.course) {
      const courseId = batch.course._id ? batch.course._id : batch.course;
      try {
        await User.updateMany(
          { _id: { $in: toAddIds }, 'enrolledCourses.courseId': { $ne: courseId } },
          { $push: { enrolledCourses: { courseId: courseId, progress: 0, completedmodules: [] } } }
        );
      } catch (err) {
        // fallback if courseId isn't an ObjectId
        await User.updateMany(
          { _id: { $in: toAddIds }, 'enrolledCourses.courseId': { $ne: String(courseId) } },
          { $push: { enrolledCourses: { courseId: String(courseId), progress: 0, completedmodules: [] } } }
        );
      }
    }

    // Send notifications to all added students about batch assignment
    // Send notifications to all added students about batch assignment
    for (const studentId of toAddIds) {
      try {
        await notifyStudentAddedToBatch(studentId, batch.name);
      } catch (notifError) {
        console.error('Notification error for student:', studentId, notifError.message);
      }
    }

    console.log(`📢 Sent batch assignment notifications to ${toAddIds.length} students in batch "${batch.name}"`);

    res.json({ message: 'Students added to batch', addedEmails: toAdd.map(s => s.email) });
  } catch (err) {
    console.error('addStudentsFromExcel error:', err);
    res.status(500).json({ message: err.message || 'Error adding students from excel' });
  }
};


// Remove Student from Batch (Admin/Master only)
exports.removeStudentFromBatch = async (req, res) => {
  try {
    const { id } = req.params; // Batch ID
    const { studentId } = req.body;

    // Strict Role Check
    if (req.user.role !== 'Admin' && req.user.role !== 'Master') {
      return res.status(403).json({ message: 'Access denied. Only Admins and Masters can remove students.' });
    }

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Check if student is in the batch
    const studentIndex = batch.users.indexOf(studentId);
    if (studentIndex === -1) {
      return res.status(400).json({ message: 'Student is not in this batch' });
    }

    // Remove student from batch users array
    batch.users.splice(studentIndex, 1);
    await batch.save();

    // Remove batch reference from user (Preserve all other data)
    await User.findByIdAndUpdate(studentId, { $unset: { batch: 1 } });

    console.log(`✅ Removed student ${studentId} from batch ${batch.name} by ${req.user.email}`);

    // Return updated batch
    const updatedBatch = await Batch.findById(id).populate('trainer users course');
    res.json(updatedBatch);

  } catch (err) {
    console.error('removeStudentFromBatch error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
