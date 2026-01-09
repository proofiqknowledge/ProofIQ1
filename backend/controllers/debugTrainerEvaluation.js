const Batch = require('../models/Batch');
const Exam = require('../models/Exam');
const ExamSubmission = require('../models/ExamSubmission');
const User = require('../models/User');

/**
 * @desc    Debug endpoint to check trainer data
 * @route   GET /api/trainer/evaluation/debug
 * @access  Trainer
 */
exports.debugTrainerData = async (req, res) => {
    try {
        const trainerId = req.user._id;
        const trainerInfo = req.user;

        // 1. Get trainer's batches
        const batches = await Batch.find({ trainers: trainerId })
            .populate('trainers', 'name email')
            .populate('students', 'name email');

        // 2. Get all students in these batches
        const batchIds = batches.map(b => b._id);
        const students = await User.find({
            batch: { $in: batchIds },
            role: 'Student'
        });

        // 3. Get all exams assigned to these batches
        const exams = await Exam.find({
            'assignedTo.batches': { $in: batchIds }
        });

        const theoryExams = exams.filter(exam =>
            exam.questions?.some(q => q.type === 'theory')
        );

        // 4. Get all submissions
        const studentIds = students.map(s => s._id);
        const submissions = await ExamSubmission.find({
            student: { $in: studentIds },
            submitted: true
        }).populate('exam', 'title');

        const theorySubmissions = await ExamSubmission.find({
            student: { $in: studentIds },
            submitted: true,
            exam: { $in: theoryExams.map(e => e._id) }
        }).populate('exam', 'title').populate('student', 'name email');

        res.json({
            success: true,
            debug: {
                trainer: {
                    id: trainerId,
                    name: trainerInfo.name,
                    email: trainerInfo.email,
                    role: trainerInfo.role
                },
                batches: batches.map(b => ({
                    id: b._id,
                    name: b.name,
                    trainersCount: b.trainers?.length || 0,
                    studentsCount: b.students?.length || 0
                })),
                students: {
                    total: students.length,
                    list: students.map(s => ({
                        id: s._id,
                        name: s.name,
                        email: s.email,
                        batchId: s.batch
                    })).slice(0, 10) // Show first 10
                },
                exams: {
                    total: exams.length,
                    theoryExams: theoryExams.length,
                    list: exams.map(e => ({
                        id: e._id,
                        title: e.title,
                        hasTheoryQuestions: e.questions?.some(q => q.type === 'theory'),
                        assignedToBatches: e.assignedTo?.batches?.length || 0
                    })).slice(0, 10)
                },
                submissions: {
                    totalSubmissions: submissions.length,
                    theoryExamSubmissions: theorySubmissions.length,
                    list: theorySubmissions.map(s => ({
                        id: s._id,
                        student: s.student?.name,
                        exam: s.exam?.title,
                        submittedAt: s.submittedAt,
                        isEvaluated: s.isEvaluated
                    })).slice(0, 10)
                }
            }
        });

    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            message: 'Debug failed',
            error: error.message
        });
    }
};
