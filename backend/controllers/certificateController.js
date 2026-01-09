const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Course = require('../models/Course');

// Student or admin: download certificate if eligible
exports.downloadCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = ['Admin', 'Master'].includes(req.user.role) ? req.params.userId : req.user.id;
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);
    if (!user || !course) return res.status(404).json({ message: 'User or course not found' });
    const enrolled = user.enrolledCourses.find(ec => ec.courseId && ec.courseId.toString() === courseId);
    if (!enrolled || !course.modules) return res.status(400).json({ message: 'Not enrolled or course data error' });
    const totalmodules = course.modules.length;
    const completed = (enrolled.completedmodules || []).length;
    if (completed < totalmodules) {
      return res.status(403).json({ message: 'Course not completed. Certificate not available.' });
    }
    // Generate certificate PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${user.name}-${course.title}.pdf"`);
    doc.fontSize(22).text('Certificate of Completion', { align: 'center' });
    doc.moveDown()
      .fontSize(16)
      .text(`This certifies that`, { align: 'center' })
      .moveDown()
      .font('Helvetica-Bold').fontSize(28).text(user.name, { align: 'center' })
      .moveDown()
      .font('Helvetica').fontSize(16).text(`has successfully completed the course`, { align: 'center' })
      .moveDown()
      .font('Helvetica-Bold').fontSize(22).text(course.title, { align: 'center' })
      .moveDown(2);
    doc.fontSize(14).text(`Completed on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    // Optional: Show reward badge
    if (user.rewardPoints >= 100) {
      doc.moveDown()
        .font('Helvetica-Bold').fontSize(18)
        .fillColor('orange').text('🏅 100 Reward Points Badge!', { align: 'center' }).fillColor('black');
    }
    doc.moveDown(4);
    doc.fontSize(12).text('PeopleTech LMS Platform', { align: 'center', baseline: 'bottom' });
    doc.end();
    doc.pipe(res);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
