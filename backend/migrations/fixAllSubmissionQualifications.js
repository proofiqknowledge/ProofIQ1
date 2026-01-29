/**
 * ONE-TIME DATA MIGRATION: Fix qualified field for ALL exam submissions
 * This ensures all historical submissions have correct qualification status
 * based on their percentage score and exam's qualification threshold
 */
const mongoose = require('mongoose');
require('dotenv').config();

const ExamSubmission = require('../models/ExamSubmission');
const Exam = require('../models/Exam');
const { applyQualificationAndGrade } = require('../utils/examGrading');

async function migrateAllSubmissionQualifications() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find ALL submissions
        const submissions = await ExamSubmission.find({});
        console.log(`📊 Found ${submissions.length} total submissions\n`);

        let updated = 0;
        let errors = 0;

        for (const submission of submissions) {
            try {
                const exam = await Exam.findById(submission.exam);

                console.log(`Processing submission ${submission._id}:`);
                console.log(`  Assessment: ${exam ? exam.title : 'NOT FOUND'}`);
                console.log(`  Current: ${submission.percentageScore}%, qualified=${submission.qualified}, grade=${submission.grade}`);

                // Apply the grading logic (this sets both grade and qualified)
                await applyQualificationAndGrade(submission);

                // Save the updated submission
                await submission.save();

                console.log(`  Updated: ${submission.percentageScore}%, qualified=${submission.qualified}, grade=${submission.grade} ✅\n`);
                updated++;
            } catch (err) {
                console.error(`  ❌ Error processing submission ${submission._id}:`, err.message);
                errors++;
            }
        }

        console.log(`\n🎉 Migration complete!`);
        console.log(`  ✅ Updated: ${updated} submissions`);
        console.log(`  ❌ Errors: ${errors} submissions`);

        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration
console.log('🚀 Starting submission qualification migration...\n');
migrateAllSubmissionQualifications();
