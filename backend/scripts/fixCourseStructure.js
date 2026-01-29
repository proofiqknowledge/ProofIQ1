const mongoose = require("mongoose");
require("dotenv").config();

const Course = require("../models/Course");

async function fixCourseStructure() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Fix ALL courses with proper weeks structure
    const result = await Course.updateMany(
      {},
      [
        {
          $set: {
            weeks: {
              $cond: [
                { $eq: [{ $type: "$weeks" }, "array"] },
                "$weeks",
                [
                  {
                    weekNumber: 1,
                    days: [
                      { dayNumber: 1, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 2, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 3, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 4, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 5, overview: "", videoUrl: null, documentUrl: null }
                    ]
                  },
                  {
                    weekNumber: 2,
                    days: [
                      { dayNumber: 1, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 2, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 3, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 4, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 5, overview: "", videoUrl: null, documentUrl: null }
                    ]
                  },
                  {
                    weekNumber: 3,
                    days: [
                      { dayNumber: 1, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 2, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 3, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 4, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 5, overview: "", videoUrl: null, documentUrl: null }
                    ]
                  },
                  {
                    weekNumber: 4,
                    days: [
                      { dayNumber: 1, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 2, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 3, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 4, overview: "", videoUrl: null, documentUrl: null },
                      { dayNumber: 5, overview: "", videoUrl: null, documentUrl: null }
                    ]
                  }
                ]
              ]
            }
          }
        }
      ]
    );

    console.log(`✅ Successfully fixed ${result.modifiedCount} courses`);
    
    // Verify
    const courses = await Course.find().select("title weeks");
    console.log(`\n📚 Sample courses:`);
    courses.slice(0, 3).forEach(course => {
      console.log(`  - ${course.title}: ${course.weeks?.length || 0} weeks`);
    });
    
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

fixCourseStructure();
