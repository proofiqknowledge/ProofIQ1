const mongoose = require("mongoose");
require("dotenv").config();

async function testConnection() {
  try {
    console.log("🔌 Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Successfully connected to MongoDB!");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  }
}

testConnection();
