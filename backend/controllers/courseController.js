const Course = require("../models/Course");
const Batch = require("../models/Batch");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const Exam = require('../models/Exam');
const ExamSubmission = require('../models/ExamSubmission');
const mongoose = require("mongoose");
const { notifyBatchStudentsCourseAssigned, notifyTrainerCourseAssigned } = require("../utils/notificationHelper");
const RewatchRequest = require("../models/RewatchRequest");

exports.updateCourseDuration = async (req, res) => {
  try {
    const { durationWeeks } = req.body;

    if (!durationWeeks || durationWeeks <= 0) {
      return res.status(400).json({ message: "Invalid durationWeeks" });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { durationWeeks },
      { new: true }
    );

    if (!updatedCourse) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json({
      message: "Course duration updated successfully",
      course: updatedCourse
    });
  } catch (err) {
    console.error("Error updating course duration:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Add a new module to course
exports.addModule = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Validate role
    if (!["Admin", "Trainer", "Master"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only Admins, Masters and Trainers can add modules" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Calculate next module number
    const nextModuleNumber = (course.weeks?.length || 0) + 1;

    // Create new module
    const newModule = {
      weekNumber: nextModuleNumber,
      title: `Module ${nextModuleNumber}`,
      days: [],
      lastEditedBy: req.user.id,
      lastEditedAt: new Date()
    };

    // Add module to course
    course.weeks.push(newModule);
    await course.save();

    res.status(201).json({
      message: "Module added successfully",
      module: newModule
    });

  } catch (error) {
    console.error("Error adding module:", error);
    res.status(500).json({ message: "Failed to add module" });
  }
};

// Update a topic (day) in a module
exports.updateTopicInModule = async (req, res) => {
  try {
    const { id: courseId, weekNumber, dayNumber } = req.params;
    const { title, newDayNumber } = req.body;

    // Validate role
    if (!["Admin", "Trainer", "Master"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only Admins, Masters and Trainers can update topics" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const week = course.weeks.find(w => w.weekNumber === parseInt(weekNumber));
    if (!week) {
      return res.status(404).json({ message: "Module not found" });
    }

    const dayIndex = week.days.findIndex(d => d.dayNumber === parseInt(dayNumber));
    if (dayIndex === -1) {
      return res.status(404).json({ message: "Topic not found" });
    }

    // Update the topic
    if (title) {
      week.days[dayIndex].title = title.trim();
      // When title is updated, also update customName if it's not set
      if (!week.days[dayIndex].customName) {
        week.days[dayIndex].customName = title.trim();
      }
    }
    if (newDayNumber) {
      week.days[dayIndex].dayNumber = parseInt(newDayNumber);
      // Sort days by dayNumber
      week.days.sort((a, b) => a.dayNumber - b.dayNumber);
    }

    week.lastEditedBy = req.user.id;
    week.lastEditedAt = new Date();

    await course.save();

    res.json({
      message: "Topic updated successfully",
      week
    });

  } catch (error) {
    console.error("Error updating topic:", error);
    res.status(500).json({ message: "Failed to update topic" });
  }
};

// Create a new course (Admin)
exports.createCourse = async (req, res) => {
  try {
    const { title, description, weeks } = req.body;
    // weeks may be sent as a JSON string from multipart/form-data
    let parsedWeeks = weeks;
    if (typeof weeks === 'string') {
      try {
        parsedWeeks = JSON.parse(weeks);
      } catch (e) {
        // If parsing fails, leave as-is (mongoose validation will catch it)
        parsedWeeks = weeks;
      }
    }

    let courseData = {
      title,
      description,
      weeks: parsedWeeks,
      createdBy: req.user.id,
    };

    // Handle course image if uploaded
    if (req.file) {
      // multer memoryStorage does not populate `filename` - write buffer to uploads folder
      try {
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'courses');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, req.file.buffer);

        courseData.imageUrl = `courses/${filename}`;
        courseData.imageName = req.file.originalname;
        courseData.imageContentType = req.file.mimetype;
      } catch (fileErr) {
        console.error('Failed to save uploaded course image:', fileErr);
        // Continue without image
      }
    }

    const course = await Course.create(courseData);
    res.status(201).json(course);
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ message: "Server error" });
  }
};

// Edit a course (Admin)
exports.editCourse = async (req, res) => {
  try {
    const courseData = { ...req.body };

    // Handle course image if uploaded
    if (req.file) {
      // Delete old image if it exists
      const existingCourse = await Course.findById(req.params.id);
      if (existingCourse?.imageUrl) {
        const oldImagePath = path.join(__dirname, '../uploads/', existingCourse.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Set new image data
      courseData.imageUrl = `courses/${req.file.filename}`;
      courseData.imageName = req.file.originalname;
      courseData.imageContentType = req.file.mimetype;
    }

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      courseData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (err) {
    console.error('Edit course error:', err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Update Course Stay Duration
exports.updateCourseStayDuration = async (req, res) => {
  try {
    if (!['Admin', 'Master'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admins can update course stay duration' });
    }

    const { courseStayEnabled, courseStayDurationWeeks, courseStayDurationDays } = req.body;

    const course = await Course.findByIdAndUpdate(
      req.params.id,
      {
        courseStayEnabled: courseStayEnabled || false,
        courseStayDurationWeeks: Number(courseStayDurationWeeks) || 0,
        courseStayDurationDays: Number(courseStayDurationDays) || 0
      },
      { new: true, runValidators: true }
    );

    if (!course) return res.status(404).json({ message: 'Course not found' });

    res.json({ message: 'Course stay duration updated', course });
  } catch (err) {
    console.error('updateCourseStayDuration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a course (Admin)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Delete course image if it exists
    if (course.imageUrl) {
      const imagePath = path.join(__dirname, '../uploads/', course.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await course.remove();
    res.json({ message: "Course deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Upload course image
exports.uploadCourseImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Delete old image if it exists
    if (course.imageUrl) {
      const oldImagePath = path.join(__dirname, '../uploads/courses', course.imageUrl);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Save new image
    const filename = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const imagePath = path.join(__dirname, '../uploads/courses', filename);

    fs.writeFileSync(imagePath, req.file.buffer);

    // Update course with new image info
    course.imageUrl = `courses/${filename}`;
    course.imageName = req.file.originalname;
    course.imageContentType = req.file.mimetype;
    await course.save();

    res.json({
      message: 'Course image uploaded successfully',
      imageUrl: course.imageUrl
    });
  } catch (err) {
    console.error('Upload course image error:', err);
    res.status(500).json({ message: 'Error uploading course image' });
  }
};

// Get course image
exports.getCourseImage = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course || !course.imageUrl) {
      return res.status(404).sendFile(path.join(__dirname, '../public/default-course.jpg'));
    }

    const imagePath = path.join(__dirname, '../uploads/', course.imageUrl);
    if (!fs.existsSync(imagePath)) {
      return res.status(404).sendFile(path.join(__dirname, '../public/default-course.jpg'));
    }

    res.setHeader('Content-Type', course.imageContentType || 'image/jpeg');
    res.sendFile(imagePath);
  } catch (err) {
    console.error('Get course image error:', err);
    res.status(500).sendFile(path.join(__dirname, '../public/default-course.jpg'));
  }
};

// List all courses (Admin / Trainer / Student)
exports.listCourses = async (req, res) => {
  try {
    let query = {};
    let student = null; // Store student data for reuse

    if (req.user.role === "Trainer") {
      query = {
        $or: [{ assignedTrainers: req.user.id }, { createdBy: req.user.id }],
      };
    } else if (req.user.role === "Student") {
      // Return all courses the student is enrolled in (preserve previous courses)
      student = await User.findById(req.user.id).select('enrolledCourses');
      if (!student) return res.status(404).json({ message: 'Student not found' });

      // Helper function to extract course ID from enrollment
      const getCourseIdFromEnrollment = (ec) => {
        if (!ec || !ec.courseId) return null;
        // If it's an ObjectId, convert to string
        if (ec.courseId.toString) return ec.courseId.toString();
        // If it's already a string or has _id
        if (ec.courseId._id) return String(ec.courseId._id);
        return String(ec.courseId);
      };

      const enrolledCourseIds = (student.enrolledCourses || [])
        .map(ec => getCourseIdFromEnrollment(ec))
        .filter(Boolean);

      console.log(`[listCourses] Student enrolled in ${enrolledCourseIds.length} courses:`, enrolledCourseIds);

      if (enrolledCourseIds.length === 0) {
        // Fallback: if not enrolled anywhere, show the batch course if available
        const studentWithBatch = await User.findById(req.user.id).populate('batch').select('batch');
        if (studentWithBatch && studentWithBatch.batch) {
          const batch = await Batch.findById(studentWithBatch.batch._id).populate('course');

          // Check for batch expiry (use endDate if present)
          if (batch) {
            const expiry = batch.courseAccessExpiry || batch.endDate;
            if (expiry && new Date() > new Date(expiry)) {
              console.log(`[listCourses] Student batch course access is EXPIRED (batch: ${batch._id}). Hiding courses.`);
              query = { _id: { $in: [] } };
            } else if (batch.course) {
              query = { _id: batch.course._id };
              console.log(`[listCourses] Student has batch course:`, batch.course._id);
            } else {
              // No batch course - return empty (student not assigned to any course)
              query = { _id: { $in: [] } };
              console.log(`[listCourses] No batch course, showing no courses`);
            }
          } else {
            // Batch object not found - treat as no batch course
            query = { _id: { $in: [] } };
            console.log(`[listCourses] No batch course, showing no courses`);
          }
        } else {
          // No batch - return empty (student not in a batch, so no courses)
          query = { _id: { $in: [] } };
          console.log(`[listCourses] No batch, showing no courses`);
        }
      } else {
        // Convert string IDs to ObjectIds for MongoDB query
        const mongoose = require('mongoose');
        const objectIdCourseIds = enrolledCourseIds
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id));
        query = { _id: { $in: objectIdCourseIds } };
        console.log(`[listCourses] Querying ${objectIdCourseIds.length} enrolled courses`);
      }
    } else {
      // Admin/Master: show all courses
      query = {};
      console.log(`[listCourses] Admin/Master - showing all courses`);
    }

    // ✅ FIXED: Don't filter fields, return ALL courses with image data
    let courses = await Course.find(query).lean();

    console.log(`[listCourses] Found ${courses.length} courses with query`);

    // ✅ ADD THIS: Ensure imageUrl is set for courses with imageGridFSId
    courses = courses.map(course => {
      if (course.imageGridFSId && !course.imageUrl) {
        course.imageUrl = `/api/courses/${course._id}/image`;
      }
      return course;
    });

    // ✅ ADD PROGRESS DATA FOR STUDENTS (reuse student data fetched above)
    if (req.user.role === "Student" && student && student.enrolledCourses) {
      // Create a map of courseId -> enrollment data for quick lookup
      const enrollmentMap = new Map();
      student.enrolledCourses.forEach(ec => {
        if (ec.courseId) {
          // Handle both ObjectId and string formats
          const courseIdStr = ec.courseId.toString ? ec.courseId.toString() : String(ec.courseId);
          enrollmentMap.set(courseIdStr, ec);
        }
      });

      // Enrich courses with progress data
      courses = courses.map(course => {
        const courseIdStr = course._id.toString ? course._id.toString() : String(course._id);
        const enrollment = enrollmentMap.get(courseIdStr);
        if (enrollment) {
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
          const percentCompleted = totalModules > 0 ? Math.min(100, Math.round((watchedCount / totalModules) * 100)) : 0;

          return {
            ...course,
            completion: percentCompleted,
            watchedCount,
            totalModules,
            completedWeeks: enrollment.completedWeeks || []
          };
        }
        return course;
      });
    }

    res.json(courses);
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
};


// Get single course details
exports.getCourseById = async (req, res) => {
  try {
    let studentProgress = null;
    let studentEnrollment = null;

    if (req.user.role === "Student") {
      // Fetch fresh student data to ensure we have the latest progress
      // Don't use lean() here - we need the full document to access enrollment progress
      const student = await User.findById(req.user.id).populate("batch").populate('enrolledCourses.courseId', 'title weeks');

      // Helper function to get course ID from enrollment (handles both ObjectId and populated object)
      const getCourseIdFromEnrollment = (ec) => {
        if (!ec || !ec.courseId) return null;
        // If populated, it's an object with _id
        if (ec.courseId._id) return String(ec.courseId._id);
        // Otherwise it's an ObjectId
        return String(ec.courseId);
      };

      // Allow access if student has the course in their enrolledCourses (preserve previous enrollments)
      const enrolledCourseIds = (student.enrolledCourses || [])
        .map(ec => getCourseIdFromEnrollment(ec))
        .filter(Boolean);

      if (enrolledCourseIds.includes(String(req.params.id))) {
        // student is enrolled in this course — allow access
        studentEnrollment = student.enrolledCourses.find(ec => {
          const ecId = getCourseIdFromEnrollment(ec);
          return ecId === String(req.params.id);
        });
        // Progress is stored directly on the enrollment object, not on the populated courseId
        studentProgress = typeof studentEnrollment?.progress === 'number' ? studentEnrollment.progress : 0;
        console.log(`[getCourseById] Student progress for course ${req.params.id}: ${studentProgress}, enrollment:`, studentEnrollment ? 'found' : 'not found');
      } else {
        // Fallback: allow access if student's assigned batch references this course
        let batch = null;
        if (student.batch) {
          if (student.batch._id) {
            batch = await Batch.findById(student.batch._id).populate("course");
          } else {
            batch = await Batch.findById(student.batch).populate("course");
          }
        }

        if (!batch || !batch.course) {
          return res.status(403).json({ message: "You do not have access to this course" });
        }

        // Check batch expiry (consider per-batch course access expiry if set)
        const expiry = batch.courseAccessExpiry || batch.endDate;
        if (expiry && new Date() > new Date(expiry)) {
          return res.status(403).json({ message: "Course access expired for your batch. Please contact your administrator." });
        }

        const batchCourseId = batch.course._id ? String(batch.course._id) : String(batch.course);
        if (batchCourseId !== String(req.params.id)) {
          return res.status(403).json({ message: "You do not have access to this course" });
        }

        // Set progress to 0 if accessing through batch (no enrollment record)
        studentProgress = 0;
      }
    }

    let course = await Course.findById(req.params.id)
      .populate("assignedTrainers", "name email")
      .lean();

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Fetch all exams for this course to accurately determine 'hasExam' status for weeks
    const courseExams = await Exam.find({ courseId: req.params.id }).select('weekNumber _id').lean();
    const weeksWithExams = new Set(courseExams.map(e => Number(e.weekNumber)));

    // Ensure weeks is an array
    if (!Array.isArray(course.weeks)) {
      course.weeks = [];
    }

    // ✅ ADD THIS: Ensure imageUrl is set
    if (course.imageGridFSId && !course.imageUrl) {
      course.imageUrl = `/api/courses/${course._id}/image`;
    }

    // ✅ SEQUENTIAL UNLOCKING: Add locked status for each day/week for students
    if (req.user.role === "Student" && studentProgress !== null && Array.isArray(course.weeks) && course.weeks.length > 0) {
      try {
        // Store original weeks array before mapping to avoid mutation issues
        const originalWeeks = JSON.parse(JSON.stringify(course.weeks));

        // Get completedWeeks and completedDays from enrollment for fallback check
        let completedWeeks = studentEnrollment?.completedWeeks || [];

        // Filter completedWeeks to only include modules that actually exist in the course
        const actualWeekNumbers = new Set(course.weeks.map(w => Number(w.weekNumber)));
        completedWeeks = completedWeeks.filter(wk => actualWeekNumbers.has(Number(wk)));

        const completedWeeksSet = new Set(Array.isArray(completedWeeks) ? completedWeeks.map(n => Number(n)) : []);
        const completedDays = Array.isArray(studentEnrollment?.completedDays) ? studentEnrollment.completedDays : [];
        const isDayMarkedCompleted = (wNum, dNum) => completedDays.some(cd => Number(cd.weekNumber) === Number(wNum) && Number(cd.dayNumber) === Number(dNum));



        // Fetch user's submissions for these exams to verify actual completion (ignoring legacy 'completedWeeks' flags)
        const examIds = courseExams.map(e => e._id);
        const userSubmissions = await ExamSubmission.find({
          student: req.user.id,
          exam: { $in: examIds },
          status: { $in: ['submitted', 'graded', 'evaluated'] }
        }).select('exam').lean();

        const submittedExamIds = new Set(userSubmissions.map(s => String(s.exam)));

        console.log(`[getCourseById] Unlocking logic - studentProgress: ${studentProgress}, weeks count: ${course.weeks.length}, completedWeeks:`, completedWeeks);

        // Work with original array (already plain object from .lean())
        course.weeks = course.weeks.map((week, weekIdx) => {
          if (!week.days) week.days = [];
          if (!Array.isArray(week.days)) week.days = [];

          const weekNumber = week.weekNumber || (weekIdx + 1);
          let weekLocked = false;
          let videosBeforeThisWeek = 0;

          // Count all videos in previous weeks (use originalWeeks for reference to avoid mutation)
          for (let w = 1; w < weekNumber; w++) {
            const prevWeek = originalWeeks.find((wk, idx) => {
              const wkNum = wk.weekNumber || (idx + 1);
              return wkNum === w;
            });
            if (prevWeek && Array.isArray(prevWeek.days)) {
              const prevWeekVideos = prevWeek.days.filter(d => d && (d.videoUrl || d.videoGridFSId));
              videosBeforeThisWeek += prevWeekVideos.length;
            }
          }

          // Check if previous week is completed (for week > 1)
          if (weekNumber > 1) {
            // videosBeforeThisWeek already contains count of all videos in weeks 1 to (weekNumber - 1)
            // To unlock this week, student must have watched ALL videos in all previous weeks
            // So required progress = videosBeforeThisWeek
            // Example: If Module 1 has 5 videos, videosBeforeThisWeek = 5
            //          Student must have progress >= 5 to unlock Module 2

            // SIMPLIFIED LOGIC: Module unlocks if student has watched ALL videos in previous module
            // Priority: If previous module is in completedWeeks, ALWAYS unlock
            // Otherwise, check if progress is sufficient
            const prevWeekNumber = weekNumber - 1;
            const prevWeekCompleted = Array.isArray(completedWeeks) && completedWeeks.includes(prevWeekNumber);
            const hasEnoughProgress = studentProgress >= videosBeforeThisWeek;

            // Module unlocks if EITHER condition is true:
            // 1. Previous module is marked as completed (HIGHEST PRIORITY) - now includes Exam completion
            // 2. Student has watched enough videos (progress >= videos in previous module) - ONLY if no Exam

            let shouldUnlock = false;

            // Fix: Fetch previous week object explicitly relative to current week
            const prevWeekObj = originalWeeks.find((wk, idx) => {
              const wkNum = wk.weekNumber || (idx + 1);
              return wkNum === prevWeekNumber;
            });

            // Use real exam data + schema flag
            const prevWeekHasExam = weeksWithExams.has(prevWeekNumber) || (prevWeekObj && prevWeekObj.hasExam);

            if (prevWeekHasExam) {
              // STRICT LOCKING: If previous week has exam, MUST check actual Exam Submissions
              // We ignore 'prevWeekCompleted' from enrollment because it might be tainted by old video-only logic

              // Find exams for the previous week
              const examsForPrevWeek = courseExams.filter(e => Number(e.weekNumber) === prevWeekNumber);

              // Check if ALL exams for that week are submitted
              const allExamsSubmitted = examsForPrevWeek.every(e => submittedExamIds.has(String(e._id)));

              shouldUnlock = allExamsSubmitted;
              console.log(`[getCourseById] Week ${weekNumber} strict lock check: Prev week ${prevWeekNumber} has ${examsForPrevWeek.length} exams. All submitted? ${allExamsSubmitted}`);
            } else {
              // Standard video progression
              shouldUnlock = prevWeekCompleted || hasEnoughProgress;
            }

            console.log(`[getCourseById] Week ${weekNumber} unlock check:`);
            console.log(`  - videosBeforeThisWeek (videos in weeks before week ${weekNumber}): ${videosBeforeThisWeek}`);
            console.log(`  - studentProgress: ${studentProgress}`);
            console.log(`  - completedWeeks array:`, JSON.stringify(completedWeeks));
            console.log(`  - Checking if week ${prevWeekNumber} is in completedWeeks: ${prevWeekCompleted}`);
            console.log(`  - hasEnoughProgress (${studentProgress} >= ${videosBeforeThisWeek}): ${hasEnoughProgress}`);
            console.log(`  - shouldUnlock: ${shouldUnlock}`);

            if (!shouldUnlock) {
              weekLocked = true;
              console.log(`[getCourseById] ❌ Week ${weekNumber} is LOCKED - student needs ${videosBeforeThisWeek} videos, has ${studentProgress}`);
            } else {
              weekLocked = false;
              console.log(`[getCourseById] ✅ Week ${weekNumber} is UNLOCKED`);
            }
          } else {
            // Week 1 is always unlocked (no previous weeks)
            weekLocked = false;
          }

          // Use original week's days array to count videos correctly
          const originalWeek = originalWeeks.find((w, idx) => {
            const wkNum = w.weekNumber || (idx + 1);
            return wkNum === weekNumber;
          });
          const originalWeekDays = (originalWeek && Array.isArray(originalWeek.days)) ? originalWeek.days : [];

          week.days = week.days.map((day, dayIdx) => {
            if (!day) return null;
            const dayNumber = day.dayNumber || (dayIdx + 1);
            let dayLocked = weekLocked;

            // Count videos in current week before this day (use original week's days)
            let videosBeforeThisDay = videosBeforeThisWeek;
            const currentWeekDays = originalWeekDays.filter(d => d && d.dayNumber < dayNumber && (d.videoUrl || d.videoGridFSId));
            videosBeforeThisDay += currentWeekDays.length;

            // Check if previous days in current week are completed
            if (!dayLocked) {
              // Student must have watched all videos before this day
              if (studentProgress < videosBeforeThisDay) {
                dayLocked = true;
              }
            }

            // ⭐ CRITICAL FIX: Check if THIS SPECIFIC DAY was actually completed
            // ⭐ CRITICAL FIX: Check if THIS SPECIFIC DAY was actually completed
            // Don't just rely on progress count - check the completedDays array
            const dayIsCompleted = isDayMarkedCompleted(weekNumber, dayNumber);

            return {
              ...day,
              isLocked: dayLocked,
              hasVideo: !!(day.videoUrl || day.videoGridFSId),
              isCompleted: dayIsCompleted
            };
          }).filter(d => d !== null);

          // ⭐ CRITICAL FIX: Robust week completion check
          const videosInWeek = week.days.filter(d => d && d.hasVideo);
          const allVideosWatched = videosInWeek.length > 0 && videosInWeek.every(d => d.isCompleted);

          // ⭐ NEW: Check if module has exams (will be populated later, so we check the week object)
          // For now, we'll set a placeholder and update it after exams are fetched
          const isWeekCompleted = completedWeeksSet.has(Number(weekNumber)) || allVideosWatched;

          return {
            ...week,
            isLocked: weekLocked,
            isCompleted: isWeekCompleted, // Will be updated based on exam completion later
            pointsClaimed: Array.isArray(studentEnrollment?.completedWeeksPointsClaimed)
              ? studentEnrollment.completedWeeksPointsClaimed.map(n => Number(n)).includes(Number(weekNumber))
              : false
          };
        });
      } catch (unlockError) {
        console.error("Error in sequential unlocking logic:", unlockError);
      }
    }

    // ⭐ Fetch exams for this course and attach to weeks
    try {
      const Exam = require('../models/Exam');
      const ExamSubmission = require('../models/ExamSubmission');

      const exams = await Exam.find({
        courseId: req.params.id,
        isInModule: true
      }).select('_id title weekNumber duration published type totalMarks');



      // Group exams by weekNumber
      const examsByWeek = {};
      exams.forEach(exam => {
        const wn = Number(exam.weekNumber);
        if (!examsByWeek[wn]) examsByWeek[wn] = [];
        examsByWeek[wn].push({
          _id: exam._id,
          title: exam.title,
          duration: exam.duration,
          published: exam.published,
          type: exam.type,
          totalMarks: exam.totalMarks
        });
      });

      // ⭐ If user is a student, fetch their exam submissions to check completion
      let examSubmissionsByExamId = {};
      if (req.user && req.user.role === 'Student') {
        const examIds = exams.map(e => e._id);
        const submissions = await ExamSubmission.find({
          student: req.user.id,
          exam: { $in: examIds }
        }).select('exam status');

        submissions.forEach(sub => {
          examSubmissionsByExamId[sub.exam.toString()] = sub.status;
        });
      }

      // Attach exams to each week AND update completion status
      course.weeks = course.weeks.map(week => {
        const weekExams = examsByWeek[Number(week.weekNumber)] || [];
        const publishedExams = weekExams.filter(e => e.published);

        // ⭐ Add completion status to each exam for visual indicator
        const examsWithStatus = weekExams.map(exam => {
          let isCompleted = false;
          let status = 'not_started'; // default status

          if (req.user && req.user.role === 'Student') {
            const submissionStatus = examSubmissionsByExamId[exam._id.toString()];
            if (submissionStatus) {
              status = submissionStatus; // submitted, graded, in_progress, etc.
              isCompleted = submissionStatus === 'graded'; // Completed if graded
            }
          }

          return {
            ...exam,
            isCompleted,
            status // ⭐ Add status for UI button logic (Start/Continue/View)
          };
        });

        // ⭐ Check if all published exams in this module are completed
        let allExamsCompleted = true;
        if (publishedExams.length > 0 && req.user && req.user.role === 'Student') {
          // Check if each published exam has a graded submission
          allExamsCompleted = publishedExams.every(exam => {
            const status = examSubmissionsByExamId[exam._id.toString()];
            return status === 'graded'; // Must be graded/completed
          });
        }

        // ⭐ Update isCompleted: videos watched AND (no exams OR all exams completed)
        const hasPublishedExams = publishedExams.length > 0;
        let updatedIsCompleted = week.isCompleted;

        if (req.user && req.user.role === 'Student' && hasPublishedExams) {
          // If module has published exams, require both videos AND exams to be complete
          updatedIsCompleted = week.isCompleted && allExamsCompleted;
        }

        return {
          ...week,
          exams: examsWithStatus, // Send exams with completion status
          hasExam: weekExams.length > 0,
          isCompleted: updatedIsCompleted // Updated based on exam completion
        };
      });


    } catch (examError) {
      console.error('Error fetching exams for course:', examError);
      // Continue without exams if fetch fails
    }

    // ⭐ NEW: Add disclaimer status to response
    let disclaimerAcknowledged = false;
    if (req.user && req.user.role === "Student" && studentEnrollment) {
      disclaimerAcknowledged = !!studentEnrollment.disclaimerAcknowledged;
    }

    res.json({
      ...course,
      disclaimerAcknowledged // Include this in the response
    });
  } catch (err) {
    console.error("Error fetching course:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: courses overview with batch & student counts and details
exports.adminCourseOverview = async (req, res) => {
  try {
    // Only admins or master
    if (!req.user || !['Admin', 'Master'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const courses = await Course.find().lean();

    const results = [];

    for (const course of courses) {
      const courseId = course._id;

      // Find batches that reference this course
      const batches = await Batch.find({ course: courseId }).select('_id name users').populate('users', 'name');

      // All users who have this course in their enrolledCourses
      const enrolledUsers = await User.find({ 'enrolledCourses.courseId': courseId }).select('_id name batch').lean();
      const studentCount = enrolledUsers.length;

      // Create a lookup for enrolled users by id
      const enrolledMap = new Map(enrolledUsers.map(u => [String(u._id), u]));

      // For each batch, list only students who are enrolled in this course (and are in the batch)
      const batchesWithStudents = batches.map((b) => {
        const students = (b.users || []).filter(u => enrolledMap.has(String(u._id))).map(u => ({ _id: u._id, name: u.name }));
        return { _id: b._id, name: b.name, students };
      });

      // Students who are enrolled in the course but not part of any batch for this course
      const batchIds = new Set(batches.map(b => String(b._id)));
      const otherEnrolled = enrolledUsers.filter(u => !u.batch || !batchIds.has(String(u.batch))).map(u => ({ _id: u._id, name: u.name, batch: u.batch }));

      results.push({
        _id: courseId,
        title: course.title,
        batches: batchesWithStudents,
        batchCount: batches.length,
        studentCount,
        enrolledUsers: enrolledUsers.map(u => ({ _id: u._id, name: u.name, batch: u.batch })),
        otherEnrolled,
      });
    }

    res.json(results);
  } catch (err) {
    console.error('adminCourseOverview error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: unenroll a specific user from a course
exports.unenrollUserFromCourse = async (req, res) => {
  try {
    if (!req.user || !['Admin', 'Master'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const courseId = req.params.id;
    const userId = req.params.userId;

    // Pull the enrolledCourses entry for this course from the user
    const result = await User.updateOne(
      { _id: userId },
      { $pull: { enrolledCourses: { courseId: courseId } } }
    );

    if (result.nModified === 0 && result.modifiedCount === 0) {
      // Nothing removed
      return res.status(404).json({ message: 'Enrollment not found for this user and course' });
    }

    res.json({ message: 'User unenrolled from course' });
  } catch (err) {
    console.error('unenrollUserFromCourse error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: get all users enrolled in a specific course
exports.getEnrolledUsersForCourse = async (req, res) => {
  try {
    if (!req.user || !['Admin', 'Master'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const courseId = req.params.id;

    const users = await User.find({ 'enrolledCourses.courseId': courseId }).select('name batch');

    res.json(users.map(u => ({ _id: u._id, name: u.name, batch: u.batch })));
  } catch (err) {
    console.error('getEnrolledUsersForCourse error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// Assign trainer to course
exports.assignTrainerToCourse = async (req, res) => {
  try {
    const { trainerId } = req.body;
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { assignedTrainers: trainerId } },
      { new: true }
    ).populate("assignedTrainers", "name email");
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Send notification to the trainer
    await notifyTrainerCourseAssigned(trainerId, course.title);
    console.log(`📢 Sent course assignment notification to trainer`);

    res.json(course);
  } catch (err) {
    console.error('assignTrainerToCourse error:', err);
    res.status(500).json({ message: "Server error" });
  }
};

// Assign batch to course
// Assign batch to course (Updated)
exports.assignBatchToCourse = async (req, res) => {
  try {
    const { batchId } = req.body;

    const batch = await Batch.findById(batchId).populate("users trainer");
    if (!batch) return res.status(404).json({ message: "Batch not found" });

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Add batch to course
    if (!course.assignedBatches.includes(batch._id)) {
      course.assignedBatches.push(batch._id);
    }

    // Add batch trainer to course assignedTrainers
    if (batch.trainer && !course.assignedTrainers.includes(batch.trainer._id)) {
      course.assignedTrainers.push(batch.trainer._id);
    }

    await course.save();

    // Enroll all users in batch to this course
    const studentIds = [];
    for (const userId of batch.users) {
      const user = await User.findById(userId);
      if (!user.enrolledCourses.some(ec => ec.courseId.toString() === course._id.toString())) {
        user.enrolledCourses.push({ courseId: course._id });
        await user.save();
        studentIds.push(userId);
      }
    }

    // Send notifications to all students in the batch about course assignment
    if (studentIds.length > 0) {
      await notifyBatchStudentsCourseAssigned(studentIds, course.title, batch.name);
      console.log(`📢 Sent course assignment notifications to ${studentIds.length} students in batch "${batch.name}"`);
    }

    // Send notification to trainer about batch being assigned to course
    if (batch.trainer) {
      await notifyTrainerCourseAssigned(batch.trainer._id || batch.trainer, course.title);
      console.log(`📢 Sent course assignment notification to trainer`);
    }

    res.json({ message: "Batch assigned and students enrolled successfully", course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get trainer courses
// ✅ Trainer: Get all assigned courses with creator info
exports.trainerCourses = async (req, res) => {
  try {
    const courses = await Course.find({ assignedTrainers: req.user.id })
      .populate("createdBy", "name email role") // so we can check Admin
      .lean();

    res.json(courses);
  } catch (err) {
    console.error("trainerCourses error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Upload day video
exports.uploadDayVideo = async (req, res) => {
  try {


    const { courseId, weekNumber, dayNumber } = req.params;

    if (!["Admin", "Trainer", "Master"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Only admins, masters and trainers can upload videos" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No video file uploaded" });
    }

    if (!req.file.mimetype.startsWith("video/")) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({ message: "Only video files are allowed" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(404).json({ message: "Course not found" });
    }

    const week = course.weeks.find((w) => w.weekNumber === Number(weekNumber));
    if (!week) {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(404).json({ message: "Week not found" });
    }

    if (!week.days) {
      week.days = [];
    }

    let day = week.days.find((d) => d.dayNumber === Number(dayNumber));
    if (!day) {
      day = {
        dayNumber: Number(dayNumber),
        title: "",
        overview: "",
        videoUrl: null,
        documentUrl: null,
        lastEditedBy: req.user.id,
        lastEditedAt: new Date(),
      };
      week.days.push(day);
    }

    if (day.videoUrl) {
      const oldVideoPath = path.join(
        __dirname,
        "../uploads/videos",
        path.basename(day.videoUrl)
      );
      if (fs.existsSync(oldVideoPath)) {
        try {
          fs.unlinkSync(oldVideoPath);
        } catch (err) {
          console.error(`Failed to delete old video`, err);
        }
      }
    }

    const videoRelativePath = `/uploads/videos/${req.file.filename}`;
    day.videoUrl = videoRelativePath;
    day.title = req.body.title || `Day ${dayNumber} Lesson`;
    day.lastEditedBy = req.user.id;
    day.lastEditedAt = new Date();

    await course.save();

    res.json({
      success: true,
      message: "Video uploaded successfully",
      dayContent: {
        videoUrl: videoRelativePath,
        title: day.title,
        overview: day.overview,
        documentUrl: day.documentUrl,
      },
    });
  } catch (err) {
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error(`Failed to delete uploaded file after error`, unlinkErr);
      }
    }
    res.status(500).json({ message: err.message || "Failed to upload video" });
  }
};

// Upload day document
// Upload day document
exports.uploadDayDocument = async (req, res) => {
  try {
    const { courseId, weekNumber, dayNumber } = req.params;

    if (!["Admin", "Trainer", "Master"].includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const week = course.weeks.find((w) => w.weekNumber === Number(weekNumber));
    if (!week) return res.status(404).json({ message: "Week not found" });

    if (!week.days) week.days = [];

    let day = week.days.find((d) => d.dayNumber === Number(dayNumber));
    if (!day) {
      day = {
        dayNumber: Number(dayNumber),
        title: "",
        overview: "",
        videoUrl: null,
        documentUrl: null,
        lastEditedBy: req.user.id,
        lastEditedAt: new Date(),
      };
      week.days.push(day);
    }

    // 1. Delete old document from GridFS if it exists
    if (day.documentGridFSId) {
      try {
        const bucket = global.videoGfsBucket; // Use "fs" bucket (same as videos)
        await bucket.delete(day.documentGridFSId);
        console.log(`Deleted old document: ${day.documentGridFSId}`);
      } catch (err) {
        console.warn(`Failed to delete old document ${day.documentGridFSId}:`, err.message);
      }
    }

    // 2. Upload new document to GridFS
    const bucket = global.videoGfsBucket;
    // Sanitize filename to ensure URL safety and correct extension parsing
    const sanitizedOriginalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${Date.now()}-${sanitizedOriginalName}`;

    // Create upload stream
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: req.file.mimetype,
      metadata: {
        originalName: req.file.originalname,
        uploadedBy: req.user.id,
        courseId: courseId
      }
    });

    // Write buffer to stream
    const bufferStream = new require('stream').PassThrough();
    bufferStream.end(req.file.buffer);

    bufferStream.pipe(uploadStream)
      .on('error', (error) => {
        console.error('GridFS Upload Error:', error);
        return res.status(500).json({ message: "Error uploading to database" });
      })
      .on('finish', async () => {
        // 3. Update Course Model
        day.documentName = req.file.originalname;
        day.documentGridFSId = uploadStream.id;
        // Point to streaming endpoint
        day.documentUrl = `/api/files/document/${filename}`;

        day.lastEditedBy = req.user.id;
        day.lastEditedAt = new Date();

        await course.save();

        res.json({
          success: true,
          message: "Document uploaded successfully",
          dayContent: day
        });
      });

  } catch (err) {
    console.error("Error updating document:", err);
    res.status(500).json({ message: "Failed to update document" });
  }
};

// Update day PPT URL
exports.updateDayPptUrl = async (req, res) => {
  try {
    const { courseId, weekNumber, dayNumber } = req.params;
    const { pptUrl } = req.body;

    if (!["Admin", "Trainer", "Master"].includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const week = course.weeks.find((w) => w.weekNumber === Number(weekNumber));
    if (!week) return res.status(404).json({ message: "Week not found" });

    if (!week.days) week.days = [];

    let day = week.days.find((d) => d.dayNumber === Number(dayNumber));
    if (!day) {
      day = {
        dayNumber: Number(dayNumber),
        title: "",
        overview: "",
        videoUrl: null,
        documentUrl: null,
        pptUrl: null,
        lastEditedBy: req.user.id,
        lastEditedAt: new Date(),
      };
      week.days.push(day);
    }

    day.pptUrl = pptUrl;
    day.lastEditedBy = req.user.id;
    day.lastEditedAt = new Date();

    await course.save();

    res.json({
      success: true,
      message: "PPT URL updated successfully",
      dayContent: {
        pptUrl: day.pptUrl,
        documentUrl: day.documentUrl,
        title: day.title,
        overview: day.overview,
      },
    });
  } catch (err) {
    console.error("Error updating PPT URL:", err);
    res.status(500).json({ message: "Failed to update PPT URL" });
  }
};

// Update day document (alias)
exports.updateDayDocument = exports.uploadDayDocument;

// Update day overview
exports.updateDayOverview = async (req, res) => {
  try {
    const { courseId, weekNumber, dayNumber } = req.params;
    const { overview } = req.body;

    if (!["Admin", "Trainer", "Master"].includes(req.user.role))
      return res.status(403).json({ message: "Access denied" });

    if (!overview || overview.trim().length === 0) {
      return res.status(400).json({ message: "Overview cannot be empty" });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const week = course.weeks.find((w) => w.weekNumber === Number(weekNumber));
    if (!week) return res.status(404).json({ message: "Week not found" });

    if (!week.days) {
      week.days = [];
    }

    let day = week.days.find((d) => d.dayNumber === Number(dayNumber));
    if (!day) {
      day = {
        dayNumber: Number(dayNumber),
        title: "",
        overview: "",
        videoUrl: null,
        documentUrl: null,
        lastEditedBy: req.user.id,
        lastEditedAt: new Date(),
      };
      week.days.push(day);
    }

    day.overview = overview;
    day.title = req.body.title || day.title || `Day ${dayNumber}`;
    day.lastEditedBy = req.user.id;
    day.lastEditedAt = new Date();

    await course.save();

    res.json({
      success: true,
      message: "Overview updated successfully",
      dayContent: {
        overview: day.overview,
        title: day.title,
        videoUrl: day.videoUrl,
        documentUrl: day.documentUrl,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Failed to update overview" });
  }
};

// Get day content
exports.getDayContent = async (req, res) => {
  try {
    const { courseId, weekNumber, dayNumber } = req.params;
    const userId = req.user.id;

    const course = await Course.findById(courseId).populate(
      "weeks.days.lastEditedBy",
      "name"
    );

    if (!course) return res.status(404).json({ message: "Course not found" });

    // Fetch all exams to robustly check for week exams
    const courseExams = await Exam.find({ courseId }).select('weekNumber _id').lean();
    const weeksWithExams = new Set(courseExams.map(e => Number(e.weekNumber)));

    const week = course.weeks.find(w => w.weekNumber === Number(weekNumber));
    if (!week) return res.status(404).json({ message: "Week not found" });

    const day = week.days.find(d => d.dayNumber === Number(dayNumber));
    if (!day) return res.status(404).json({ message: "Day not found" });

    const user = await User.findById(userId);
    const userRole = user.role;
    const isAdminOrTrainer = ["Admin", "Trainer", "Master"].includes(userRole);

    let isLocked = false;
    let lockReason = null;

    // === Batch expiry gate: students in expired batches cannot view day content ===
    if (!isAdminOrTrainer) {
      try {
        const studentBatchId = user.batch;
        if (studentBatchId) {
          const studentBatch = await Batch.findById(studentBatchId);
          if (studentBatch) {
            const expiry = studentBatch.courseAccessExpiry || studentBatch.endDate;
            if (expiry && new Date() > new Date(expiry)) {
              return res.status(403).json({ message: "Course access expired for your batch. Please contact your administrator." });
            }
          }
        }
      } catch (batchCheckErr) {
        console.error('Error checking batch expiry in getDayContent:', batchCheckErr);
      }
    }

    // ================================
    // 🔒 1) Sequential Unlocking Logic
    // ================================
    if (!isAdminOrTrainer) {
      const enrolled = user.enrolledCourses.find(
        e => e.courseId.toString() === courseId
      );

      if (!enrolled) {
        return res.json({
          dayContent: day,
          isLocked: true,
          lockReason: "You are not enrolled in this course"
        });
      }

      let requiredVideoCount = 0;

      // Count previous weeks' videos
      for (let w = 1; w < Number(weekNumber); w++) {
        const prevWeek = course.weeks.find(wx => wx.weekNumber === w);
        if (prevWeek?.days)
          requiredVideoCount += prevWeek.days.filter(
            d => d.videoUrl || d.videoGridFSId
          ).length;
      }

      // Count current week previous days' videos
      requiredVideoCount += week.days.filter(
        d => d.dayNumber < Number(dayNumber) && (d.videoUrl || d.videoGridFSId)
      ).length;

      const studentProgress = enrolled.progress || 0;

      // STRICT LOCKING: Check if previous week has exam
      let strictLock = false;
      if (Number(weekNumber) > 1) {
        const prevWeekNum = Number(weekNumber) - 1;
        const prevWeekObj = course.weeks.find(w => w.weekNumber === prevWeekNum);
        const prevWeekHasExam = weeksWithExams.has(prevWeekNum) || (prevWeekObj && prevWeekObj.hasExam);

        if (prevWeekHasExam) {
          const completedWeeksSet = new Set(Array.isArray(enrolled.completedWeeks) ? enrolled.completedWeeks.map(n => Number(n)) : []);
          if (!completedWeeksSet.has(prevWeekNum)) {
            strictLock = true;
          }
        }
      }

      if (strictLock || studentProgress < requiredVideoCount) {
        isLocked = true;
        lockReason = strictLock
          ? "Previous module exam not completed."
          : "Complete previous topics to unlock this video.";
      }

      // ================================
      // 🔒 2) One-Time Watch Lock
      // ================================
      const videosUpToThisDay =
        requiredVideoCount +
        (day.videoUrl || day.videoGridFSId ? 1 : 0);

      if (!isLocked && studentProgress >= videosUpToThisDay) {
        isLocked = true;
        lockReason = "You have already watched this video once.";
      }
    }

    // ================================
    // ⭐ 3) Check for APPROVED Rewatch Request
    // ================================
    let approvedRewatchRequest = null;
    if (!isAdminOrTrainer && isLocked) {
      const approved = await RewatchRequest.findOne({
        userId,
        courseId,
        weekNumber,
        dayNumber,
        status: "approved"
      }).sort({ approvedAt: -1 });

      if (approved) {
        isLocked = false;
        lockReason = null;
        approvedRewatchRequest = approved;
      }
    }

    // ================================
    // ⭐ 4) Admin & Trainer Never Locked
    // ================================
    if (isAdminOrTrainer) {
      isLocked = false;
      lockReason = null;
    }

    // Get enrolled info for debug and NOTE retrieval
    const enrolled = !isAdminOrTrainer ? user.enrolledCourses.find(
      e => e.courseId.toString() === courseId
    ) : null;

    // Fetch user note if exists
    let userNote = "";
    if (enrolled && enrolled.notes) {
      const noteObj = enrolled.notes.find(n => Number(n.weekNumber) === Number(weekNumber) && Number(n.dayNumber) === Number(dayNumber));
      if (noteObj) userNote = noteObj.content;
    }

    res.json({
      userNote, // <-- Return the saved note
      dayContent: {
        ...day.toObject(),
        lastEditedBy: day.lastEditedBy?.name || "Unknown"
      },
      isLocked,
      lockReason,
      permissions: {
        canEditOverview: isAdminOrTrainer,
        canEditVideo: isAdminOrTrainer,
        canEditDocument: isAdminOrTrainer
      },
      debug: {
        studentProgress: enrolled?.progress || 0,
        requiredVideoCount: !isAdminOrTrainer ? (() => {
          let count = 0;
          for (let w = 1; w < Number(weekNumber); w++) {
            const prevWeek = course.weeks.find(wx => wx.weekNumber === w);
            if (prevWeek?.days) count += prevWeek.days.filter(d => d.videoUrl || d.videoGridFSId).length;
          }
          count += week.days.filter(d => d.dayNumber < Number(dayNumber) && (d.videoUrl || d.videoGridFSId)).length;
          return count;
        })() : 0,
        videosUpToThisDay: !isAdminOrTrainer ? (() => {
          let count = 0;
          for (let w = 1; w < Number(weekNumber); w++) {
            const prevWeek = course.weeks.find(wx => wx.weekNumber === w);
            if (prevWeek?.days) count += prevWeek.days.filter(d => d.videoUrl || d.videoGridFSId).length;
          }
          count += week.days.filter(d => d.dayNumber < Number(dayNumber) && (d.videoUrl || d.videoGridFSId)).length;
          count += (day.videoUrl || day.videoGridFSId ? 1 : 0);
          return count;
        })() : 0,
        approvedRewatchRequest: approvedRewatchRequest ? {
          id: approvedRewatchRequest._id,
          status: approvedRewatchRequest.status,
          approvedAt: approvedRewatchRequest.approvedAt
        } : null
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};




// Acknowledge Course Disclaimer
exports.acknowledgeDisclaimer = async (req, res) => {
  try {
    const courseId = req.params.id;
    const userId = req.user.id;

    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find the enrolled course
    const enrollment = user.enrolledCourses.find(
      (ec) => ec.courseId.toString() === courseId || (ec.courseId._id && ec.courseId._id.toString() === courseId)
    );

    if (!enrollment) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    if (enrollment.disclaimerAcknowledged) {
      return res.json({ message: "Disclaimer already acknowledged" });
    }

    enrollment.disclaimerAcknowledged = true;
    enrollment.disclaimerAcknowledgedAt = new Date();

    await user.save();

    res.json({ message: "Disclaimer acknowledged successfully", disclaimerAcknowledged: true });
  } catch (err) {
    console.error("Error acknowledging disclaimer:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Acknowledge day
exports.acknowledgeDay = async (req, res) => {
  try {
    // Accept values from either body (POST payload) or URL params
    const courseId = req.body.courseId || req.params.courseId;
    const weekNumber = req.body.weekNumber || req.params.weekNumber;
    const dayNumber = req.body.dayNumber || req.params.dayNumber;

    console.log('acknowledgeDay called for user:', req.user?.id, 'course:', courseId, 'week:', weekNumber, 'day:', dayNumber);

    if (req.user.role !== "Student")
      return res.status(403).json({ message: "Students only" });

    // Populate enrolled course weeks so we can compute module counts
    const user = await User.findById(req.user.id).populate('enrolledCourses.courseId', 'title weeks');
    const courseIdStr = String(courseId);
    const enrolled = user.enrolledCourses.find((ec) => {
      if (!ec || !ec.courseId) return false;
      // If populated, courseId may be an object with _id
      if (ec.courseId._id) return String(ec.courseId._id) === courseIdStr;
      // Otherwise courseId is likely an ObjectId or string
      return String(ec.courseId) === courseIdStr;
    });

    if (!enrolled)
      return res.status(403).json({ message: "Not enrolled in course" });

    // === Batch expiry gate: students in expired batches cannot acknowledge days ===
    try {
      const studentBatchId = user.batch;
      if (studentBatchId) {
        const studentBatch = await Batch.findById(studentBatchId);
        if (studentBatch) {
          const expiry = studentBatch.courseAccessExpiry || studentBatch.endDate;
          if (expiry && new Date() > new Date(expiry)) {
            return res.status(403).json({ message: "Course access expired for your batch. Please contact your administrator." });
          }
        }
      }
    } catch (batchCheckErr) {
      console.error('Error checking batch expiry in acknowledgeDay:', batchCheckErr);
    }

    // Get the course to count videos properly
    const course = enrolled.courseId || {};

    // Count how many videos should be completed before this day
    let requiredVideoCount = 0;

    // Count all videos in previous weeks
    if (course.weeks && Array.isArray(course.weeks)) {
      for (let w = 1; w < Number(weekNumber); w++) {
        const prevWeek = course.weeks.find((wk) => wk.weekNumber === w);
        if (prevWeek && prevWeek.days && Array.isArray(prevWeek.days)) {
          const prevWeekVideos = prevWeek.days.filter(d => d && (d.videoUrl || d.videoGridFSId));
          requiredVideoCount += prevWeekVideos.length;
        }
      }

      // Count videos in current week before this day
      const currentWeek = course.weeks.find((wk) => wk.weekNumber === Number(weekNumber));
      if (currentWeek && currentWeek.days && Array.isArray(currentWeek.days)) {
        const currentDayVideos = currentWeek.days.filter(d =>
          d && d.dayNumber < Number(dayNumber) && (d.videoUrl || d.videoGridFSId)
        );
        requiredVideoCount += currentDayVideos.length;
      }
    }

    const currentProgress = typeof enrolled.progress === 'number' ? enrolled.progress : 0;

    // Check if previous videos are completed
    if (currentProgress < requiredVideoCount) {
      return res.status(400).json({
        message: "Cannot acknowledge this day before previous days",
      });
    }

    // Check if this day has already been acknowledged
    // Count videos up to and including this day
    let videosUpToThisDay = requiredVideoCount;
    const weekForDay = course.weeks?.find((wk) => wk.weekNumber === Number(weekNumber));
    if (weekForDay && weekForDay.days && Array.isArray(weekForDay.days)) {
      const currentDay = weekForDay.days.find(d => d.dayNumber === Number(dayNumber));
      if (currentDay && (currentDay.videoUrl || currentDay.videoGridFSId)) {
        videosUpToThisDay += 1;
      }
    }

    if (currentProgress >= videosUpToThisDay) {
      // ⭐ CRITICAL: Mark rewatch request as 'used' BEFORE returning
      // This must happen even if the day is already acknowledged
      try {
        const mongoose = require('mongoose');
        const RewatchRequestModel = require('../models/RewatchRequest');

        console.log(`[acknowledgeDay] Day already acknowledged. Checking for rewatch request to mark as used.`);

        // Find ALL approved requests for this user
        const candidates = await RewatchRequestModel.find({
          userId: new mongoose.Types.ObjectId(req.user.id),
          status: 'approved'
        });

        console.log(`[acknowledgeDay] Found ${candidates.length} approved requests for user.`);

        // Manually filter to find matching request
        const match = candidates.find(r =>
          String(r.courseId) === String(courseId) &&
          Number(r.weekNumber) === Number(weekNumber) &&
          Number(r.dayNumber) === Number(dayNumber)
        );

        if (match) {
          console.log(`[acknowledgeDay] ✅ Found matching rewatch request: ${match._id}, marking as used`);
          match.status = 'used';
          await match.save();
          console.log(`[acknowledgeDay] ✅ Marked RewatchRequest ${match._id} as used`);
        } else {
          console.log(`[acknowledgeDay] No matching approved rewatch request found.`);
        }
      } catch (updateErr) {
        console.error('[acknowledgeDay] Failed to update RewatchRequest status:', updateErr);
      }

      // Already acknowledged: return OK with current progress (idempotent)
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
      const watchedCount = currentProgress;
      const percentCompleted = totalModules > 0 ? Math.min(100, Math.round((watchedCount / totalModules) * 100)) : 0;

      return res.json({ message: 'Already acknowledged', progress: currentProgress, courseProgress: { courseId: course._id || course, watchedCount, totalModules, percentCompleted } });
    }

    // Set progress to exact count of videos watched
    // ⭐ CRITICAL: Fetch fresh user data NOW before any updates
    const freshUser = await User.findById(req.user.id);
    const freshEnrolled = freshUser.enrolledCourses.find(ec => String(ec.courseId) === String(courseId));

    if (!freshEnrolled) {
      return res.status(404).json({ message: "Enrollment not found in fresh fetch" });
    }

    // Update progress on FRESH enrollment object
    freshEnrolled.progress = videosUpToThisDay;
    console.log(`[acknowledgeDay] ✅ Updated progress from ${currentProgress} to ${freshEnrolled.progress} for course ${courseId}, week ${weekNumber}, day ${dayNumber}`);

    // Count total videos in this week/module
    let totalVideosInWeek = 0;
    if (weekForDay && weekForDay.days && Array.isArray(weekForDay.days)) {
      console.log(`[acknowledgeDay] Week ${weekNumber} has ${weekForDay.days.length} total days`);
      const videoDays = weekForDay.days.filter(d => d && (d.videoUrl || d.videoGridFSId));
      totalVideosInWeek = videoDays.length;
      console.log(`[acknowledgeDay] Week ${weekNumber} has ${totalVideosInWeek} days with videos:`, videoDays.map(d => `day ${d.dayNumber}`));
    } else {
      console.log(`[acknowledgeDay] WARNING: Could not find week ${weekNumber} in course!`);
    }

    // Count videos in all previous weeks
    let videosInPreviousWeeks = 0;
    if (course.weeks && Array.isArray(course.weeks)) {
      for (let w = 1; w < Number(weekNumber); w++) {
        const prevWeek = course.weeks.find((wk) => wk.weekNumber === w);
        if (prevWeek && prevWeek.days && Array.isArray(prevWeek.days)) {
          const prevWeekVideos = prevWeek.days.filter(d => d && (d.videoUrl || d.videoGridFSId));
          videosInPreviousWeeks += prevWeekVideos.length;
        }
      }
    }

    // Total videos up to and including this week
    const totalVideosUpToThisWeek = videosInPreviousWeeks + totalVideosInWeek;

    //Check if this completes the module BEFORE saving
    let moduleCompleted = false;
    let completedModuleNumber = null;

    // freshUser and freshEnrolled already fetched above - reuse them
    console.log(`[acknowledgeDay] 🔄 Fresh fetch: Week ${weekNumber} has ${(freshEnrolled.completedDays || []).filter(cd => Number(cd.weekNumber) === Number(weekNumber)).length} completed days in DB`);

    // Module is completed ONLY if student has watched ALL videos in this week
    // Check by counting completed days for this week PLUS the current day being acknowledged
    if (totalVideosInWeek > 0) {
      // Count how many days in this week are already in completedDays (using FRESH data!)
      let alreadyCompletedDaysInThisWeek = (freshEnrolled.completedDays || []).filter(
        cd => Number(cd.weekNumber) === Number(weekNumber)
      ).length;

      // ⭐ FALLBACK: If completedDays is incomplete due to previous bugs, use progress counter
      // Calculate how many videos should have been completed in this week based on progress
      const progressBasedCompletedInWeek = Math.max(0, currentProgress - videosInPreviousWeeks);

      // Use the higher of the two (completedDays might be incomplete)
      if (progressBasedCompletedInWeek > alreadyCompletedDaysInThisWeek) {
        console.log(`[acknowledgeDay] ⚠️ Reconciling: completedDays shows ${alreadyCompletedDaysInThisWeek} but progress suggests ${progressBasedCompletedInWeek} for week ${weekNumber}`);
        alreadyCompletedDaysInThisWeek = progressBasedCompletedInWeek;
      }

      // Total will be existing completed days + 1 (current day being acknowledged)
      // We always add 1 because this check happens BEFORE adding to completedDays array
      const totalCompletedDaysInThisWeek = alreadyCompletedDaysInThisWeek + 1;

      console.log(`[acknowledgeDay] Week ${weekNumber}: ${alreadyCompletedDaysInThisWeek} already + 1 current = ${totalCompletedDaysInThisWeek}/${totalVideosInWeek} days`);

      // Module is complete only if ALL video days in this week will be completed
      if (totalCompletedDaysInThisWeek >= totalVideosInWeek) {
        moduleCompleted = true;
        completedModuleNumber = Number(weekNumber);

        // Mark week as completed (use freshEnrolled!)
        if (!freshEnrolled.completedWeeks) freshEnrolled.completedWeeks = [];
        if (!freshEnrolled.completedWeeks.includes(Number(weekNumber))) {
          freshEnrolled.completedWeeks.push(Number(weekNumber));
          console.log(`[acknowledgeDay] ✅ Marked week ${weekNumber} as completed (${totalVideosInWeek} videos total)`);
        }

        console.log(`[acknowledgeDay] 🎉 Module ${completedModuleNumber} is now COMPLETED! (${totalCompletedDaysInThisWeek}/${totalVideosInWeek} videos)`);
      }
    }

    // ⭐ CRITICAL: Track individual day completion in completedDays array
    // This is needed for the isCompleted check in getCourseById
    // IMPORTANT: Use freshEnrolled to avoid overwriting concurrent changes!
    if (!freshEnrolled.completedDays) freshEnrolled.completedDays = [];

    // Check if this day is already marked as completed (in fresh data!)
    const dayAlreadyCompleted = freshEnrolled.completedDays.some(
      cd => Number(cd.weekNumber) === Number(weekNumber) && Number(cd.dayNumber) === Number(dayNumber)
    );

    if (!dayAlreadyCompleted) {
      freshEnrolled.completedDays.push({
        weekNumber: Number(weekNumber),
        dayNumber: Number(dayNumber),
        completedAt: new Date()
      });
      console.log(`[acknowledgeDay] ✅ Added day ${dayNumber} of week ${weekNumber} to completedDays array`);

      // ⭐ CRITICAL: Mark the nested array as modified so Mongoose saves it
      freshUser.markModified('enrolledCourses');
    }

    // ⭐ NEW: Also track specific video ID in watchedVideos for detailed progress report
    if (weekForDay && weekForDay.days) {
      const currentDayObj = weekForDay.days.find(d => d.dayNumber === Number(dayNumber));
      if (currentDayObj && currentDayObj.videoGridFSId) {
        if (!freshEnrolled.watchedVideos) freshEnrolled.watchedVideos = [];

        // Check if already watched
        const alreadyWatchedVideo = freshEnrolled.watchedVideos.some(v => String(v.videoGridFSId) === String(currentDayObj.videoGridFSId));

        if (!alreadyWatchedVideo) {
          freshEnrolled.watchedVideos.push({
            videoGridFSId: String(currentDayObj.videoGridFSId),
            watchedAt: new Date()
          });
          freshUser.markModified('enrolledCourses');
          console.log(`[acknowledgeDay] ✅ Added video ${currentDayObj.videoGridFSId} to watchedVideos`);
        }
      }
    }

    // Save to database
    await freshUser.save();

    // Verify what was saved
    const savedCompletedDaysCount = freshEnrolled.completedDays.filter(cd => Number(cd.weekNumber) === Number(weekNumber)).length;
    console.log(`[acknowledgeDay] 💾 Saved to DB. Week ${weekNumber} now has ${savedCompletedDaysCount} completed days, moduleCompleted: ${moduleCompleted}`);

    res.json({
      message: "Day acknowledged",
      progress: freshEnrolled.progress,
      moduleCompleted: moduleCompleted,
      completedModuleNumber: completedModuleNumber
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Upload video chunk (GridFS)
exports.uploadVideoChunk = async (req, res) => {
  try {
    const { chunkIndex, totalChunks, uploadId, fileName } = req.body;
    const chunkData = req.file;

    if (!global.uploadSessions) {
      global.uploadSessions = new Map();
    }

    if (!global.uploadSessions.has(uploadId)) {
      global.uploadSessions.set(uploadId, {
        fileName,
        chunks: new Map(),
        createdAt: Date.now(),
      });
    }

    const session = global.uploadSessions.get(uploadId);
    session.chunks.set(parseInt(chunkIndex), chunkData.buffer);

    const allChunksReceived = session.chunks.size === parseInt(totalChunks);

    res.json({
      success: true,
      chunkIndex,
      totalChunks,
      allChunksReceived,
      message: `Chunk ${chunkIndex}/${totalChunks} received`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Finalize video upload (GridFS)
// ✅ FIXED: Finalize video upload to GridFS
exports.finalizeVideoUpload = async (req, res) => {
  try {
    console.log("📥 Finalize request received");
    const { uploadId, courseId, weekNumber, dayNumber } = req.body;

    if (!uploadId || !courseId || !weekNumber || !dayNumber) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!global.uploadSessions || !global.uploadSessions.has(uploadId)) {
      return res.status(400).json({ error: "Upload session not found" });
    }

    const session = global.uploadSessions.get(uploadId);
    console.log("✅ Merging chunks:", session.chunks.size);

    // Merge chunks
    const chunks = [];
    for (let i = 0; i < session.chunks.size; i++) {
      chunks.push(session.chunks.get(i));
    }
    const fullVideoBuffer = Buffer.concat(chunks);
    console.log("📦 Total size:", (fullVideoBuffer.length / 1024 / 1024).toFixed(2), "MB");

    // ✅ FIXED: Use videoGfsBucket instead of gfsBucket
    const gfsBucket = global.videoGfsBucket;
    if (!gfsBucket) {
      console.error("❌ Video GridFSBucket not initialized");
      global.uploadSessions.delete(uploadId);
      return res.status(500).json({ error: "Video GridFS not initialized" });
    }

    console.log("🎬 Creating upload stream to 'fs' bucket...");

    return new Promise((resolve, reject) => {
      const uploadStream = gfsBucket.openUploadStream(session.fileName, {
        contentType: "video/mp4",
        metadata: {
          courseId,
          weekNumber: Number(weekNumber),
          dayNumber: Number(dayNumber),
          uploadedAt: new Date(),
        },
      });

      uploadStream.on("finish", async () => {
        try {
          const fileId = uploadStream.id;
          console.log("✅ Video saved to GridFS 'fs' bucket, ID:", fileId);

          // Update database
          const course = await Course.findById(courseId);
          if (!course) {
            global.uploadSessions.delete(uploadId);
            console.error("❌ Course not found");
            return resolve(res.status(404).json({ error: "Course not found" }));
          }

          const week = course.weeks.find(w => w.weekNumber === Number(weekNumber));
          if (!week) {
            global.uploadSessions.delete(uploadId);
            console.error("❌ Week not found");
            return resolve(res.status(404).json({ error: "Week not found" }));
          }

          if (!week.days) week.days = [];

          let day = week.days.find(d => d.dayNumber === Number(dayNumber));
          if (!day) {
            day = {
              dayNumber: Number(dayNumber),
              title: "",
              overview: "",
              videoGridFSId: null,
              videoName: null,
              documentUrl: null,
              lastEditedBy: req.user?.id,
              lastEditedAt: new Date(),
            };
            week.days.push(day);
          }

          day.videoGridFSId = fileId;
          day.videoName = session.fileName;
          day.videoUrl = `/api/courses/gfs/video/${fileId}`;
          day.lastEditedBy = req.user?.id;
          day.lastEditedAt = new Date();

          await course.save();
          console.log("✅ Course updated with video ID");

          global.uploadSessions.delete(uploadId);

          resolve(res.json({
            success: true,
            message: "Video uploaded successfully!",
            dayContent: {
              videoUrl: day.videoUrl,
              videoName: day.videoName,
              videoGridFSId: fileId.toString(),
            },
          }));
        } catch (error) {
          console.error("❌ Error in finish:", error.message);
          global.uploadSessions.delete(uploadId);
          resolve(res.status(500).json({ error: error.message }));
        }
      });

      uploadStream.on("error", (err) => {
        console.error("❌ GridFS write error:", err.message);
        global.uploadSessions.delete(uploadId);
        resolve(res.status(500).json({ error: err.message }));
      });

      console.log("📤 Writing video buffer to GridFS...");
      uploadStream.end(fullVideoBuffer);
    });
  } catch (error) {
    console.error("❌ Finalize catch error:", error.message);
    res.status(500).json({ error: error.message });
  }
};


// Stream video (GridFS)
// ✅ FIXED: Stream video from GridFS with proper range support
exports.streamVideo = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error("Invalid video ID:", id);
      return res.status(400).json({ error: "Invalid video ID" });
    }

    // Get the video bucket
    const gfsBucket = global.videoGfsBucket;

    if (!gfsBucket) {
      console.error("GridFS video bucket not initialized");
      return res.status(500).json({ error: "Video streaming not available" });
    }

    // Find the file in GridFS
    const files = await gfsBucket.find({ _id: new mongoose.Types.ObjectId(id) }).toArray();

    if (!files || files.length === 0) {
      console.error("Video not found in GridFS:", id);
      return res.status(404).json({ error: "Video not found" });
    }

    const file = files[0];
    console.log("Streaming video:", file.filename, "Size:", file.length);

    // Handle range requests (for video seeking)
    const range = req.headers.range;

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
      const chunkSize = end - start + 1;

      // Send partial content
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${file.length}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": file.contentType || "video/mp4",
      });

      // Create read stream with range
      const downloadStream = gfsBucket.openDownloadStream(file._id, {
        start,
        end: end + 1,
      });

      downloadStream.on("error", (error) => {
        console.error("Stream error:", error);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });

      downloadStream.pipe(res);
    } else {
      // No range, send entire file
      res.writeHead(200, {
        "Content-Length": file.length,
        "Content-Type": file.contentType || "video/mp4",
        "Accept-Ranges": "bytes",
      });

      const downloadStream = gfsBucket.openDownloadStream(file._id);

      downloadStream.on("error", (error) => {
        console.error("Stream error:", error);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });

      downloadStream.pipe(res);
    }
  } catch (error) {
    console.error("Stream video error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream video", details: error.message });
    }
  }
};

// ✅ Update course (title, description, weeks, and NEW info fields)
exports.updateCourse = async (req, res) => {
  try {
    const {
      title,
      description,
      weeks,
      aboutCourse,
      learnings,
      whatYouWillDo,
      disclaimerEnabled,
      disclaimerContent
    } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // ✅ Update title & description
    if (title) course.title = title;
    if (description) course.description = description;

    // ✅ Update NEW fields
    if (aboutCourse !== undefined) course.aboutCourse = aboutCourse;
    if (learnings !== undefined) course.learnings = learnings;
    if (whatYouWillDo !== undefined) course.whatYouWillDo = whatYouWillDo;
    if (disclaimerEnabled !== undefined) course.disclaimerEnabled = disclaimerEnabled;
    if (disclaimerContent !== undefined) course.disclaimerContent = disclaimerContent;

    // ✅ If number of weeks changed
    if (weeks && Number(weeks) !== course.weeks.length) {
      const newWeekCount = Number(weeks);

      if (newWeekCount > course.weeks.length) {
        // Add extra empty weeks
        const extraWeeks = newWeekCount - course.weeks.length;
        for (let i = 0; i < extraWeeks; i++) {
          course.weeks.push({
            weekNumber: course.weeks.length + 1,
            days: []
          });
        }
      } else {
        // Remove extra weeks
        course.weeks = course.weeks.slice(0, newWeekCount);
      }
    }

    await course.save();

    res.json({
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    console.error("Update course error:", error);
    res.status(500).json({ message: "Failed to update course" });
  }
};

exports.deleteCourseById = async (req, res) => {
  const { id } = req.params;
  try {
    await Course.findByIdAndDelete(id);

    await User.updateMany(
      { "enrolledCourses.courseId": id },
      { $pull: { enrolledCourses: { courseId: id } } }
    );

    res.status(200).json({ message: "Course deleted successfully" });
  } catch (err) {
    console.error("Delete course error:", err);
    res.status(500).json({ message: "Failed to delete course" });
  }
};


// ✅ UPLOAD COURSE IMAGE (FIXED - No disk save needed)
exports.uploadCourseImage = async (req, res) => {
  try {
    if (!["Admin", "Trainer", "Master"].includes(req.user.role)) {
      return res.status(403).json({ message: "No permission" });
    }

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // ✅ OPTIONAL IMAGE: if no file → keep existing image
    if (!req.file) {
      return res.json({
        success: true,
        message: "No image uploaded. Course updated without image.",
        data: course,
      });
    }

    // Delete old GridFS image if exists
    if (course.imageGridFSId) {
      try {
        await global.gfsBucket.delete(course.imageGridFSId);
      } catch { }
    }

    // ✅ Upload new image to GridFS
    return new Promise((resolve) => {
      const uploadStream = global.gfsBucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });

      uploadStream.on("finish", async () => {
        course.imageGridFSId = uploadStream.id;
        course.imageName = req.file.originalname;
        course.imageContentType = req.file.mimetype;
        course.imageUrl = `/api/courses/${course._id}/image`;

        await course.save();

        resolve(res.json({
          success: true,
          message: "Image uploaded successfully",
          imageUrl: course.imageUrl,
        }));
      });

      uploadStream.end(req.file.buffer);
    });
  } catch (err) {
    return res.status(500).json({ message: "Upload failed" });
  }
};


// ✅ GET COURSE IMAGE (FIXED)
// ✅ GET COURSE IMAGE (FIXED - Proper ObjectId conversion)
exports.getCourseImage = async (req, res) => {
  try {
    console.log("📥 Fetching image for course:", req.params.id);

    // ✅ Validate ObjectId first
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log("❌ Invalid course ID format");
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const courseId = new mongoose.Types.ObjectId(req.params.id);
    const course = await Course.findById(courseId).select("imageGridFSId imageContentType imageName");

    if (!course) {
      console.log("❌ Course not found");
      return res.status(404).json({ message: "Course not found" });
    }

    if (!course.imageGridFSId) {
      console.log("❌ No image for this course");
      return res.status(404).json({ message: "Image not found" });
    }

    console.log("✅ Found image ID:", course.imageGridFSId);

    // Check if GridFS is initialized
    if (!global.gfsBucket) {
      console.error("❌ GridFS not initialized");
      return res.status(500).json({ message: "GridFS not initialized" });
    }

    // Set response headers for image
    res.set("Content-Type", course.imageContentType || "image/jpeg");
    res.set("Cache-Control", "public, max-age=604800");
    res.set("Accept-Ranges", "bytes");

    // ✅ Convert imageGridFSId to ObjectId properly
    let imageId = course.imageGridFSId;
    if (typeof imageId === 'object') {
      imageId = imageId.toString();
    }

    console.log("🎯 Opening download stream for image:", imageId);

    // Stream image from GridFS
    const downloadStream = global.gfsBucket.openDownloadStream(
      new mongoose.Types.ObjectId(imageId)
    );

    downloadStream.on("error", (err) => {
      console.error("❌ GridFS download error:", err.message);
      if (!res.headersSent) {
        res.status(404).json({ message: "Image not found in database" });
      }
    });

    downloadStream.on("data", (chunk) => {
      console.log("📦 Streaming chunk:", chunk.length, "bytes");
    });

    downloadStream.on("end", () => {
      console.log("✅ Image stream completed");
    });

    downloadStream.pipe(res);

  } catch (err) {
    console.error("❌ Get image error:", err.message);
    console.error("Stack:", err.stack);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to retrieve image: " + err.message });
    }
  }
};

// Update module name (previously week name)
exports.updateModuleName = async (req, res) => {
  try {
    const { courseId, weekNumber } = req.params;
    const { customName } = req.body;

    // Validate role
    if (!["Admin", "Trainer", "Master"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only Admins, Masters and Trainers can edit module names" });
    }

    // Validate custom name length
    if (customName && customName.length > 150) {
      return res.status(400).json({ message: "Module name cannot exceed 150 characters" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const week = course.weeks.find(w => w.weekNumber === Number(weekNumber));
    if (!week) {
      return res.status(404).json({ message: "Module not found" });
    }

    // Update the custom name
    week.customName = customName || "";  // Empty string if no custom name provided

    // Save the changes
    await course.save();

    res.json({
      message: "Module name updated successfully",
      module: {
        weekNumber: week.weekNumber,
        customName: week.customName,
        title: week.title
      }
    });

  } catch (error) {
    console.error("Error updating module name:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update day name
exports.updateDayName = async (req, res) => {
  try {
    const { courseId, weekNumber, dayNumber } = req.params;
    const { customName, title } = req.body;

    // Validate role
    if (!["Admin", "Trainer", "Master"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only Admins, Masters and Trainers can edit day names" });
    }

    // Validate lengths
    if ((customName && customName.length > 150) || (title && title.length > 150)) {
      return res.status(400).json({ message: "Day name cannot exceed 150 characters" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const week = course.weeks.find(w => w.weekNumber === Number(weekNumber));
    if (!week) {
      return res.status(404).json({ message: "Module not found" });
    }

    const day = week.days.find(d => d.dayNumber === Number(dayNumber));
    if (!day) {
      return res.status(404).json({ message: "Day not found" });
    }

    // If a raw title was provided (frontend may send `title`), update the canonical title
    if (title) {
      day.title = title.trim();
    }

    // Update the customName if provided, otherwise if title was provided set customName to title
    if (typeof customName !== 'undefined') {
      day.customName = customName ? String(customName).trim() : "";
    } else if (title) {
      day.customName = title.trim();
    }

    // Set edit metadata on the week
    week.lastEditedBy = req.user.id;
    week.lastEditedAt = new Date();

    // Save the changes
    await course.save();

    // Respond with the full updated week (same shape as getWeekDetails) so clients can refresh easily
    const sortedDays = [...week.days].sort((a, b) => a.dayNumber - b.dayNumber);

    res.json({
      message: "Day name updated successfully",
      week: {
        weekNumber: week.weekNumber,
        title: week.title,
        days: sortedDays,
        dayCount: sortedDays.length,
        hasExam: week.hasExam
      }
    });

  } catch (error) {
    console.error("Error updating day name:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add a new day to a week
exports.addDayToWeek = async (req, res) => {
  try {
    const { courseId, weekNumber } = req.params;
    const { dayNumber, title } = req.body;

    // Validate role
    if (!["Admin", "Trainer", "Master"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only Admins, Masters and Trainers can modify course structure" });
    }

    // Validate inputs
    if (!dayNumber || typeof dayNumber !== 'number' || dayNumber < 1) {
      return res.status(400).json({ message: "Invalid day number" });
    }

    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find week
    const week = course.weeks.find(w => w.weekNumber === Number(weekNumber));
    if (!week) {
      return res.status(404).json({ message: "Week not found" });
    }

    // Initialize days array if it doesn't exist
    if (!week.days) {
      week.days = [];
    }

    // Check for duplicate day number
    if (week.days.some(d => d.dayNumber === dayNumber)) {
      return res.status(400).json({ message: `Day ${dayNumber} already exists in this week` });
    }

    // Create new day object
    const newDay = {
      dayNumber,
      title: title || `Day ${dayNumber}`,
      overview: "",
      videoGridFSId: null,
      videoName: null,
      documentUrl: null,
      documentGridFSId: null,
      documentName: null,
      lastEditedBy: req.user.id,
      lastEditedAt: new Date()
    };

    // Add the new day and sort by dayNumber
    week.days.push(newDay);
    week.days.sort((a, b) => a.dayNumber - b.dayNumber);

    // Save the course
    await course.save();

    res.status(201).json({
      message: "Day added successfully",
      week: {
        weekNumber: week.weekNumber,
        title: week.title,
        days: week.days
      }
    });

  } catch (error) {
    console.error("Error adding day:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete a day from a week
exports.deleteDayFromWeek = async (req, res) => {
  try {
    const { courseId, weekNumber, dayNumber } = req.params;

    // Validate role
    if (!["Admin", "Trainer", "Master"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only Admins, Masters and Trainers can modify course structure" });
    }

    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find week
    const week = course.weeks.find(w => w.weekNumber === Number(weekNumber));
    if (!week) {
      return res.status(404).json({ message: "Week not found" });
    }

    // Find day
    const dayIndex = week.days.findIndex(d => d.dayNumber === Number(dayNumber));
    if (dayIndex === -1) {
      return res.status(404).json({ message: "Day not found" });
    }

    // Check if it's the last day
    if (week.days.length === 1) {
      return res.status(400).json({ message: "Cannot delete the last day of a week" });
    }

    const dayToDelete = week.days[dayIndex];

    // Delete associated video from GridFS if it exists
    if (dayToDelete.videoGridFSId) {
      try {
        const gfsBucket = global.gfsBucket;
        if (gfsBucket) {
          await gfsBucket.delete(dayToDelete.videoGridFSId);
        }
      } catch (gridFsError) {
        console.error("Error deleting video from GridFS:", gridFsError);
        // Continue with day deletion even if GridFS deletion fails
      }
    }

    // Delete associated document if it exists
    if (dayToDelete.documentUrl) {
      const docPath = path.join(__dirname, "..", dayToDelete.documentUrl);
      if (fs.existsSync(docPath)) {
        try {
          fs.unlinkSync(docPath);
        } catch (fsError) {
          console.error("Error deleting document file:", fsError);
          // Continue with day deletion even if file deletion fails
        }
      }
    }

    // Remove the day from the week
    week.days.splice(dayIndex, 1);

    // Update user acknowledgments
    await User.updateMany(
      { "enrolledCourses.courseId": courseId },
      {
        $pull: {
          "enrolledCourses.$.completedDays": {
            weekNumber: Number(weekNumber),
            dayNumber: Number(dayNumber)
          }
        }
      }
    );

    // Save the course
    await course.save();

    res.json({
      message: "Day deleted successfully",
      week: {
        weekNumber: week.weekNumber,
        title: week.title,
        days: week.days
      }
    });

  } catch (error) {
    console.error("Error deleting day:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete entire week/module from a course
exports.deleteModule = async (req, res) => {
  try {
    const { courseId, weekNumber } = req.params;

    // Validate role
    if (!["Admin", "Trainer", "Master"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only Admins, Masters and Trainers can delete modules" });
    }

    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find week index
    const weekIndex = course.weeks.findIndex(w => w.weekNumber === Number(weekNumber));
    if (weekIndex === -1) {
      return res.status(404).json({ message: "Module not found" });
    }

    const weekToDelete = course.weeks[weekIndex];

    // Delete all associated videos and documents from this week's days
    for (const day of weekToDelete.days) {
      // Delete video from GridFS if exists
      if (day.videoGridFSId) {
        try {
          const gfsBucket = global.gfsBucket;
          if (gfsBucket) {
            await gfsBucket.delete(day.videoGridFSId);
          }
        } catch (gridFsError) {
          console.error("Error deleting video from GridFS:", gridFsError);
        }
      }

      // Delete document if exists
      if (day.documentUrl) {
        const docPath = path.join(__dirname, "..", day.documentUrl);
        if (fs.existsSync(docPath)) {
          try {
            fs.unlinkSync(docPath);
          } catch (fsError) {
            console.error("Error deleting document file:", fsError);
          }
        }
      }
    }

    // Delete any associated exams for this week
    try {
      await Exam.deleteMany({ courseId: courseId, weekNumber: Number(weekNumber) });
    } catch (examError) {
      console.error("Error deleting exams for week:", examError);
    }

    // Remove the week from the course
    course.weeks.splice(weekIndex, 1);

    // Update user progress/acknowledgments for all days in this week
    await User.updateMany(
      { "enrolledCourses.courseId": courseId },
      {
        $pull: {
          "enrolledCourses.$.completedWeeks": Number(weekNumber),
          "enrolledCourses.$.completedWeeksPointsClaimed": Number(weekNumber),
          "enrolledCourses.$.completedDays": {
            weekNumber: Number(weekNumber)
          }
        }
      }
    );

    // ⭐ CRITICAL: Recalculate progress for all enrolled students
    // After removing completedDays, the progress counter needs to be updated
    const enrolledStudents = await User.find({ "enrolledCourses.courseId": courseId });
    console.log(`[deleteModule] Found ${enrolledStudents.length} enrolled students to recalculate`);

    for (const student of enrolledStudents) {
      const enrollment = student.enrolledCourses.find(ec => String(ec.courseId) === String(courseId));
      if (enrollment) {
        const oldProgress = enrollment.progress;
        let validCompletedCount = 0;

        for (const cd of (enrollment.completedDays || [])) {
          const week = course.weeks.find(w => w.weekNumber === Number(cd.weekNumber));
          if (week && week.days) {
            const day = week.days.find(d => d.dayNumber === Number(cd.dayNumber));
            if (day && (day.videoUrl || day.videoGridFSId)) {
              validCompletedCount++;
            }
          }
        }

        enrollment.progress = validCompletedCount;
        console.log(`[deleteModule] Student ${student._id}: progress ${oldProgress} → ${validCompletedCount}`);
        console.log(`[deleteModule] - completedDays: ${enrollment.completedDays?.length || 0}, completedWeeks: ${enrollment.completedWeeks?.length || 0}`);
      }
    }
    await Promise.all(enrolledStudents.map(s => s.save()));
    console.log(`[deleteModule] ✅ Successfully saved progress for ${enrolledStudents.length} students`);

    // Save the course
    await course.save();

    res.json({
      message: "Module deleted successfully",
      course: {
        _id: course._id,
        title: course.title,
        weeks: course.weeks
      }
    });

  } catch (error) {
    console.error("Error deleting module:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get week details
exports.getWeekDetails = async (req, res) => {
  try {
    const { courseId, weekNumber } = req.params;

    // Find course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Fetch all exams to robustly check for week exams
    const courseExams = await Exam.find({ courseId }).select('weekNumber _id').lean();
    const weeksWithExams = new Set(courseExams.map(e => Number(e.weekNumber)));

    // Find week
    const week = course.weeks.find(w => w.weekNumber === Number(weekNumber));
    if (!week) {
      return res.status(404).json({ message: "Week not found" });
    }

    // Sort days by dayNumber
    let sortedDays = [...week.days].sort((a, b) => a.dayNumber - b.dayNumber);

    // ✅ SEQUENTIAL UNLOCKING: Add locked status and completion flags for students
    let weekLocked = false;
    // default flags to return (for students we'll try to populate these)
    let isWeekCompleted = false;
    let weekPointsClaimed = false;
    if (req.user.role === "Student") {
      const user = await User.findById(req.user.id);
      const enrolled = user.enrolledCourses.find((ec) => {
        if (!ec || !ec.courseId) return false;
        const ecId = ec.courseId._id ? String(ec.courseId._id) : String(ec.courseId);
        return ecId === String(courseId);
      });

      if (enrolled) {
        const studentProgress = typeof enrolled.progress === 'number' ? enrolled.progress : 0;
        // completedWeeks (array) and completedDays (array of {weekNumber, dayNumber}) may exist on enrollment
        const completedWeeksSet = new Set(Array.isArray(enrolled.completedWeeks) ? enrolled.completedWeeks.map(n => Number(n)) : []);
        // whether this week has been marked completed on the enrollment
        isWeekCompleted = completedWeeksSet.has(Number(weekNumber));
        const completedDays = Array.isArray(enrolled.completedDays) ? enrolled.completedDays : [];
        const isDayMarkedCompleted = (wNum, dNum) => completedDays.some(cd => Number(cd.weekNumber) === Number(wNum) && Number(cd.dayNumber) === Number(dNum));

        // Fetch user's submissions for these exams to verify actual completion
        const examIds = courseExams.map(e => e._id);
        const userSubmissions = await ExamSubmission.find({
          student: req.user.id,
          exam: { $in: examIds },
          status: { $in: ['submitted', 'graded', 'evaluated'] }
        }).select('exam').lean();

        const submittedExamIds = new Set(userSubmissions.map(s => String(s.exam)));

        // Count all videos in previous weeks
        let videosBeforeThisWeek = 0;
        for (let w = 1; w < Number(weekNumber); w++) {
          const prevWeek = course.weeks.find((wk) => wk.weekNumber === w);
          if (prevWeek && prevWeek.days) {
            const prevWeekVideos = prevWeek.days.filter(d => d && (d.videoUrl || d.videoGridFSId));
            videosBeforeThisWeek += prevWeekVideos.length;
          }
        }

        // Check if previous week(s) are completed (for week > 1)
        if (Number(weekNumber) > 1) {
          const requiredForWeek = videosBeforeThisWeek; // total videos in earlier weeks
          const prevWeekNum = Number(weekNumber) - 1;
          const prevWeekObj = course.weeks.find(w => w.weekNumber === prevWeekNum);

          const prevWeekCompleted = completedWeeksSet.has(prevWeekNum);
          const hasEnoughProgress = studentProgress >= requiredForWeek;

          // STRICT LOCKING: If previous week has exam, MUST depend on 'completedWeeks'
          const prevWeekHasExam = weeksWithExams.has(prevWeekNum) || (prevWeekObj && prevWeekObj.hasExam);

          if (prevWeekHasExam) {
            // Find exams for the previous week
            const examsForPrevWeek = courseExams.filter(e => Number(e.weekNumber) === prevWeekNum);
            // Check if ALL exams for that week are submitted
            const allExamsSubmitted = examsForPrevWeek.every(e => submittedExamIds.has(String(e._id)));

            if (!allExamsSubmitted) {
              weekLocked = true;
            }
          } else {
            // Standard video progression
            if (!prevWeekCompleted && !hasEnoughProgress) {
              weekLocked = true;
            }
          }
        }

        // Add locked status and completion flag to each day
        sortedDays = sortedDays.map((day) => {
          let dayLocked = weekLocked;

          // Count videos in current week before this day
          let videosBeforeThisDay = videosBeforeThisWeek;
          const currentWeekDays = week.days.filter(d => d && d.dayNumber < day.dayNumber && (d.videoUrl || d.videoGridFSId));
          videosBeforeThisDay += currentWeekDays.length;

          // Check if previous days in current week are completed
          if (!dayLocked) {
            if (studentProgress < videosBeforeThisDay) {
              dayLocked = true;
            }
          }

          // Determine completion: explicitly marked OR inferred from progress OR whole week marked completed
          const dayHasVideo = !!(day.videoUrl || day.videoGridFSId);
          const videosUpToThisDay = videosBeforeThisDay + (dayHasVideo ? 1 : 0);
          const dayCompleted = isDayMarkedCompleted(week.weekNumber, day.dayNumber) || (dayHasVideo && studentProgress >= videosUpToThisDay) || completedWeeksSet.has(Number(week.weekNumber));

          // Convert Mongoose document to plain object if needed
          const dayObj = day.toObject ? day.toObject() : (typeof day === 'object' ? day : {});
          return {
            ...dayObj,
            isLocked: dayLocked,
            hasVideo: dayHasVideo,
            isCompleted: !!dayCompleted,
          };
        });
        // if not explicitly marked, infer week completion if all video days are completed
        if (!isWeekCompleted) {
          try {
            const videoDays = sortedDays.filter(d => d && d.hasVideo);
            if (videoDays.length > 0 && videoDays.every(d => !!d.isCompleted)) {
              isWeekCompleted = true;
            }
          } catch (inferErr) {
            // ignore
          }
        }
        // whether points for this week were already claimed by this student
        weekPointsClaimed = Array.isArray(enrolled.completedWeeksPointsClaimed)
          ? enrolled.completedWeeksPointsClaimed.map(n => Number(n)).includes(Number(weekNumber))
          : false;
      }
    }

    // Attach exams for the week (if any)
    let examsForWeek = [];
    try {
      // Ensure courseId is used as an ObjectId for match if valid
      const courseIdObj = (mongoose.Types.ObjectId.isValid(courseId) ? mongoose.Types.ObjectId(courseId) : courseId);
      const examDocs = await Exam.find({ courseId: courseIdObj, weekNumber: Number(weekNumber) }).lean();
      if (Array.isArray(examDocs) && examDocs.length) {
        if (req.user.role === 'Student') {
          const examIds = examDocs.map(e => e._id);
          const submissions = await ExamSubmission.find({ exam: { $in: examIds }, student: req.user.id }).select('exam status attemptNumber totalMarksObtained totalMarksMax percentageScore').lean();
          const submissionMap = new Map(submissions.map(s => [String(s.exam), s]));
          examsForWeek = examDocs.map(e => {
            const s = submissionMap.get(String(e._id));
            return {
              examId: e._id,
              title: e.title,
              duration: e.duration,
              examType: e.type || e.examType || 'mcq',
              totalMarks: e.totalMarks || (Array.isArray(e.questions) ? e.questions.length : 0),
              status: s?.status || 'not_started',
              submission: s ? {
                totalMarksObtained: s.totalMarksObtained,
                totalMarksMax: s.totalMarksMax,
                percentageScore: s.percentageScore,
              } : null
            };
          });
        } else {
          examsForWeek = examDocs.map(e => ({
            examId: e._id,
            title: e.title,
            duration: e.duration,
            examType: e.type || e.examType || 'mcq',
            totalMarks: e.totalMarks || (Array.isArray(e.questions) ? e.questions.length : 0),
            published: !!e.published,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching exams for week:', err.message || err);
    }

    res.json({
      weekNumber: week.weekNumber,
      title: week.title,
      days: sortedDays,
      dayCount: sortedDays.length,
      hasExam: week.hasExam,
      exams: examsForWeek,
      isLocked: weekLocked,
      isCompleted: !!isWeekCompleted,
      pointsClaimed: !!weekPointsClaimed
    });

  } catch (error) {
    console.error("Error getting week details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Reorder days in a week
exports.reorderDaysInWeek = async (req, res) => {
  try {
    const { courseId, weekNumber } = req.params;
    const { newDayIds } = req.body; // Array of day IDs in the desired order

    if (!Array.isArray(newDayIds) || newDayIds.length === 0) {
      return res.status(400).json({ message: "Invalid or empty day IDs provided" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const week = course.weeks.find(w => w.weekNumber === parseInt(weekNumber));
    if (!week) {
      return res.status(404).json({ message: "Module (Week) not found" });
    }

    // Create a map of existing days for quick lookup
    const daysMap = new Map(week.days.map(d => [d._id.toString(), d]));

    // Construct the new ordered list of days
    const reorderedDays = [];
    const processedIds = new Set();

    // First, add days from the newDayIds list if they exist in the module
    for (const id of newDayIds) {
      if (daysMap.has(id)) {
        reorderedDays.push(daysMap.get(id));
        processedIds.add(id);
      }
    }

    // Then, append any days that were missing from the input (safety fallback)
    for (const day of week.days) {
      if (!processedIds.has(day._id.toString())) {
        reorderedDays.push(day);
      }
    }

    // Update dayNumbers based on new index (1-based)
    reorderedDays.forEach((day, index) => {
      day.dayNumber = index + 1;
    });

    // Save
    week.days = reorderedDays;
    await course.save();

    res.json({
      message: "Topics reordered successfully",
      days: week.days
    });

  } catch (err) {
    console.error("Error reordering topics:", err);
    res.status(500).json({ message: "Failed to reorder topics" });
  }
};

// Save user note for a day
exports.saveNote = async (req, res) => {
  try {
    const { courseId, weekNumber, dayNumber } = req.params;
    const { note } = req.body; // Can be empty string to clear

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const enrolled = user.enrolledCourses.find(ec => String(ec.courseId) === courseId);
    if (!enrolled) return res.status(403).json({ message: "Not enrolled" });

    if (!enrolled.notes) enrolled.notes = [];

    const existingNoteIndex = enrolled.notes.findIndex(
      n => Number(n.weekNumber) === Number(weekNumber) && Number(n.dayNumber) === Number(dayNumber)
    );

    if (existingNoteIndex > -1) {
      // Update existing
      enrolled.notes[existingNoteIndex].content = note;
      enrolled.notes[existingNoteIndex].updatedAt = new Date();
    } else {
      // Create new
      enrolled.notes.push({
        weekNumber: Number(weekNumber),
        dayNumber: Number(dayNumber),
        content: note,
        updatedAt: new Date()
      });
    }

    await user.save();
    res.json({ success: true, message: "Note saved" });
  } catch (err) {
    console.error("Error saving note:", err);
    res.status(500).json({ message: "Failed to save note" });
  }
};

