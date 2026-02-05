const mongoose = require('mongoose');

const savedFileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    language: {
        type: String,
        required: true
    },
    code: {
        type: String,
        default: ''
    }
}, { timestamps: true });

// Ensure unique filenames per user
savedFileSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('SavedFile', savedFileSchema);
