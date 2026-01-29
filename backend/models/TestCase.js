// backend/models/TestCase.js
const mongoose = require('mongoose');

const TestCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    required: true
  },

  expectedOutput: {
    type: String,
    required: true
  },

  isHidden: {
    type: Boolean,
    default: false // false → visible sample testcase; true → hidden testcase
  },

  description: {
    type: String,
    default: "" // optional explanation (admin only)
  },

  // Optional execution constraints (future use)
  timeLimit: {
    type: Number,
    default: 2 // seconds
  },

  memoryLimit: {
    type: Number,
    default: 128 // MB
  },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("TestCase", TestCaseSchema);
