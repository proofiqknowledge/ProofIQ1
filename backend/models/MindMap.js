const mongoose = require("mongoose");

const mindMapSchema = new mongoose.Schema({
  topic: String,
  userId: String,
  map: Object,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("MindMap", mindMapSchema);
