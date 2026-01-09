const mongoose = require('mongoose');
require('dotenv').config();
const Exam = require('../models/Exam');
const ExamSubmission = require('../models/ExamSubmission');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all exams
    const exams = await Exam.find({}).select('title isInModule courseId weekNumber published');
    console.log(`Found ${exams.length} exams:\n`);
    
    exams.forEach((exam, idx) => {
      const hasModule = exam.courseId && exam.weekNumber !== null && exam.weekNumber !== undefined;
      const maxAttempts = (exam.isInModule === true || hasModule) ? 3 : 1;
      console.log(`${idx + 1}. "${exam.title.substring(0, 30)}"`);
      console.log(`   isInModule: ${exam.isInModule}`);
      console.log(`   courseId: ${exam.courseId || 'null'}`);
      console.log(`   weekNumber: ${exam.weekNumber !== null && exam.weekNumber !== undefined ? exam.weekNumber : 'null'}`);
      console.log(`   → maxAttempts: ${maxAttempts}\n`);
    });

    // Check submissions for one module exam
    const moduleExam = exams.find(e => e.isInModule === true || (e.courseId && e.weekNumber !== null));
    if (moduleExam) {
      console.log(`\n📋 Checking submissions for: "${moduleExam.title}"`);
      const submissions = await ExamSubmission.find({ exam: moduleExam._id }).select('student attemptNumber status');
      console.log(`   Total submissions: ${submissions.length}`);
      submissions.slice(0, 5).forEach(s => {
        console.log(`   - Student: ${s.student}, Attempt: ${s.attemptNumber}, Status: ${s.status}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
