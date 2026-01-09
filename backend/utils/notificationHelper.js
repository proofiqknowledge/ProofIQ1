const { createNotification } = require('../controllers/notificationController');
const User = require('../models/User');

/**
 * Notify trainer when their course proposal is reviewed
 */
exports.notifyProposalReview = async (proposal, status) => {
  try {
    if (!proposal.trainer) return;

    const title = status === 'accepted' ? '✅ Proposal Accepted' : '❌ Proposal Rejected';
    const message = `Your content proposal for "${proposal.course?.title || 'Course'}" has been ${status}`;
    const type = status === 'accepted' ? 'success' : 'warning';

    await createNotification(
      proposal.trainer._id || proposal.trainer,
      title,
      message,
      type,
      {
        relatedId: proposal._id,
        relatedType: 'proposal',
      }
    );
  } catch (error) {
    console.error('Error sending proposal review notification:', error);
  }
};

/**
 * Notify trainer when a course is assigned to them
 */
exports.notifyCourseAssigned = async (trainerId, courseName) => {
  try {
    await createNotification(
      trainerId,
      '📚 New Course Assigned',
      `You have been assigned to teach "${courseName}"`,
      'info'
    );
  } catch (error) {
    console.error('Error sending course assignment notification:', error);
  }
};

/**
 * Notify trainer when a batch is assigned to them
 */
exports.notifyBatchAssigned = async (trainerId, batchName) => {
  try {
    await createNotification(
      trainerId,
      '👥 New Batch Assigned',
      `You have been assigned to batch "${batchName}"`,
      'info'
    );
  } catch (error) {
    console.error('Error sending batch assignment notification:', error);
  }
};

/**
 * Notify student when they are added to a batch
 */
exports.notifyStudentAddedToBatch = async (studentId, batchName) => {
  try {
    await createNotification(
      studentId,
      '👥 Added to Batch',
      `You have been added to batch "${batchName}"`,
      'success'
    );
  } catch (error) {
    console.error('Error sending batch add notification:', error);
  }
};

/**
 * Notify students in a batch when a course is assigned
 */
exports.notifyBatchStudentsCourseAssigned = async (studentIds, courseName, batchName) => {
  try {
    const promises = studentIds.map(studentId =>
      createNotification(
        studentId,
        '📚 New Course Available',
        `Course "${courseName}" has been assigned to your batch "${batchName}"`,
        'info'
      )
    );
    await Promise.all(promises);
  } catch (error) {
    console.error('Error sending course assignment notification to students:', error);
  }
};

/**
 * Notify students about scheduled exam
 */
exports.notifyExamScheduled = async (studentIds, examName) => {
  try {
    const promises = studentIds.map(studentId =>
      createNotification(
        studentId,
        '📝 Assessment Scheduled',
        `Assessment "${examName}" has been scheduled for you`,
        'warning'
      )
    );
    await Promise.all(promises);
  } catch (error) {
    console.error('Error sending assessment notification:', error);
  }
};

/**
 * Notify trainer when assigned to a course
 */
exports.notifyTrainerCourseAssigned = async (trainerId, courseName) => {
  try {
    await createNotification(
      trainerId,
      '📚 Assigned to Course',
      `You have been assigned to the course "${courseName}"`,
      'success'
    );
  } catch (error) {
    console.error('Error sending trainer course assignment notification:', error);
  }
};

/**
 * Notify all admins that a trainer submitted a new content proposal
 */
exports.notifyAdminsOnProposal = async (proposal) => {
  try {
    // Find all admins
    const admins = await User.find({ role: 'Admin' }).select('_id name email');
    if (!admins || admins.length === 0) return;

    const title = '🆕 New Content Proposal';
    const trainerName = proposal.trainer?.name || '';
    const courseTitle = proposal.course?.title || 'Course';
    const message = `${trainerName ? trainerName + ' has' : 'A trainer has'} proposed content for "${courseTitle}"${proposal.title ? `: ${proposal.title}` : ''}`;

    const promises = admins.map(a =>
      createNotification(
        a._id,
        title,
        message,
        'info',
        { relatedId: proposal._id, relatedType: 'proposal' }
      )
    );

    await Promise.all(promises);
    console.log(`📢 Sent new proposal notifications to ${admins.length} admin(s)`);
  } catch (err) {
    console.error('Error notifying admins about new proposal:', err);
  }
};
