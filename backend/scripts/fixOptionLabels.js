// backend/scripts/fixOptionLabels.js
require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const Exam = require("../models/Exam");

async function run() {
  try {
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
      console.error("❌ ERROR: MONGO_URI is missing in .env");
      process.exit(1);
    }

    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✔ Connected to Atlas");
    console.log("🔧 Fixing missing optionLabel...");

    const exams = await Exam.find({});
    let fixedCount = 0;

    for (const exam of exams) {
      let updated = false;

      exam.questions.forEach((q) => {
        if (!q.options) return;

        q.options.forEach((opt, idx) => {
          if (!opt.optionLabel) {
            opt.optionLabel = String.fromCharCode(65 + idx); // A/B/C/D/E
            updated = true;
          }
        });
      });

      if (updated) {
        await exam.save();
        fixedCount++;
        console.log(`✔ Updated Assessment: ${exam._id}`);
      }
    }

    console.log(`🎉 DONE! Updated ${fixedCount} assessment(s).`);
    process.exit(0);
  } catch (err) {
    console.error("❌ ERROR:", err);
    process.exit(1);
  }
}

run();
