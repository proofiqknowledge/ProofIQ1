// backend/routes/adminBlogRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware'); // ensure isAdmin or isTrainer

const {
  getPendingBlogs,
  getBlogById,
  approveBlog,
  rejectBlog,
  deleteBlog
} = require('../controllers/blogController');

router.get('/pending', auth, roleMiddleware.isAdmin, getPendingBlogs);
router.get('/:id', auth, roleMiddleware.isAdmin, getBlogById);
router.post('/:id/approve', auth, roleMiddleware.isAdmin, approveBlog);
router.post('/:id/reject', auth, roleMiddleware.isAdmin, rejectBlog);
router.delete('/:id', auth, roleMiddleware.isAdmin, deleteBlog);

module.exports = router;
