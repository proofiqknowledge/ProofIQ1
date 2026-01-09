const mongoose = require('mongoose');

const pointsHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points: { type: Number, required: true },
  reason: { type: String, required: true },
  meta: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('PointsHistory', pointsHistorySchema);
