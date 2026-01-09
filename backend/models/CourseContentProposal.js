const mongoose = require("mongoose");

const courseContentProposalSchema = new mongoose.Schema({
  trainer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  week: { type: Number },
  day: { type: Number },
  title: { type: String },
  overview: { type: String },
  videos: [{ type: String }],
  documents: [{ type: String }],
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CourseContentProposal", courseContentProposalSchema);
