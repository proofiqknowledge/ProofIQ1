const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyGroup',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxLength: 1000
    }
}, { timestamps: true });

// Index for efficiently fetching recent messages for a group
groupMessageSchema.index({ groupId: 1, createdAt: 1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
