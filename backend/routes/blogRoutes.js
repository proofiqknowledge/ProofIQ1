const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const {
  createBlog, getApprovedBlogs, getMyBlogs, getBlogById, likeBlog, commentBlog,
  getPendingBlogs, approveBlog, rejectBlog, deleteMyBlog, claimBlogPoints,
  updateBlog, requestChanges
} = require('../controllers/blogController');

// GridFS Storage Configuration
const storage = new GridFsStorage({
  url: process.env.MONGO_URI || "mongodb://localhost:27017/peopletech-lms",
  file: (req, file) => {
    return {
      filename: `blog-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`,
      bucketName: 'blogImages' // Match the bucket name in server.js
    };
  }
});

const upload = multer({ storage });

// Student create blog
router.post('/create', auth, upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]), createBlog);

// Get lists
router.get('/approved', auth, getApprovedBlogs);
router.get('/my', auth, getMyBlogs);
router.get('/:id', auth, getBlogById);

// Update a blog (author) - multipart support
router.put('/:id', auth, upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'video', maxCount: 1 }
]), updateBlog);

// Stream file from GridFS
router.get('/file/:filename', async (req, res) => {
  try {
    const gfs = global.blogGfsBucket;
    if (!gfs) {
      return res.status(500).json({ message: 'GridFS not initialized' });
    }

    const file = await gfs.find({ filename: req.params.filename }).toArray();
    if (!file || file.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const readStream = gfs.openDownloadStreamByName(req.params.filename);
    readStream.pipe(res);
  } catch (err) {
    console.error('File stream error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// actions
router.post('/:id/like', auth, likeBlog);
router.post('/:id/comment', auth, commentBlog);
router.post('/:id/claim-points', auth, claimBlogPoints);

// User delete their own blog
router.delete('/:id', auth, deleteMyBlog);

// Admin endpoints
router.get('/admin/pending', auth, roleMiddleware.isAdmin, getPendingBlogs);
router.post('/admin/:id/approve', auth, roleMiddleware.isAdmin, approveBlog);
router.post('/admin/:id/reject', auth, roleMiddleware.isAdmin, rejectBlog);
router.post('/admin/:id/request-changes', auth, roleMiddleware.isAdmin, requestChanges);

module.exports = router;
