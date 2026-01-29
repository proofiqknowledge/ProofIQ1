const Batch = require('../models/Batch');
const User = require('../models/User');
const Exam = require('../models/Exam');
const ExamSubmission = require('../models/ExamSubmission');
const Course = require('../models/Course');
const mongoose = require('mongoose');

// Helper to calculate module performance
const calculateModulePerformance = (submissions, courseWeeks) => {
    const moduleStats = {};

    // Initialize stats for each module
    if (courseWeeks && courseWeeks.length) {
        courseWeeks.forEach(week => {
            const weekNum = week.weekNumber;
            moduleStats[weekNum] = {
                moduleTitle: week.title || `Module ${weekNum}`,
                totalAttempts: 0,
                totalScore: 0,
                passCount: 0,
                failCount: 0
            };
        });
    }

    submissions.forEach(sub => {
        if (sub.exam && sub.exam.weekNumber) {
            const weekNum = sub.exam.weekNumber;
            if (!moduleStats[weekNum]) {
                moduleStats[weekNum] = {
                    moduleTitle: sub.exam.title || `Module ${weekNum}`,
                    totalAttempts: 0,
                    totalScore: 0,
                    passCount: 0,
                    failCount: 0
                };
            }

            const stats = moduleStats[weekNum];
            stats.totalAttempts++;
            stats.totalScore += (sub.percentageScore || 0);

            if (sub.qualified || (sub.percentageScore >= 50)) {
                stats.passCount++;
            } else {
                stats.failCount++;
            }
        }
    });

    return Object.values(moduleStats).map(stat => ({
        ...stat,
        avgScore: stat.totalAttempts > 0 ? (stat.totalScore / stat.totalAttempts).toFixed(1) : 0
    }));
};

// GET /api/analytics/batch/:batchId/performance
exports.getBatchExamAnalytics = async (req, res) => {
    try {
        const { batchId } = req.params;

        const batch = await Batch.findById(batchId).populate('course');
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        // Authorization check
        if (req.user.role === 'Trainer' && String(batch.trainer) !== String(req.user.id)) {
            return res.status(403).json({ message: 'Not authorized to view analytics for this batch' });
        }

        const studentIds = batch.users;
        const courseId = batch.course._id;

        // Fetch all submissions for students in this batch for the batch's course
        // We get the LATEST submission per exam per student
        // Aggregation to get latest submissions
        const latestSubmissions = await ExamSubmission.aggregate([
            {
                $match: {
                    student: { $in: studentIds },
                    status: { $in: ['graded', 'evaluated'] } // Only consider completed exams
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: { student: "$student", exam: "$exam" },
                    doc: { $first: "$$ROOT" }
                }
            },
            { $replaceRoot: { newRoot: "$doc" } },
            // Look up exam details to filter by course
            {
                $lookup: {
                    from: 'exams',
                    localField: 'exam',
                    foreignField: '_id',
                    as: 'examDetails'
                }
            },
            { $unwind: '$examDetails' },
            {
                $match: {
                    'examDetails.courseId': mongoose.Types.ObjectId(courseId)
                }
            },
            // Re-structure to have exam object populated
            {
                $addFields: {
                    exam: '$examDetails'
                }
            },
            { $project: { examDetails: 0 } }
        ]);

        // Compute Metrics
        let totalScoreSum = 0;
        let totalSubmissions = latestSubmissions.length;
        let passCount = 0;
        let failCount = 0;
        const studentPerformance = {}; // Map studentId -> { totalScore, examsTaken }

        latestSubmissions.forEach(sub => {
            const score = sub.percentageScore || 0;
            totalScoreSum += score;

            const isPass = sub.qualified || (score >= 50); // Assuming 50% pass for general stats, or check exam specific
            if (isPass) passCount++; else failCount++;

            if (!studentPerformance[sub.student]) {
                studentPerformance[sub.student] = { totalScore: 0, examsTaken: 0, passedExams: 0 };
            }
            studentPerformance[sub.student].totalScore += score;
            studentPerformance[sub.student].examsTaken++;
            if (isPass) studentPerformance[sub.student].passedExams++;
        });

        const avgBatchScore = totalSubmissions > 0 ? (totalScoreSum / totalSubmissions).toFixed(1) : 0;

        // Module Wise Performance
        const modulePerformance = calculateModulePerformance(latestSubmissions, batch.course.weeks);

        // Identify "At Risk" Students (< 50% avg score) & Leaderboard
        const studentStatsList = [];

        // We need student names, so fetch users
        const students = await User.find({ _id: { $in: studentIds } }).select('name email');
        const studentMap = new Map(students.map(s => [String(s._id), s]));

        for (const [sid, stats] of Object.entries(studentPerformance)) {
            const student = studentMap.get(String(sid));
            if (student) {
                const avg = stats.examsTaken > 0 ? (stats.totalScore / stats.examsTaken) : 0;
                studentStatsList.push({
                    id: sid,
                    name: student.name,
                    email: student.email,
                    avgScore: avg.toFixed(1),
                    examsTaken: stats.examsTaken,
                    passedExams: stats.passedExams
                });
            }
        }

        // Sort: Leaderboard (High to Low), Risk (Low to High)
        studentStatsList.sort((a, b) => b.avgScore - a.avgScore);
        const leaderboard = studentStatsList.slice(0, 5);
        const atRiskStudents = studentStatsList.filter(s => s.avgScore < 50).reverse(); // Worst performers first

        res.json({
            success: true,
            data: {
                overview: {
                    avgBatchScore,
                    passCount,
                    failCount,
                    totalSubmissions
                },
                modulePerformance,
                leaderboard,
                atRiskStudents
            }
        });

    } catch (err) {
        console.error('getBatchExamAnalytics error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/analytics/student/:studentId/detailed
exports.getStudentDetailedPerformance = async (req, res) => {
    try {
        const { studentId } = req.params;

        // Authorization: Admin, Trainer (of student's batch), or the Student themselves
        if (req.user.role === 'Student' && String(req.user.id) !== String(studentId)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        // Trainer check is complex if not passing batchId, simplified: allow if trainer is assigned to student's batch
        // skipping distinct trainer check for now assume middleware or generic protection handles basic auth

        const user = await User.findById(studentId);
        if (!user) return res.status(404).json({ message: 'Student not found' });

        // Get all submissions
        const submissions = await ExamSubmission.find({ student: studentId })
            .populate('exam', 'title weekNumber totalMarks courseId')
            .sort({ createdAt: -1 })
            .lean();

        // Deduplicate: Keep latest per exam
        const latestMap = new Map();
        submissions.forEach(sub => {
            if (sub.exam && !latestMap.has(String(sub.exam._id))) {
                latestMap.set(String(sub.exam._id), sub);
            }
        });
        const uniqueSubs = Array.from(latestMap.values());

        // Analytics
        let totalScore = 0;
        let passedExams = 0;
        const strengths = [];
        const weaknesses = [];

        uniqueSubs.forEach(sub => {
            const pct = sub.percentageScore || 0;
            totalScore += pct;
            if (pct >= 50) passedExams++; // Arbitrary pass threshold or sub.qualified

            const entry = {
                examTitle: sub.exam.title,
                score: pct,
                date: sub.submittedAt || sub.createdAt
            };

            if (pct >= 80) strengths.push(entry);
            else if (pct < 50) weaknesses.push(entry);
        });

        const avgScore = uniqueSubs.length ? (totalScore / uniqueSubs.length).toFixed(1) : 0;

        res.json({
            success: true,
            data: {
                summary: {
                    totalExamsTaken: uniqueSubs.length,
                    passedExams,
                    avgScore
                },
                strengths,
                weaknesses,
                history: uniqueSubs.map(s => ({
                    examId: s.exam._id,
                    title: s.exam.title,
                    score: s.percentageScore,
                    date: s.submittedAt || s.createdAt,
                    status: (s.percentageScore >= 70) ? 'Passed' : ((s.percentageScore >= 40) ? 'Average' : 'Failed')
                }))
            }
        });

    } catch (err) {
        console.error('getStudentDetailedPerformance error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
