const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ============================================
// 🗂 Ensure folders exist
// ============================================
const baseDir = path.join(__dirname, "../uploads");
const videoDir = path.join(baseDir, "videos");
const docDir = path.join(baseDir, "documents");
const imageDir = path.join(baseDir, "courses");
const tempDir = path.join(baseDir, "temp");

[baseDir, videoDir, docDir, imageDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ============================================
// ⚙️ Configure Multer storage (for videos, docs, images)
// ============================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on file type
    if (file.mimetype.startsWith("video/")) {
      cb(null, videoDir);
    } else if (file.mimetype.startsWith("image/")) {
      cb(null, imageDir);
    } else {
      cb(null, docDir);
    }
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
  },
});

// ============================================
// ✅ General upload handler (videos, docs, images)
// ============================================
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [
      // Videos
      ".mp4",
      ".mov",
      ".avi",
      ".webm",
      ".mkv",
      // Documents
      ".pdf",
      ".doc",
      ".docx",
      ".ppt",
      ".pptx",
      // Images
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
    ];
    if (!allowed.includes(ext)) {
      return cb(new Error("Unsupported file type"), false);
    }
    cb(null, true);
  },
});

// ============================================
// ✅ Excel file upload configuration - MEMORY STORAGE
// ============================================
const uploadExcel = multer({
  storage: multer.memoryStorage(), // ✅ Use memory storage for buffer access
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".xlsx", ".xls"];
    if (!allowed.includes(ext)) {
      return cb(new Error("Only Excel files are allowed"), false);
    }
    cb(null, true);
  },
});

// ============================================
// ✅ Video upload configuration
// ============================================
const uploadVideo = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files are allowed"), false);
    }
    cb(null, true);
  },
});

// ============================================
// ✅ Document upload configuration
// ============================================
const uploadDocument = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];
    if (!allowed.includes(ext)) {
      return cb(new Error("Unsupported document type"), false);
    }
    cb(null, true);
  },
});

// ============================================
// 📤 Export all upload handlers
// ============================================
module.exports = {
  upload,
  uploadExcel,
  uploadVideo,
  uploadDocument,
};
