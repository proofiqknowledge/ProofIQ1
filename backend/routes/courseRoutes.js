const express = require("express");
const multer = require("multer");
const router = express.Router();

const auth = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const {
  createCourse,
  editCourse,
  deleteCourse,
  listCourses,
  getCourseById,
  assignTrainerToCourse,
  assignBatchToCourse,
  trainerCourses,
  uploadDayVideo,
  uploadDayDocument,
  updateDayOverview,
  updateDayDocument,
  getDayContent,
  acknowledgeDay,
  uploadVideoChunk,
  finalizeVideoUpload,
  streamVideo,
  uploadCourseImage,
  getCourseImage,
  deleteCourseById,
  updateCourse,
  adminCourseOverview,
  unenrollUserFromCourse,
  getEnrolledUsersForCourse,
  addModule,
  addDayToWeek,
  deleteDayFromWeek,
  deleteModule,  // Added: Module deletion
  getWeekDetails,
  updateModuleName,
  updateDayName,
  updateTopicInModule,
  updateCourseDuration,    // ⭐ NEW IMPORT
  updateCourseStayDuration, // ⭐ NEW IMPORT FOR STAY DURATION
  updateDayPptUrl,
  reorderDaysInWeek, // ⭐ NEW IMPORT FOR REORDERING
  saveNote, // ⭐ NEW IMPORT FOR NOTES
  acknowledgeDisclaimer, // ⭐ NEW IMPORT FOR DISCLAIMER
} = require("../controllers/courseController");

const protect = require("../middlewares/authMiddleware");
const { videoUpload, documentUpload } = require("../utils/uploadMiddleware");

// Topic management
router.put("/:id/week/:weekNumber/topic/:dayNumber", protect, updateTopicInModule);

// Memory storage for images
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = require('path').extname(file.originalname).toLowerCase();

    if (!allowed.includes(ext)) {
      return cb(new Error('Only image files allowed'), false);
    }
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File must be image'), false);
    }
    cb(null, true);
  }
});

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});
const { getCourseProgress } = require("../controllers/progressController");

router.get("/:courseId/progress", auth, (req, res, next) => {
  // call: GET /api/progress/:studentId/course/:courseId
  req.params.studentId = req.user.id;
  next();
}, getCourseProgress);


// =====================================================
// 🎬 GRIDFS VIDEO ROUTES
// =====================================================
router.post("/gfs/upload-chunk", protect, chunkUpload.single("chunk"), uploadVideoChunk);
router.post("/gfs/finalize-upload", protect, finalizeVideoUpload);
router.get("/gfs/video/:id", streamVideo);

// ⭐ NEW DURATION ROUTE
router.patch("/:id/duration", auth, roleMiddleware.isAdmin, updateCourseDuration);

// ⭐ NEW STAY DURATION ROUTE
router.put("/:id/stay-duration", auth, roleMiddleware.isAdmin, updateCourseStayDuration);

// =====================================================
// 🖼️ IMAGE ROUTES
// =====================================================
router.post("/:id/upload-image", protect, imageUpload.single("image"), uploadCourseImage);
router.get("/:id/image", getCourseImage);

// =====================================================
// 📘 CORE ROUTES
// =====================================================
router.get("/", protect, listCourses);
router.post("/", protect, imageUpload.single("image"), createCourse);
router.get("/admin/overview", protect, adminCourseOverview);
router.get("/trainer/courses", protect, trainerCourses);

// =====================================================
// MODULE & DAY ROUTES
// =====================================================
router.post("/:courseId/weeks", protect, addModule);
router.get("/:courseId/week/:weekNumber", protect, getWeekDetails);
router.delete("/:courseId/week/:weekNumber", protect, deleteModule);  // Delete module (week path)
router.delete("/:courseId/module/:weekNumber", protect, deleteModule);  // Delete module (module alias)
router.post("/:courseId/week/:weekNumber/day", protect, addDayToWeek);
router.delete("/:courseId/week/:weekNumber/day/:dayNumber", protect, deleteDayFromWeek);
router.get("/:courseId/week/:weekNumber/day/:dayNumber", protect, getDayContent);

router.put("/:courseId/week/:weekNumber/name", protect, updateModuleName);
router.put("/:courseId/week/:weekNumber/day/:dayNumber/name", protect, updateDayName);

router.put("/:courseId/week/:weekNumber/day/:dayNumber/overview", protect, updateDayOverview);
router.put("/:courseId/week/:weekNumber/day/:dayNumber/ppt-url", protect, updateDayPptUrl);
router.put("/:courseId/week/:weekNumber/day/:dayNumber/document", protect, documentUpload.single("document"), updateDayDocument);
router.put("/:courseId/week/:weekNumber/day/:dayNumber/video", protect, videoUpload.single("video"), uploadDayVideo);
router.post("/:courseId/week/:weekNumber/day/:dayNumber/acknowledge", protect, acknowledgeDay);

router.put("/:courseId/week/:weekNumber/reorder-days", protect, reorderDaysInWeek); // ⭐ NEW ROUTE
router.put("/:courseId/week/:weekNumber/day/:dayNumber/note", protect, saveNote); // ⭐ NEW: Save Note Route
// =====================================================
// ASSIGNMENTS
// =====================================================
router.post("/:id/assign-trainer", protect, assignTrainerToCourse);
router.post("/:id/assign-batch", protect, assignBatchToCourse);
router.delete("/:id/unenroll-user/:userId", protect, unenrollUserFromCourse);
router.get("/:id/enrolled-users", protect, getEnrolledUsersForCourse);

// =====================================================
// GENERIC CRUD ROUTES
// =====================================================
router.put("/:id", protect, imageUpload.single("image"), editCourse);
router.get("/:id", protect, getCourseById);
router.delete("/:id", protect, deleteCourseById);
router.put("/:id/update", protect, updateCourse);

// ⭐ NEW: Acknowledge Disclaimer
router.put("/:id/acknowledge-disclaimer", protect, acknowledgeDisclaimer);

module.exports = router;
