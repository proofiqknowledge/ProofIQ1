const mongoose = require('mongoose');

const studyRequestSchema = new mongoose.Schema({
    fromUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    toUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyGroup'
        // If null, it's a request to form a NEW group
        // If set, it's an invite to an EXISTING group
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    message: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// Ensure unique pending requests between same users to avoid spam
studyRequestSchema.index({ fromUser: 1, toUser: 1, groupId: 1, status: 1 });
studyRequestSchema.index({ toUser: 1, status: 1 }); // For fetching "My Requests"

module.exports = mongoose.model('StudyRequest', studyRequestSchema);
