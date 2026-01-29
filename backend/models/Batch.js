const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    unique: true
  },

  // ⭐ NEW FIELD ADDED
  durationWeeks: { type: Number, default: 0 },
  // Per-batch course access duration fields (admin-configurable)
  accessDurationWeeks: { type: Number, default: 0 },
  accessDurationDays: { type: Number, default: 0 },
  accessStartDate: { type: Date, required: false },
  // Computed expiry for the batch's course access (accessStartDate + duration)
  courseAccessExpiry: { type: Date, required: false },

  startDate: {
    type: Date,
    required: false
  },
  endDate: {
    type: Date,
    required: false,
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  trainer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course',
    required: true
  },
  users: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed'],
    default: 'upcoming'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Static method to check if a user can be added to a batch
batchSchema.statics.canAddUser = async function(userId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (user.batch) {
    const existingBatch = await this.findById(user.batch);
    if (existingBatch) {
      throw new Error(`User is already assigned to batch: ${existingBatch.name}`);
    }
  }
  
  return true;
};

module.exports = mongoose.model('Batch', batchSchema);
