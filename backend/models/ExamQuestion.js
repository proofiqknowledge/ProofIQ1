// backend/models/ExamQuestion.js
const mongoose = require("mongoose");

const ExamQuestionSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },

        description: {
            type: String,
            required: true
        },

        language: {
            type: String,
            enum: ["python", "python3", "cpp", "c", "java", "javascript"],
            required: true
        },

        boilerplate: {
            type: String,
            default: ""
        },

        testCases: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "TestCase"
            }
        ],

        marks: {
            type: Number,
            default: 10 // default marks per coding question
        },

        // OPTIONAL — useful for trainers/admins
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "easy"
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false
        },

        createdAt: {
            type: Date,
            default: Date.now
        },

        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// Indexes for faster queries
ExamQuestionSchema.index({ createdAt: -1 });
ExamQuestionSchema.index({ language: 1 });

module.exports = mongoose.model("ExamQuestion", ExamQuestionSchema);
