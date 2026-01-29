const User = require('../models/User');
const ExamResult = require('../models/ExamResult');
const Course = require('../models/Course');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const Batch = require('../models/Batch');
const Exam = require('../models/Exam');
const ExamSubmission = require('../models/ExamSubmission');

// Get info about current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'Master' } }).select('-passwordHash');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// // Admin: get user by id
// exports.getUserById = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id)
//       .select('-passwordHash')
//       .populate('batch', 'name') // For students who have batch field
//       .lean();

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // If user is a trainer, find batches where they are assigned as trainer
//     if (user.role === 'Trainer') {
//       const trainerBatches = await Batch.find({ trainer: user._id })
//         .select('name')
//         .lean();

//       // Format batch names as comma-separated string
//       if (trainerBatches && trainerBatches.length > 0) {
//         user.batch = trainerBatches.map(b => b.name).join(', ');
//       } else {
//         user.batch = 'Not Assigned';
//       }
//     } else if (user.batch && user.batch.name) {
//       // For students, show the batch name
//       user.batch = user.batch.name;
//     } else {
//       user.batch = 'Not Assigned';
//     }

//     res.json({ user }); // Wrap in object with user property
//   } catch (err) {
//     console.error('Error in getUserById:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };



// Admin/Master/Self: update user
exports.updateUser = async (req, res) => {
  try {
    const { name, email, batch, rewardPoints, role } = req.body;

    // Check if target user is Master
    const targetUser = await User.findById(req.params.id);
    if (targetUser && targetUser.role === 'Master' && req.user.id !== targetUser._id.toString()) {
      return res.status(403).json({ message: 'Cannot modify Master user' });
    }

    let update = {};
    const canManage = req.user.role === 'Admin' || req.user.role === 'Master';

    if (canManage) {
      if (name) update.name = name;
      if (email) update.email = email;
      if (batch !== undefined) update.batch = batch;
      if (rewardPoints !== undefined) update.rewardPoints = rewardPoints;
      // Only Master can change roles to/from Admin, or change anyone's role freely
      if (role) {
        if (role === 'Master') return res.status(403).json({ message: 'Cannot promote to Master' });
        update.role = role;
      }
    } else {
      // Self update
      if (name) update.name = name;
      if (email) update.email = email;
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin/Master: delete user
exports.deleteUser = async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) return res.status(404).json({ message: 'User not found' });

    // 🛡️ PROTECT MASTER
    if (userToDelete.role === 'Master') {
      return res.status(403).json({ message: 'Cannot delete Master user' });
    }

    // 🛡️ PROTECT ADMIN (Only Master can delete Admins)
    if (userToDelete.role === 'Admin' && req.user.role !== 'Master') {
      return res.status(403).json({ message: 'Only Master can delete Admin users' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get all trainers
exports.getAllTrainers = async (req, res) => {
  try {
    const trainers = await User.find({ role: 'Trainer' }).select('-passwordHash');
    res.json(trainers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'Student' }).select('-passwordHash');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Student: User dashboard
exports.getUserDashboard = async (req, res) => {
  try {
    // Populate enrolled courses with weeks so we can compute modules with videos
    const user = await User.findById(req.user.id)
      .populate('enrolledCourses.courseId', 'title weeks')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const exams = await ExamResult.find({ user: user._id })
      .sort({ date: -1 })
      .populate('course', 'title')
      .lean();

    const enrolledCourses = Array.isArray(user.enrolledCourses) ? user.enrolledCourses : [];

    // ✅ Optimize: Fetch all exams for enrolled courses in one query
    const courseIds = enrolledCourses.map(ec => ec.courseId?._id).filter(Boolean);
    const moduleExams = await Exam.find({
      courseId: { $in: courseIds },
      isInModule: true,
      published: true
    }).select('courseId _id');

    // ✅ Optimize: Fetch all passed submissions for this student
    const passedSubmissions = await ExamSubmission.find({
      student: user._id,
      status: { $in: ['graded', 'evaluated'] },
      qualified: true
    }).select('exam');
    const passedExamIds = new Set(passedSubmissions.map(s => String(s.exam)));

    const dashboardCourses = enrolledCourses.map(ec => {
      const course = ec.courseId || {};

      // Get actual module numbers that exist in the course
      const actualWeekNumbers = new Set();
      if (course.weeks && Array.isArray(course.weeks)) {
        for (const wk of course.weeks) {
          actualWeekNumbers.add(Number(wk.weekNumber));
        }
      }

      // Filter completedWeeks to only include modules that actually exist
      const validCompletedWeeks = (ec.completedWeeks || []).filter(
        wk => actualWeekNumbers.has(Number(wk))
      );
      // Count total modules/days that contain a video (either videoUrl or videoGridFSId)
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

      const watchedCount = typeof ec.progress === 'number' ? ec.progress : 0; // progress increments when a day is acknowledged

      // ✅ FIX: Include exams in progress calculation
      let totalExams = 0;
      let passedCount = 0;

      if (course._id) {
        const courseIdStr = course._id.toString();
        // moduleExams and passedExamIds are available from outer scope (added in previous step)
        const courseExams = moduleExams.filter(e => e.courseId && e.courseId.toString() === courseIdStr);
        totalExams = courseExams.length;
        passedCount = courseExams.filter(e => passedExamIds.has(e._id.toString())).length;
      }

      const totalItems = totalModules + totalExams; // totalModules is totalVideos
      const completedItems = watchedCount + passedCount;

      const percentCompleted = totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0;

      return {
        courseId: course._id,
        title: course.title,
        watchedCount,
        totalModules, // This is totalVideos
        totalExams,
        passedExams: passedCount,
        percentCompleted,
        completedWeeks: validCompletedWeeks,
        // expose which completed weeks have had points claimed so UI can render buttons
        completedWeeksPointsClaimed: ec.completedWeeksPointsClaimed || [],
      };
    });

    res.json({
      exams,
      courses: dashboardCourses,
      rewardPoints: user.rewardPoints || 0,
    });
  } catch (err) {
    console.error('getUserDashboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get full user details for dashboard
exports.getAdminUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('enrolledCourses.courseId', 'title weeks');
    const exams = await ExamResult.find({ user: user._id }).populate('course', 'title');
    const courseStats = user.enrolledCourses.map(ec => {
      if (!ec.courseId) return null;
      const totalWeeks = ec.courseId.weeks.length;
      const completedWeeks = ec.completedWeeks ? ec.completedWeeks.length : 0;
      const pct = totalWeeks ? Math.round((completedWeeks / totalWeeks) * 100) : 0;
      return {
        courseId: ec.courseId._id,
        title: ec.courseId.title,
        percentCompleted: pct,
        completedWeeks: ec.completedWeeks,
        progress: ec.progress,
      };
    }).filter(Boolean);
    res.json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, rewardPoints: user.rewardPoints },
      courseStats,
      exams,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Bulk create users
exports.bulkCreateUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded' });
    }
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty' });
    }
    const results = { success: [], failed: [] };
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;
      try {
        const name = row.name || row.Name || row.NAME;
        const email = row.email || row.Email || row.EMAIL;
        const password = row.password || row.Password || row.PASSWORD;
        const role = row.role || row.Role || row.ROLE;
        if (!name || !email || !password || !role) {
          results.failed.push({ row: rowNum, data: row, reason: 'Missing required fields' });
          continue;
        }
        if (!['Student', 'Trainer', 'Admin'].includes(role)) {
          results.failed.push({ row: rowNum, data: row, reason: `Invalid role: ${role}` });
          continue;
        }
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
          results.failed.push({ row: rowNum, data: row, reason: `Email already exists` });
          continue;
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password.toString(), salt);
        const newUser = await User.create({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          passwordHash,
          role,
          batch: null,
          rewardPoints: 0,
          enrolledCourses: []
        });
        results.success.push({ row: rowNum, name: newUser.name, email: newUser.email, role: newUser.role, id: newUser._id });
      } catch (error) {
        results.failed.push({ row: rowNum, data: row, reason: error.message });
      }
    }
    res.json({ message: 'Bulk upload completed', total: data.length, successCount: results.success.length, failedCount: results.failed.length, results });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ message: 'Server error during bulk upload' });
  }
};

// Create single user
exports.createSingleUser = async (req, res) => {
  try {
    // ❌ REMOVE designation and yearsOfExperience from destructuring
    const { name, email, password, role, batch, adminPasskey, employeeId } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const validRoles = ['Admin', 'Trainer', 'Student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be Student, Trainer, or Admin' });
    }

    // Admin passkey validation
    if (role === 'Admin') {
      if (!adminPasskey) {
        return res.status(403).json({ message: 'Admin passkey is required' });
      }
      if (adminPasskey !== process.env.VALUE_LOGIN_KEY) {
        return res.status(403).json({ message: 'Invalid admin passkey' });
      }
    }

    // Check for duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Check for duplicate employeeId if provided
    if (employeeId && String(employeeId).trim()) {
      const existingEmployee = await User.findOne({
        employeeId: String(employeeId).toUpperCase().trim()
      });
      if (existingEmployee) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Verify batch is valid ObjectId if provided (handle empty strings)
    let sanitizedBatch = undefined;
    if (batch && mongoose.Types.ObjectId.isValid(batch)) {
      sanitizedBatch = batch;
    }

    // ✅ Create user WITHOUT designation and yearsOfExperience
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      batch: sanitizedBatch,
      ...(employeeId && String(employeeId).trim() && {
        employeeId: String(employeeId).toUpperCase().trim()
      }),
      // ❌ REMOVED: designation and yearsOfExperience
      rewardPoints: 0,
      enrolledCourses: []
    });

    // Remove password hash from response
    const userResponse = user.toObject();
    delete userResponse.passwordHash;

    res.status(201).json(userResponse);
  } catch (err) {
    console.error('createSingleUser error:', err);

    // Handle MongoDB duplicate key errors (11000)
    if (err.code === 11000) {
      // Check which field caused the duplicate
      let dupField = 'Field';
      if (err.keyPattern) {
        // MongoDB provides keyPattern to identify the duplicate field
        if (err.keyPattern.employeeId) {
          dupField = 'Employee ID';
        } else if (err.keyPattern.email) {
          dupField = 'Email';
        }
      } else {
        // Fallback to message parsing
        dupField = err.message.includes('employeeId') ? 'Employee ID' : 'Email';
      }
      return res.status(400).json({ message: `${dupField} already exists` });
    }

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    // Handle other errors with detailed message for debugging
    console.error('Unexpected error in createSingleUser:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// Get unassigned students
exports.getUnassignedStudents = async (req, res) => {
  try {
    const students = await User.find({
      role: 'Student',
      batch: null // Changed from batchId
    }).select('-passwordHash');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Assign student to batch
exports.assignStudentToBatch = async (req, res) => {
  try {
    const { batch } = req.body;

    // Validate that the batch exists and populate course
    const batchDoc = await Batch.findById(batch).populate('course');
    if (!batchDoc) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // First update the user's batch field
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { batch },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'Student') {
      return res.status(400).json({ message: 'Only students can be assigned to batches' });
    }

    // Update batch's users array
    await Batch.findByIdAndUpdate(
      batch,
      { $addToSet: { users: user._id } }
    );

    // Auto-enroll student in batch's course if it exists
    if (batchDoc.course) {
      const courseId = batchDoc.course._id || batchDoc.course;

      // Check if student is already enrolled
      const isEnrolled = user.enrolledCourses.some(
        ec => ec.courseId && ec.courseId.toString() === courseId.toString()
      );

      if (!isEnrolled) {
        // Enroll the student in the course
        await User.findByIdAndUpdate(
          user._id,
          {
            $push: {
              enrolledCourses: {
                courseId: courseId,
                progress: 0,
                completedWeeks: [],
                completedWeeksPointsClaimed: [],
                completedDays: [],
                watchedVideos: [],
                rewatchAllowances: [],
                notes: []
              }
            }
          }
        );

        console.log(`✅ Auto-enrolled student ${user.name} (${user._id}) in course ${courseId}`);
      } else {
        console.log(`ℹ️ Student ${user.name} already enrolled in course ${courseId}`);
      }

      // Auto-assign student to all module exams for this course
      const moduleExams = await Exam.find({
        courseId: courseId,
        isInModule: true
      });

      if (moduleExams.length > 0) {
        // Add student to assignedTo.users for each module exam
        await Exam.updateMany(
          {
            courseId: courseId,
            isInModule: true,
            'assignedTo.users': { $ne: user._id } // Only if not already assigned
          },
          {
            $addToSet: { 'assignedTo.users': user._id }
          }
        );

        console.log(`✅ Auto-assigned student ${user.name} to ${moduleExams.length} module exam(s)`);
      }
    }

    // Return full response with batch details
    res.json({
      student: user,
      batch: batchDoc,
      message: batchDoc.course
        ? 'Student assigned to batch and enrolled in course successfully'
        : 'Student assigned to batch successfully'
    });
  } catch (err) {
    console.error('Error in assignStudentToBatch:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



// Admin: recompute a user's enrollment progress for a specific course
exports.recomputeEnrollmentProgress = async (req, res) => {
  try {
    const { userId, courseId } = req.params;
    if (!userId || !courseId) return res.status(400).json({ message: 'Missing params' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrollment = (user.enrolledCourses || []).find(ec => {
      if (!ec || !ec.courseId) return false;
      const ecId = ec.courseId._id ? String(ec.courseId._id) : String(ec.courseId);
      return ecId === String(courseId);
    });

    if (!enrollment) return res.status(404).json({ message: 'User not enrolled in this course' });

    // Count total days that contain a video in the course
    let totalVideoDays = 0;
    if (Array.isArray(course.weeks)) {
      for (const wk of course.weeks) {
        if (Array.isArray(wk.days)) {
          for (const d of wk.days) {
            if (d && (d.videoUrl || d.videoGridFSId)) totalVideoDays++;
          }
        }
      }
    }

    // Compute watchedCount from enrollment.completedDays when available
    let watchedCount = 0;
    const completedDays = Array.isArray(enrollment.completedDays) ? enrollment.completedDays : [];
    if (completedDays.length > 0 && Array.isArray(course.weeks)) {
      for (const cd of completedDays) {
        const wk = course.weeks.find(w => w.weekNumber === Number(cd.weekNumber));
        if (wk && Array.isArray(wk.days)) {
          const day = wk.days.find(dd => dd.dayNumber === Number(cd.dayNumber));
          if (day && (day.videoUrl || day.videoGridFSId)) watchedCount++;
        }
      }
    } else {
      watchedCount = typeof enrollment.progress === 'number' ? enrollment.progress : 0;
    }

    const completedWeeks = [];
    if (Array.isArray(course.weeks)) {
      for (const wk of course.weeks) {
        const videoDays = (Array.isArray(wk.days) ? wk.days.filter(d => d && (d.videoUrl || d.videoGridFSId)) : []);
        // Check videos
        const allVideosDone = videoDays.every(vd => completedDays.some(cd => Number(cd.weekNumber) === Number(wk.weekNumber) && Number(cd.dayNumber) === Number(vd.dayNumber)));

        // Note: We are strictly checking video completion here matching the "progress" count logic. 
        // Logic for unlocking next module might require exams, but "completedWeeks" array usually tracks Video completion blocks in this context.
        // If we want to strictly require exams for "completedWeeks" array, we would check them here.
        // For now, adhering to video-consistency.
        if (videoDays.length > 0 && allVideosDone) completedWeeks.push(Number(wk.weekNumber));
      }
    }

    // Persist results on user's enrollment entry
    enrollment.progress = watchedCount;
    enrollment.completedWeeks = completedWeeks;

    await user.save();

    // ✅ Recompute Percentage with Exams included for return value
    const courseExams = await Exam.find({ courseId: course._id, isInModule: true, published: true }).select('_id');
    const totalExams = courseExams.length;
    const passedSubmissions = await ExamSubmission.countDocuments({
      student: userId,
      exam: { $in: courseExams.map(e => e._id) },
      status: { $in: ['graded', 'evaluated'] },
      qualified: true
    });

    const totalItems = totalVideoDays + totalExams;
    const completedItems = watchedCount + passedSubmissions;

    const percent = totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0;

    res.json({ message: 'Recomputed progress', progress: watchedCount, totalVideoDays, percent, completedWeeks, totalExams, passedExams: passedSubmissions });
  } catch (err) {
    console.error('recomputeEnrollmentProgress error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


//   try {
//     const user = await User.findById(req.params.id)
//       .select('-passwordHash')
//       .populate('batch', 'name');  // Also populate batch name

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     res.json({ user });  // ← FIXED: Wrap in object with user property
//   } catch (err) {
//     console.error('Error in getUserById:', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// };
// Admin: get user by id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('batch', 'name')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user is a trainer, find batches where they are assigned as trainer
    if (user.role === 'Trainer') {
      const trainerBatches = await Batch.find({ trainer: user._id })
        .select('name')
        .lean();

      // Format batch names as comma-separated string
      if (trainerBatches && trainerBatches.length > 0) {
        user.batch = trainerBatches.map(b => b.name).join(', ');
      } else {
        user.batch = 'Not Assigned';
      }
    } else if (user.batch && user.batch.name) {
      // For students, show the batch name
      user.batch = user.batch.name;
    } else {
      user.batch = 'Not Assigned';
    }

    res.json({ user });
  } catch (err) {
    console.error('Error in getUserById:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



// Admin/self: update user


// Admin: delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get all trainers
exports.getAllTrainers = async (req, res) => {
  try {
    const trainers = await User.find({ role: 'Trainer' }).select('-passwordHash');
    res.json(trainers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'Student' }).select('-passwordHash');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get full user details for dashboard
exports.getAdminUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('enrolledCourses.courseId', 'title weeks');
    const exams = await ExamResult.find({ user: user._id }).populate('course', 'title');
    const courseStats = user.enrolledCourses.map(ec => {
      if (!ec.courseId) return null;

      // Get actual module numbers that exist in the course
      const actualWeekNumbers = new Set(
        (ec.courseId.weeks || []).map(w => Number(w.weekNumber))
      );

      // Filter completedWeeks to only include modules that actually exist
      const validCompletedWeeks = (ec.completedWeeks || []).filter(
        wk => actualWeekNumbers.has(Number(wk))
      );

      const totalWeeks = ec.courseId.weeks.length;
      const completedWeeks = validCompletedWeeks.length;
      const pct = totalWeeks ? Math.round((completedWeeks / totalWeeks) * 100) : 0;
      return {
        courseId: ec.courseId._id,
        title: ec.courseId.title,
        percentCompleted: pct,
        completedWeeks: validCompletedWeeks,
        progress: ec.progress,
      };
    }).filter(Boolean);
    res.json({
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, rewardPoints: user.rewardPoints },
      courseStats,
      exams,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Bulk create users
exports.bulkCreateUsers = async (req, res) => {
  try {
    console.log('Bulk upload request received');
    console.log('File info:', req.file ? { name: req.file.originalname, size: req.file.size } : 'No file');

    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded' });
    }

    // ✅ Read the Excel file properly
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // ✅ Check if workbook has sheets
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ message: 'Excel file has no sheets' });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // ✅ Check if worksheet exists
    if (!worksheet) {
      return res.status(400).json({ message: 'Failed to read worksheet' });
    }

    // ✅ Convert to JSON with proper options
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false, // Keep values as strings
      defval: '' // Default value for empty cells
    });

    console.log('Parsed rows:', data.length);
    console.log('Sample data:', data[0]);

    if (!data || data.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or has no valid data' });
    }

    const results = { success: [], failed: [] };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel rows start at 2 (1 is header)

      try {
        // ✅ Extract fields (case-insensitive) - PASSWORD IGNORED
        const name = row.name || row.Name || row.NAME;
        const email = row.email || row.Email || row.EMAIL;
        // Password column ignored if present
        const employeeId = row.employeeId || row.EmployeeId || row.EMPLOYEEID || row.employee_id || row['Employee ID'];

        console.log(`Row ${rowNum}:`, { name, email, employeeId: employeeId || 'N/A' });

        // Validate required fields
        if (!name || !email) {
          results.failed.push({
            row: rowNum,
            data: { name, email, employeeId },
            reason: 'Missing required fields (name, email)'
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          results.failed.push({
            row: rowNum,
            data: { name, email, employeeId },
            reason: `Invalid email format: ${email}`
          });
          continue;
        }

        // Check duplicate email
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
          results.failed.push({
            row: rowNum,
            data: { name, email, employeeId },
            reason: `Email already exists: ${email}`
          });
          continue;
        }

        // Check duplicate employeeId if provided
        if (employeeId && String(employeeId).trim()) {
          const existingEmployee = await User.findOne({
            employeeId: String(employeeId).toUpperCase().trim()
          });
          if (existingEmployee) {
            results.failed.push({
              row: rowNum,
              data: { name, email, employeeId },
              reason: `Employee ID already exists: ${employeeId}`
            });
            continue;
          }
        }

        // Hash password
        // No Password Hashing needed for MSAL users

        // Create user object
        // Create user object
        const createData = {
          name: String(name).trim(),
          email: String(email).toLowerCase().trim(),
          passwordHash: 'MSAL_AUTH_REQUIRED_NO_PASSWORD',
          role: 'Student', // Force Student role
          authType: 'MSAL', // Force MSAL auth
          batch: null,
          rewardPoints: 0,
          enrolledCourses: [],
        };

        // Add employeeId only if provided and not empty
        if (employeeId && String(employeeId).trim()) {
          createData.employeeId = String(employeeId).toUpperCase().trim();
        }

        const newUser = await User.create(createData);

        console.log(`✅ Created user: ${newUser.email}`);

        results.success.push({
          row: rowNum,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          employeeId: newUser.employeeId || 'Not provided',
          id: newUser._id
        });

      } catch (error) {
        console.error(`❌ Error processing row ${rowNum}:`, error.message);
        results.failed.push({
          row: rowNum,
          data: row,
          reason: error.message
        });
      }
    }

    console.log('✅ Bulk upload completed');
    console.log('Success:', results.success.length);
    console.log('Failed:', results.failed.length);

    res.json({
      message: 'Bulk student upload completed',
      total: data.length,
      successCount: results.success.length,
      failedCount: results.failed.length,
      results
    });

  } catch (err) {
    console.error('❌ Bulk upload error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({
      message: 'Server error during bulk upload',
      error: err.message,
      details: 'Check server console for more information'
    });
  }
};




// Create single user
exports.createSingleUser = async (req, res) => {
  try {
    // Destructure all fields including password and employeeId
    const { name, email, role, batch, adminPasskey, employeeId, designation, yearsOfExperience, password } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const validRoles = ['Student', 'Trainer', 'Admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be Student, Trainer, or Admin' });
    }

    // ✅ Admin Passkey Validation
    if (role === 'Admin') {
      if (!adminPasskey) {
        return res.status(403).json({ message: 'Admin passkey is required' });
      }
      if (adminPasskey !== process.env.VALUE_LOGIN_KEY) {
        return res.status(403).json({ message: 'Invalid admin passkey' });
      }
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password if provided, otherwise default to MSAL
    let passwordHash = 'MSAL_AUTH_REQUIRED_NO_PASSWORD';
    let authType = 'MSAL';

    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
      authType = 'Local';
    }

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      authType,
      role,
      batch,
      ...(employeeId && { employeeId }),
      ...(designation && { designation }),
      ...(yearsOfExperience && { yearsOfExperience }),
      rewardPoints: 0,
      enrolledCourses: []
    });

    // Return successful response
    res.status(201).json(user);
  } catch (err) {
    console.error('createSingleUser error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// Get unassigned students
exports.getUnassignedStudents = async (req, res) => {
  try {
    const students = await User.find({
      role: 'Student',
      batch: null // Changed from batchId
    }).select('-passwordHash');
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getLeaderboard = async (req, res) => {
  console.log("🏆 getLeaderboard called");
  try {
    console.log("Querying users...");
    const users = await User.find()
      .select("name email role employeeId rewardPoints")
      .sort({ rewardPoints: -1 });

    console.log(`✅ Found ${users.length} users for leaderboard`);
    res.json({ success: true, users });
  } catch (err) {
    console.error("❌ Leaderboard error details:", err);
    res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
};




// Block user
exports.blockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: true }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User blocked successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Unblock user
exports.unblockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked: false }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User unblocked successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
