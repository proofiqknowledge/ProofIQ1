const mongoose = require("mongoose");
require("dotenv").config();

const Course = require("../models/Course");

async function resetAllCourseWeeks() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all courses first
    const allCourses = await Course.find();
    console.log(`📚 Found ${allCourses.length} courses to reset`);

    // COMPLETELY replace weeks for every course
    for (let course of allCourses) {
      course.weeks = [];
      
      // Create 4 weeks with 5 days each
      for (let w = 1; w <= 4; w++) {
        const week = {
          weekNumber: w,
          days: []
        };
        
        // Create 5 days in each week
        for (let d = 1; d <= 5; d++) {
          week.days.push({
            dayNumber: d,
            overview: "",
            videoUrl: null,
            documentUrl: null
          });
        }
        
        course.weeks.push(week);
      }
      
      await course.save();
      console.log(`  ✅ Updated: ${course.title} (${course.weeks.length} weeks)`);
    }

    console.log(`\n✅ Successfully reset all ${allCourses.length} courses!`);
    
    // Verify
    const updated = await Course.findOne().select("title weeks");
    console.log(`\n📝 Sample verification:`);
    console.log(`   Course: ${updated.title}`);
    console.log(`   Weeks: ${updated.weeks.length}`);
    console.log(`   Week 1 Days: ${updated.weeks[0]?.days.length}`);
    
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

resetAllCourseWeeks();
