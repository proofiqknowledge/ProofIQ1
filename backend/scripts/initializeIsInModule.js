const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Exam = require('../models/Exam');

async function initializeIsInModule() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Find all exams that either:
    // 1. Don't have isInModule field, OR
    // 2. Have isInModule but need to set it based on courseId+weekNumber
    const allExams = await Exam.find({});
    console.log(`Total exams: ${allExams.length}`);

    let updated = 0;
    
    for (const exam of allExams) {
      // Determine if this should be a module exam
      const isModuleExam = !!(exam.courseId && exam.weekNumber !== null && exam.weekNumber !== undefined && exam.weekNumber !== '');
      
      // Update if not already set correctly
      if (exam.isInModule !== isModuleExam) {
        await Exam.updateOne(
          { _id: exam._id },
          { $set: { isInModule: isModuleExam } }
        );
        console.log(`Updated exam ${exam._id}: isInModule = ${isModuleExam}`);
        updated++;
      }
    }

    console.log(`\nMigration complete: ${updated} exams updated`);
    
    // Show summary
    const moduleExams = await Exam.countDocuments({ isInModule: true });
    const normalExams = await Exam.countDocuments({ isInModule: false });
    console.log(`Module assessments (3 attempts): ${moduleExams}`);
    console.log(`Normal assessments (1 attempt): ${normalExams}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

initializeIsInModule();
