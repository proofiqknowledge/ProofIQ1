const mongoose = require('mongoose');
require('dotenv').config();
const Exam = require('../models/Exam');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const exams = await Exam.find({}, 'title courseId weekNumber isInModule');
    console.log('All exams:');
    exams.forEach(e => {
      const coursePart = e.courseId ? `courseId=${e.courseId}` : 'no courseId';
      const weekPart = e.weekNumber !== null && e.weekNumber !== undefined ? `weekNumber=${e.weekNumber}` : 'no weekNumber';
      console.log(`- "${e.title}" | ${coursePart}, ${weekPart}, isInModule=${e.isInModule}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
