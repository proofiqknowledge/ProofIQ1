const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create upload directories if they don't exist
const baseDir = path.join(__dirname, "../uploads");
const videoDir = path.join(baseDir, "videos");
const docDir = path.join(baseDir, "documents");
const tempDir = path.join(baseDir, "temp");

[baseDir, videoDir, docDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for different file types
const getStorage = (destination) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, destination),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Video upload configuration
const videoUpload = multer({
  storage: getStorage(videoDir),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    files: 1 // Only allow 1 file
  },
  fileFilter: (req, file, cb) => {
    // Check mimetype
    if (!file.mimetype.startsWith('video/')) {
      return cb(new Error('Only video files are allowed'), false);
    }

    // Check file extension
    const validExtensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!validExtensions.includes(ext)) {
      return cb(new Error(`Invalid video format. Allowed formats: ${validExtensions.join(', ')}`), false);
    }

    cb(null, true);
  }
});

// Document upload configuration - CHANGED TO MEMORY STORAGE (for GridFS)
const documentUpload = multer({
  storage: multer.memoryStorage(), // Store in memory for GridFS upload
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  }
});

// ✅ Excel upload configuration - CHANGED TO MEMORY STORAGE
const excelUpload = multer({
  storage: multer.memoryStorage(), // ✅ Store in memory for buffer access
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return cb(new Error('Only Excel files are allowed'), false);
    }
    cb(null, true);
  }
});

const imageUpload = multer({
  storage: getStorage(path.join(__dirname, "../uploads/images")),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for images
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return cb(new Error('Only image files are allowed'), false);
    }

    // Also check MIME type
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File must be an image'), false);
    }

    cb(null, true);
  }
});

module.exports = {
  videoUpload,
  documentUpload,
  excelUpload,
  imageUpload
};
