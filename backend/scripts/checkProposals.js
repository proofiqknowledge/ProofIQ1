const mongoose = require('mongoose');
require('dotenv').config();

const CourseContentProposal = require('../models/CourseContentProposal');

async function checkProposals() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lms');
    console.log('✅ Connected to MongoDB');

    const proposals = await CourseContentProposal.find()
      .populate('trainer', 'name email role')
      .populate('course', 'title');

    console.log(`\n📋 Total Proposals: ${proposals.length}\n`);
    proposals.forEach((p, i) => {
      console.log(`${i + 1}. Title: ${p.title}`);
      console.log(`   Trainer: ${p.trainer?.name || 'N/A'} (${p.trainer?._id || 'N/A'})`);
      console.log(`   Course: ${p.course?.title || 'N/A'}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Week/Day: ${p.week || 'N/A'}/${p.day || 'N/A'}`);
      console.log(`   Documents: ${p.documents?.length || 0}`);
      console.log(`   Created: ${p.createdAt}\n`);
    });

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkProposals();
