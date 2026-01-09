const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  module: { type: Number }, // if null/undefined, for final exam
  score: { type: Number },
  totalQuestions: { type: Number },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedOption: String,
    correct: Boolean,
  }],
  passed: { type: Boolean },
  grade: { type: String }, // RAG Grade: Green, Amber, Red
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ExamResult', examResultSchema);
