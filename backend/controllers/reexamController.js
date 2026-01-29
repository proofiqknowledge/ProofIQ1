const ReExamRequest = require('../models/ReExamRequest');
const ExamSubmission = require('../models/ExamSubmission');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');

/**
 * @desc Create a re-exam request for a student
 * @route POST /api/reexam/request
 * @access Private (Student)
 */
exports.createRequest = async (req, res) => {
  try {
    const { studentId, studentName, employeeId, examId, examName, writtenAtDate, writtenAtTime, presentMarks, reason } = req.body;

    // Validate required fields
    if (!studentId || !examId || !reason) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // ✅ FIX: Only block if there's a PENDING request (not approved/completed)
    // This allows students to request again after completing their re-exam
    const existingPendingRequest = await ReExamRequest.findOne({
      studentId,
      examId,
      status: 'pending',
    });

    if (existingPendingRequest) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending re-exam request for this exam. Please wait for admin approval.',
      });
    }

    // Count how many times this student has requested re-exam for this exam
    const attemptCount = await ReExamRequest.countDocuments({
      studentId,
      examId,
    });

    const attemptNumber = attemptCount + 1;  // This will be their Nth attempt

    // Combine date and time
    const writtenAtDateTime = writtenAtDate && writtenAtTime
      ? new Date(`${writtenAtDate}T${writtenAtTime}`)
      : new Date();

    const reExamRequest = await ReExamRequest.create({
      studentId,
      studentName,
      employeeId,
      examId,
      examName,
      writtenAt: writtenAtDateTime,
      marks: presentMarks,
      reason,
      status: 'pending',
      attemptNumber: attemptNumber,  // ✅ Track which attempt this is
    });

    res.status(201).json({
      success: true,
      message: 'Re-exam request submitted successfully',
      data: reExamRequest,
    });
  } catch (error) {
    console.error('Error creating re-exam request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create re-exam request',
      error: error.message,
    });
  }
};

/**
 * @desc Get all re-exam requests (Admin only)
 * @route GET /api/reexam/all
 * @access Private (Admin)
 */
exports.getAllRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = status ? { status } : {};

    const requests = await ReExamRequest.find(filter)
      .populate('studentId', 'name email')
      .populate('examId', 'title')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ requestedAt: -1 });

    const total = await ReExamRequest.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching re-exam requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch re-exam requests',
      error: error.message,
    });
  }
};

/**
 * @desc Get re-exam request by ID
 * @route GET /api/reexam/:id
 * @access Private (Admin)
 */
exports.getRequestById = async (req, res) => {
  try {
    const request = await ReExamRequest.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('examId', 'title');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error('Error fetching re-exam request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch re-exam request',
      error: error.message,
    });
  }
};

/**
 * @desc Approve a re-exam request and enable the exam for the student
 * @route PATCH /api/reexam/approve/:id
 * @access Private (Admin)
 */
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await ReExamRequest.findByIdAndUpdate(
      id,
      { status: 'approved' },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Delete previous submission to allow re-attempt
    await ExamSubmission.deleteOne({
      exam: request.examId,
      student: request.studentId,
    }).catch((err) => {
      console.warn('Warning: Could not delete previous submission:', err.message);
    });

    // 2. ✅ FIX: Also delete legacy ExamResult (Dashboard Source)
    // We need to fetch the exam first to get courseId and weekNumber
    const exam = await Exam.findById(request.examId);
    if (exam) {
      await ExamResult.deleteMany({
        user: request.studentId,
        course: exam.courseId,
        $or: [
          { module: exam.weekNumber },
          { week: exam.weekNumber } // Handle potential legacy field name
        ]
      }).catch(err => {
        console.warn('Warning: Could not delete legacy ExamResult:', err.message);
      });
      console.log(`[ReExam] Cleared legacy results for student ${request.studentId} exam ${request.examId}`);
    }

    res.status(200).json({
      success: true,
      message: 'Re-exam request approved. Exam re-enabled for student.',
      data: request,
    });
  } catch (error) {
    console.error('Error approving re-exam request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve re-exam request',
      error: error.message,
    });
  }
};

/**
 * @desc Reject a re-exam request
 * @route PATCH /api/reexam/reject/:id
 * @access Private (Admin)
 */
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await ReExamRequest.findByIdAndUpdate(
      id,
      { status: 'rejected' },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Re-exam request rejected.',
      data: request,
    });
  } catch (error) {
    console.error('Error rejecting re-exam request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject re-exam request',
      error: error.message,
    });
  }
};

/**
 * @desc Get re-exam request status for a specific student and exam
 * @route GET /api/reexam/status/:studentId/:examId
 * @access Private (Student/Admin)
 */
exports.getRequestStatus = async (req, res) => {
  try {
    const { studentId, examId } = req.params;

    const request = await ReExamRequest.findOne({
      studentId,
      examId,
    });

    if (!request) {
      return res.status(200).json({
        success: true,
        data: null,
        hasRequest: false,
      });
    }

    res.status(200).json({
      success: true,
      data: request,
      hasRequest: true,
      status: request.status,
    });
  } catch (error) {
    console.error('Error fetching request status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch request status',
      error: error.message,
    });
  }
};
