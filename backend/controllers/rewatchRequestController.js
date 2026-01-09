const RewatchRequest = require("../models/RewatchRequest");
const User = require("../models/User");
const Course = require("../models/Course");


// 📌 Student requests rewatch access
exports.requestRewatch = async (req, res) => {
  try {
    const { courseId, weekNumber, dayNumber, reason } = req.body || {};
    const userId = req.user?.id || req.user?._id;

    // Diagnostic logging to help debug 500 errors seen in the UI
    console.log('[requestRewatch] called with', {
      userIdFromReqUser: req.user && (req.user.id || req.user._id),
      role: req.user && req.user.role,
      payload: { courseId, weekNumber, dayNumber, reason }
    });

    // Validate required fields early and return a 400 if missing (avoid Mongoose 500)
    if (!courseId || typeof weekNumber === 'undefined' || typeof dayNumber === 'undefined') {
      return res.status(400).json({ message: 'Missing required fields: courseId, weekNumber, dayNumber' });
    }

    // Check if already requested and pending
    const existing = await RewatchRequest.findOne({
      userId,
      courseId,
      weekNumber,
      dayNumber,
      status: "pending"
    });

    if (existing) {
      return res.status(400).json({ message: "You already requested rewatch access. Please wait for approval." });
    }

    const reqObj = await RewatchRequest.create({
      userId,
      courseId,
      weekNumber,
      dayNumber,
      reason: reason || '',
      status: "pending"
    });

    // Send notifications to relevant trainers and admins
    try {
      const { createNotification } = require('../controllers/notificationController');

      // Fetch student, course and batch (if any)
      const student = await User.findById(userId).select('name email batch');
      const course = await Course.findById(courseId).select('title trainer assignedTrainers');

      const recipientIds = new Set();

      // Course trainer
      if (course) {
        if (course.trainer) recipientIds.add(String(course.trainer));
        if (Array.isArray(course.assignedTrainers)) {
          course.assignedTrainers.forEach(t => recipientIds.add(String(t)));
        }
      }

      // Batch trainer (if student has a batch)
      if (student && student.batch) {
        const Batch = require('../models/Batch');
        const batch = await Batch.findById(student.batch).select('trainer name');
        if (batch && batch.trainer) recipientIds.add(String(batch.trainer));
      }

      // All admins
      const admins = await User.find({ role: 'Admin' }).select('_id');
      admins.forEach(a => recipientIds.add(String(a._id)));

      // Remove the student from recipients (don't notify self)
      recipientIds.delete(String(userId));

      const title = 'Rewatch Request Submitted';
      const studentName = student?.name || 'A student';
      const courseTitle = course?.title || 'a course';
      const message = `${studentName} has requested to rewatch lesson Week ${weekNumber} • Day ${dayNumber} of "${courseTitle}".`;

      const notifyPromises = Array.from(recipientIds).map(uid =>
        createNotification(uid, title, message, 'info', { relatedId: reqObj._id, relatedType: 'rewatchRequest' })
      );

      await Promise.all(notifyPromises);
      console.log(`[requestRewatch] Notifications sent to ${notifyPromises.length} recipient(s)`);
    } catch (notifyErr) {
      console.error('[requestRewatch] Notification error:', notifyErr);
    }

    res.json({
      message: "Rewatch request submitted successfully.",
      request: reqObj
    });

  } catch (err) {
    console.error("requestRewatch error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// 📌 Get pending requests — Admin + Trainer only
exports.getPendingRequests = async (req, res) => {
  try {
    const user = req.user;

    let filter = { status: "pending" };

    // Trainers can only see requests from students in their batch
    if (user.role === "Trainer") {
      filter = {
        status: "pending",
        approvedBy: null
      };
    }

    const requests = await RewatchRequest.find(filter)
      .populate("userId", "name email employeeId batch")
      .populate("courseId", "title")
      .sort({ createdAt: -1 });

    // Populate batch names
    const Batch = require('../models/Batch');
    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        const obj = req.toObject();

        // Add friendly field names
        obj.studentName = obj.userId?.name || "Unknown Student";
        obj.studentEmail = obj.userId?.email || "";
        obj.employeeId = obj.userId?.employeeId || "N/A";
        obj.courseName = obj.courseId?.title || "Unknown Course";

        // Fetch batch name if student has a batch
        if (obj.userId?.batch) {
          try {
            const batch = await Batch.findById(obj.userId.batch).select('name');
            obj.batchName = batch?.name || "N/A";
          } catch (err) {
            obj.batchName = "N/A";
          }
        } else {
          obj.batchName = "N/A";
        }

        return obj;
      })
    );

    res.json({ requests: enrichedRequests });

  } catch (err) {
    console.error("getPendingRequests error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// 📌 Approve request — Admin or Trainer
exports.approveRewatch = async (req, res) => {
  try {
    const requestId = req.params.id;
    const approverId = req.user.id;

    const reqObj = await RewatchRequest.findById(requestId);
    if (!reqObj) return res.status(404).json({ message: "Request not found" });

    if (reqObj.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    reqObj.status = "approved";
    reqObj.approvedAt = new Date();
    reqObj.approvedBy = approverId;
    await reqObj.save();

    res.json({ message: "Rewatch access approved", request: reqObj });

  } catch (err) {
    console.error("approveRewatch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// 📌 Reject request
exports.rejectRewatch = async (req, res) => {
  try {
    const requestId = req.params.id;
    const approverId = req.user.id;

    const reqObj = await RewatchRequest.findById(requestId);
    if (!reqObj) return res.status(404).json({ message: "Request not found" });

    if (reqObj.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    reqObj.status = "rejected";
    reqObj.approvedAt = new Date();
    reqObj.approvedBy = approverId;
    await reqObj.save();

    res.json({ message: "Rewatch request rejected", request: reqObj });

  } catch (err) {
    console.error("rejectRewatch error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark an approved rewatch request as used (consume it)
exports.consumeRewatch = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { courseId, weekNumber, dayNumber } = req.body || {};

    if (!courseId || typeof weekNumber === 'undefined' || typeof dayNumber === 'undefined') {
      return res.status(400).json({ message: 'Missing required fields: courseId, weekNumber, dayNumber' });
    }

    const reqObj = await RewatchRequest.findOneAndUpdate(
      {
        userId,
        courseId,
        weekNumber: Number(weekNumber),
        dayNumber: Number(dayNumber),
        status: 'approved'
      },
      { status: 'used', approvedAt: new Date() },
      { new: true }
    );

    if (!reqObj) {
      return res.status(404).json({ message: 'No approved rewatch request found to consume' });
    }

    res.json({ message: 'Rewatch request consumed', request: reqObj });
  } catch (err) {
    console.error('consumeRewatch error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
