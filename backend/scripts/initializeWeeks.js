const mongoose = require("mongoose");
require("dotenv").config();

const Course = require("../models/Course");

async function initializeWeeks() {
  try {
    // ✅ Use MONGO_URI from .env (not hardcoded localhost!)
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error("❌ MONGO_URI not found in .env");
      process.exit(1);
    }

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Update all courses that don't have weeks
    const result = await Course.updateMany(
      { weeks: { $exists: false } },
      {
        $set: {
          weeks: [
            {
              weekNumber: 1,
              days: [
                { dayNumber: 1, overview: "", videoUrl: null, documentUrl: null },
                { dayNumber: 2, overview: "", videoUrl: null, documentUrl: null },
                { dayNumber: 3, overview: "", videoUrl: null, documentUrl: null },
                { dayNumber: 4, overview: "", videoUrl: null, documentUrl: null },
                { dayNumber: 5, overview: "", videoUrl: null, documentUrl: null }
              ]
            }
          ]
        }
      }
    );

    console.log(`✅ Successfully updated ${result.modifiedCount} courses`);
    console.log(`📊 Matched: ${result.matchedCount} courses`);
    
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

initializeWeeks();
