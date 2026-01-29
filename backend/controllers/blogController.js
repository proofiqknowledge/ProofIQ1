const Blog = require('../models/Blog');
const BlogAudit = require('../models/BlogAudit');
const notificationController = require('./notificationController');
const path = require('path');
const fs = require('fs');

exports.createBlog = async (req, res) => {
  try {
    console.log('📝 CreateBlog - req.body:', req.body);
    console.log('📝 CreateBlog - req.files:', req.files);

    // Must have req.user set by auth middleware
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { title, body } = req.body;

    // Format author name to include employee ID
    let authorName = user.name || user.email || 'Unknown';
    if (user.employeeId) {
      authorName = `${user.name || user.email} (${user.employeeId})`;
    }

    const blogData = {
      title,
      body,
      author: user.id,
      authorName: authorName,
      authorImage: user.avatar || user.profileImage || ''
    };

    if (req.files) {
      if (req.files.video && req.files.video[0]) {
        blogData.video = {
          id: req.files.video[0].id,
          filename: req.files.video[0].filename
        };
      }
      if (req.files.images) {
        blogData.images = req.files.images.map(file => ({
          id: file.id,
          filename: file.filename
        }));
      }
    }

    const blog = new Blog(blogData);
    await blog.save();

    const mappedBlog = mapBlogFiles(blog);
    return res.status(201).json({ success: true, blog: mappedBlog });
  } catch (err) {
    console.error('❌ createBlog error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const mapBlogFiles = (blog) => {
  const b = blog.toObject();

  // Map video
  if (b.video && b.video.filename) {
    b.video = `/api/blogs/file/${b.video.filename}`;
  } else if (typeof b.video === 'string') {
    // Legacy support
    b.video = b.video;
  }

  // Map images
  if (b.images && Array.isArray(b.images)) {
    b.images = b.images.map(img => {
      if (img && img.filename) {
        return `/api/blogs/file/${img.filename}`;
      } else if (typeof img === 'string') {
        // Legacy support
        return img;
      }
      return img;
    });
  }

  b.views = blog.viewedBy ? blog.viewedBy.length : 0;
  return b;
};

exports.getApprovedBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(50);

    // Map to include views count from viewedBy length
    const blogsWithViews = blogs.map(blog => {
      const b = blog.toObject();
      b.views = blog.viewedBy ? blog.viewedBy.length : 0;
      return b;
    });

    res.json({ blogs: blogsWithViews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyBlogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const blogs = await Blog.find({ author: userId }).sort({ createdAt: -1 });
    const blogsWithViews = blogs.map(mapBlogFiles);
    res.json({ blogs: blogsWithViews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Not found' });

    // Track unique view - only add user if they haven't viewed before
    const userId = req.user.id;
    if (!blog.viewedBy.includes(userId)) {
      blog.viewedBy.push(userId);
      await blog.save();
    }

    const blogData = mapBlogFiles(blog);
    res.json({ blog: blogData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update blog (trainee) - allowed only in draft, rejected, or changes_requested
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Not found' });

    // Only author can update
    if (blog.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own blog' });
    }

    // Allow edits only in specific statuses (include 'pending' to allow author edits while under review)
    if (!['draft', 'rejected', 'changes_requested', 'pending'].includes(blog.status)) {
      return res.status(400).json({ message: 'Blog cannot be edited in its current status' });
    }

    // Save previous snapshot for audit/versioning
    const previous = {
      title: blog.title,
      body: blog.body,
      images: blog.images ? blog.images.slice() : [],
      video: blog.video || null,
      status: blog.status
    };

    // Update fields
    const { title, body, tags } = req.body;
    if (title) blog.title = title;
    if (body) blog.body = body;
    if (tags) blog.tags = tags;

    if (req.files) {
      if (req.files.video && req.files.video[0]) {
        blog.video = { id: req.files.video[0].id, filename: req.files.video[0].filename };
      }
      if (req.files.images) {
        blog.images = req.files.images.map(file => ({ id: file.id, filename: file.filename }));
      }
    }

    // Push to versions list for history
    blog.versions = blog.versions || [];
    blog.versions.push({
      title: previous.title,
      body: previous.body,
      images: previous.images,
      video: previous.video,
      editedBy: req.user.id,
      createdAt: new Date(),
      note: 'Edited and submitted for approval'
    });

    // Set to pending for re-review and clear reject reason
    blog.status = 'pending';
    // Record last edited time for master/admin visibility
    blog.lastEditedAt = new Date();
    blog.rejectReason = undefined;

    await blog.save();

    // Audit entry
    await BlogAudit.create({
      blog: blog._id,
      action: 'submitted',
      performedBy: req.user.id,
      previousContent: previous,
      newContent: { title: blog.title, body: blog.body, images: blog.images, video: blog.video, status: blog.status }
    });

    // Trigger notification to author confirming submission
    try {
      await notificationController.createNotification(req.user.id, 'Blog submitted', 'Your blog has been submitted for approval', 'blog_submitted', { relatedId: blog._id, relatedType: 'proposal' });
    } catch (nerr) {
      console.error('Notification error:', nerr);
    }

    const mapped = mapBlogFiles(blog);
    return res.json({ success: true, message: 'Blog updated and submitted for approval', blog: mapped });
  } catch (err) {
    console.error('❌ updateBlog error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.likeBlog = async (req, res) => {
  try {
    const userId = req.user.id;
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Not found' });

    const idx = blog.likes.findIndex(id => id.toString() === userId);
    if (idx === -1) {
      blog.likes.push(userId);
    } else {
      blog.likes.splice(idx, 1); // toggle
    }
    await blog.save();
    res.json({ likesCount: blog.likes.length, liked: idx === -1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.commentBlog = async (req, res) => {
  try {
    const user = req.user;
    const { text } = req.body;
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Not found' });

    blog.comments.push({ userId: user.id, userName: user.name || user.email, text });
    await blog.save();
    res.json({ comments: blog.comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin
exports.getPendingBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'pending' }).sort({ createdAt: 1 });
    const blogsWithViews = blogs.map(mapBlogFiles);
    res.json({ requests: blogsWithViews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.approveBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Not found' });
    // Only pending blogs can be approved
    if (blog.status !== 'pending') return res.status(400).json({ message: 'Only pending blogs can be approved' });
    // Preserve previous approvedVersion (for safety keep last approved copy)
    const previousApproved = blog.approvedVersion ? { ...blog.approvedVersion } : null;

    // Save snapshot before approving
    const previousContent = {
      title: blog.title,
      body: blog.body,
      images: blog.images ? blog.images.slice() : [],
      video: blog.video || null,
      status: blog.status
    };

    blog.status = 'approved';
    blog.rejectReason = undefined;
    blog.approvedVersion = {
      title: blog.title,
      body: blog.body,
      images: blog.images || [],
      video: blog.video || null,
      approvedAt: new Date(),
      approvedBy: req.user.id
    };

    // Award points automatically on approval if not already claimed
    try {
      if (!blog.pointsClaimed) {
        const User = require('../models/User');
        const author = await User.findById(blog.author);
        if (author) {
          author.rewardPoints = (author.rewardPoints || 0) + 50; // award 50 points
          await author.save();
          blog.pointsClaimed = true;
        }
      }
    } catch (perr) {
      console.error('[approveBlog] awarding points failed:', perr);
    }

    await blog.save();

    // Audit
    await BlogAudit.create({
      blog: blog._id,
      action: 'approved',
      performedBy: req.user.id,
      previousContent: previousContent,
      newContent: { title: blog.title, body: blog.body, images: blog.images, video: blog.video, status: blog.status }
    });

    // Notify author (include points info when awarded)
    try {
      const msg = blog.pointsClaimed ? 'Your blog has been approved and 50 reward points have been added to your account' : 'Your blog has been approved and published';
      await notificationController.createNotification(blog.author, 'Blog approved', msg, 'blog_approved', { relatedId: blog._id });
    } catch (nerr) { console.error('Notification error:', nerr); }

    res.json({ message: 'Blog approved', blog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.rejectBlog = async (req, res) => {
  try {
    const { reason } = req.body;
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Not found' });
    // Only pending blogs can be rejected
    if (blog.status !== 'pending') return res.status(400).json({ message: 'Only pending blogs can be rejected' });
    const previousContent = {
      title: blog.title,
      body: blog.body,
      images: blog.images ? blog.images.slice() : [],
      video: blog.video || null,
      status: blog.status
    };

    blog.status = 'rejected';
    blog.rejectReason = reason || 'Rejected by admin';
    await blog.save();

    await BlogAudit.create({
      blog: blog._id,
      action: 'rejected',
      performedBy: req.user.id,
      previousContent: previousContent,
      newContent: { title: blog.title, body: blog.body, images: blog.images, video: blog.video, status: blog.status },
      note: blog.rejectReason
    });

    try {
      await notificationController.createNotification(blog.author, 'Blog rejected', `Your blog was rejected: ${blog.rejectReason}`, 'blog_rejected', { relatedId: blog._id });
    } catch (nerr) { console.error('Notification error:', nerr); }

    res.json({ message: 'Blog rejected', blog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin requests changes instead of outright rejection
exports.requestChanges = async (req, res) => {
  try {
    const { reason } = req.body;
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Not found' });

    // Only pending blogs can have change requests
    if (blog.status !== 'pending') return res.status(400).json({ message: 'Only pending blogs can be marked as changes_requested' });

    const previousContent = {
      title: blog.title,
      body: blog.body,
      images: blog.images ? blog.images.slice() : [],
      video: blog.video || null,
      status: blog.status
    };

    blog.status = 'changes_requested';
    blog.rejectReason = reason || 'Changes requested by admin';
    await blog.save();

    await BlogAudit.create({
      blog: blog._id,
      action: 'requested_changes',
      performedBy: req.user.id,
      previousContent: previousContent,
      newContent: { title: blog.title, body: blog.body, images: blog.images, video: blog.video, status: blog.status },
      note: blog.rejectReason
    });

    try {
      await notificationController.createNotification(blog.author, 'Changes requested', `Admin requested changes: ${blog.rejectReason}`, 'blog_rejected', { relatedId: blog._id });
    } catch (nerr) { console.error('Notification error:', nerr); }

    res.json({ message: 'Requested changes for blog', blog });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Not found' });

    // If points were claimed, deduct them from the user
    if (blog.pointsClaimed) {
      const User = require('../models/User');
      const author = await User.findById(blog.author);
      if (author) {
        author.rewardPoints = Math.max(0, (author.rewardPoints || 0) - 50); // Deduct 50 points
        await author.save();
        console.log(`[deleteBlog] Deducted 50 points from user ${author.name} (${author._id})`);
      }
    }

    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// User deletes their own blog
exports.deleteMyBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: 'Blog not found' });

    // Check if the user is the author
    if (blog.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own blogs' });
    }

    // If points were claimed, deduct them from the user
    if (blog.pointsClaimed) {
      const User = require('../models/User');
      const author = await User.findById(blog.author);
      if (author) {
        author.rewardPoints = Math.max(0, (author.rewardPoints || 0) - 50); // Deduct 50 points
        await author.save();
        console.log(`[deleteMyBlog] Deducted 50 points from user ${author.name} (${author._id})`);
      }
    }

    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Claim reward points endpoint is deprecated/disabled. Points are awarded automatically on approval.
exports.claimBlogPoints = async (req, res) => {
  return res.status(400).json({ message: 'Manual points claiming has been disabled. Points are awarded automatically when a blog is approved.' });
};
