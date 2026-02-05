const mongoose = require('mongoose');

const studyGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    default: function () {
      return `Group ${new Date().getTime().toString().substr(-6)}`;
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: false // Made optional to support cross-batch or non-batch groups
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Optional: Add description or topic focus later
}, { timestamps: true });

// Limit members to 5 (can be enforced in controller, but good to know constraint)
// Index for faster queries
studyGroupSchema.index({ batch: 1 });
studyGroupSchema.index({ members: 1 });

module.exports = mongoose.model('StudyGroup', studyGroupSchema);
