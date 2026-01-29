const mongoose = require('mongoose');
const ExamSubmission = require('../models/ExamSubmission');
const Exam = require('../models/Exam');
const Batch = require('../models/Batch');
const User = require('../models/User');
const { sendNotification } = require('../utils/notificationHelper');
const { applyQualificationAndGrade } = require('../utils/examGrading');

/**
 * @desc    Get all pending evaluations for trainer (all exams + submissions)
 * @route   GET /api/trainer/evaluation/pending
 * @access  Trainer
 */
exports.getAllPendingEvaluations = async (req, res) => {
    try {
        const trainerId = req.user.id;

        // Convert string ID to ObjectId for MongoDB query
        const trainerObjectId = new mongoose.Types.ObjectId(trainerId);

        // 1. Find all batches assigned to this trainer (singular 'trainer' field)
        const trainerBatches = await Batch.find({ trainer: trainerObjectId }).select('_id name');
        const batchIds = trainerBatches.map(b => b._id);

        if (!batchIds.length) {
            return res.json({
                success: true,
                exams: [],
                message: 'You are not assigned to any batches'
            });
        }

        // 2. Get all students from trainer's batches
        const students = await User.find({
            batch: { $in: batchIds },
            role: 'Student'
        }).select('_id name email batch');

        const studentIds = students.map(s => s._id);

        if (!studentIds.length) {
            return res.json({
                success: true,
                exams: [],
                message: 'No students in your batches'
            });
        }

        // 3. Find all exam submissions from these students
        const allSubmissions = await ExamSubmission.find({
            student: { $in: studentIds },
            status: 'submitted'  // Use status field, not submitted boolean
        }).populate('exam').select('exam student');

        // 4. Get unique exam IDs and filter for theory exams
        const examIds = [...new Set(allSubmissions.map(sub => sub.exam._id.toString()))];

        const exams = await Exam.find({
            _id: { $in: examIds }
        }).select('_id title questions totalMarks assignedTo');

        // Filter for theory exams only
        const theoryExams = exams.filter(exam =>
            exam.questions && exam.questions.some(q => q.type === 'theory')
        );

        const examsWithSubmissions = [];

        for (const exam of theoryExams) {
            // Get all submissions for this exam from trainer's students
            const submissions = await ExamSubmission.find({
                exam: exam._id,
                student: { $in: studentIds },
                status: 'submitted'  // Use status field, not submitted boolean
            })
                .populate('student', 'name email employeeId')
                .populate('evaluatedBy', 'name')
                .sort({ submittedAt: -1 });

            console.log(`  📊 Exam "${exam.title}": ${submissions.length} submissions`);

            if (submissions.length > 0) {
                // Add batch info to each submission
                const submissionsData = submissions.map(sub => ({
                    _id: sub._id,
                    student: {
                        _id: sub.student._id,
                        name: sub.student.name,
                        email: sub.student.email,
                        employeeId: sub.student.employeeId
                    },
                    submittedAt: sub.submittedAt,
                    isEvaluated: sub.isEvaluated || false,
                    evaluatedBy: sub.evaluatedBy,
                    evaluatedAt: sub.evaluatedAt,
                    totalManualScore: sub.totalManualScore || 0,
                    percentageScore: sub.percentageScore || 0,
                    grade: sub.grade || 'N/A'
                }));

                const examData = {
                    _id: exam._id.toString(),
                    title: exam.title,
                    totalMarks: exam.totalMarks,
                    theoryQuestionsCount: exam.questions.filter(q => q.type === 'theory').length,
                    totalQuestionsCount: exam.questions.length,
                    submissions: submissionsData
                };

                examsWithSubmissions.push(examData);
            }
        }

        res.json({
            success: true,
            exams: examsWithSubmissions
        });

    } catch (error) {
        console.error('❌ Error fetching pending evaluations:', error);
        res.status(500).json({
            message: 'Failed to fetch evaluations',
            error: error.message
        });
    }
};


/**
 * @desc    Get all theoretical exam submissions for trainer's batches
 * @route   GET /api/trainer/exams/:examId/submissions
 * @access  Trainer
 */
exports.getExamSubmissions = async (req, res) => {
    try {
        const { examId } = req.params;
        const trainerId = req.user.id;
        const trainerObjectId = new mongoose.Types.ObjectId(trainerId);

        // 1. Find all batches assigned to this trainer
        const trainerBatches = await Batch.find({ trainer: trainerObjectId }).select('_id');
        const batchIds = trainerBatches.map(b => b._id);

        if (!batchIds.length) {
            return res.status(403).json({ message: 'You are not assigned to any batches' });
        }

        // 2. Get the exam
        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        // 3. Check if exam is assigned to any of trainer's batches
        const examAssignedBatches = exam.assignedTo?.batches || [];
        const hasAccessToBatch = examAssignedBatches.some(batchId =>
            batchIds.some(trainerBatchId => trainerBatchId.toString() === batchId.toString())
        );

        if (!hasAccessToBatch) {
            return res.status(403).json({
                message: 'This exam is not assigned to any of your batches'
            });
        }

        // 4. Get all students from trainer's batches
        const students = await User.find({
            batch: { $in: batchIds },
            role: 'Student'
        }).select('_id name email batch');

        const studentIds = students.map(s => s._id);

        // 5. Get all submissions from these students for this exam
        const submissions = await ExamSubmission.find({
            exam: examId,
            student: { $in: studentIds },
            submitted: true
        })
            .populate('student', 'name email employeeId')
            .populate('exam', 'title type totalMarks')
            .sort({ submittedAt: -1 });

        // Add batch info to each submission
        const submissionsWithBatch = submissions.map(sub => {
            const student = students.find(s => s._id.toString() === sub.student._id.toString());
            return {
                ...sub.toObject(),
                studentBatch: student?.batch
            };
        });

        res.json({
            success: true,
            count: submissions.length,
            submissions: submissionsWithBatch
        });

    } catch (error) {
        console.error('Error fetching trainer exam submissions:', error);
        res.status(500).json({
            message: 'Failed to fetch submissions',
            error: error.message
        });
    }
};

/**
 * @desc    Get single submission details for evaluation
 * @route   GET /api/trainer/submission/:submissionId
 * @access  Trainer
 */
exports.getSubmissionForEvaluation = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const trainerId = req.user.id;

        // 1. Get submission with populated data
        const submission = await ExamSubmission.findById(submissionId)
            .populate('student', 'name email employeeId batch')
            .populate({
                path: 'exam',
                select: 'title type questions totalMarks qualificationPercentage'
            });

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // 2. Verify trainer has access to this student's batch
        const studentBatch = await Batch.findById(submission.student.batch);
        if (!studentBatch) {
            console.error('Student batch not found:', submission.student.batch);
            return res.status(404).json({ message: 'Student batch not found' });
        }

        console.log('Student batch found:', studentBatch.name, 'Trainer:', studentBatch.trainer);

        // Check if this trainer is assigned to the batch (singular 'trainer' field)
        const trainerObjectId = new mongoose.Types.ObjectId(trainerId);
        const isTrainerOfBatch = studentBatch.trainer &&
            studentBatch.trainer.toString() === trainerObjectId.toString();

        console.log('Is trainer of batch?', isTrainerOfBatch, 'Trainer ID:', trainerId);

        if (!isTrainerOfBatch) {
            return res.status(403).json({
                message: 'You are not authorized to evaluate this submission'
            });
        }


        // 3. Extract theory questions and their answers
        const exam = submission.exam;
        const theoryQuestions = exam.questions.filter(q => q.type === 'theory');
        const theoryAnswers = submission.answers.filter(a => a.questionType === 'theory');

        // 5. Map questions with answers
        const questionsWithAnswers = theoryQuestions.map(question => {
            const answer = theoryAnswers.find(a => a.questionId === question.id);
            const existingScore = submission.manualScores?.find(ms => ms.questionId === question.id);

            return {
                questionId: question.id,
                title: question.title,
                marksMax: question.marks,
                textAnswer: answer?.textAnswer || '',
                marksObtained: existingScore?.score || 0
            };
        });

        res.json({
            success: true,
            submission: {
                _id: submission._id,
                student: {
                    _id: submission.student._id,
                    name: submission.student.name,
                    email: submission.student.email,
                    employeeId: submission.student.employeeId
                },
                exam: {
                    _id: exam._id,
                    title: exam.title,
                    totalMarks: exam.totalMarks
                },
                submittedAt: submission.submittedAt,
                isEvaluated: submission.isEvaluated,
                evaluatedBy: submission.evaluatedBy,
                evaluatedAt: submission.evaluatedAt,
                totalManualScore: submission.totalManualScore || 0,
                questions: questionsWithAnswers
            }
        });

    } catch (error) {
        console.error('Error fetching submission for evaluation:', error);
        res.status(500).json({
            message: 'Failed to fetch submission',
            error: error.message
        });
    }
};

/**
 * @desc    Submit manual evaluation for a theoretical exam
 * @route   POST /api/trainer/submission/:submissionId/evaluate
 * @access  Trainer
 */
exports.evaluateSubmission = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const { scores } = req.body; // Array of { questionId, score }
        const trainerId = req.user.id;

        // 1. Validate input
        if (!scores || !Array.isArray(scores) || scores.length === 0) {
            return res.status(400).json({ message: 'Scores array is required' });
        }

        // 2. Get submission
        const submission = await ExamSubmission.findById(submissionId)
            .populate('student', 'name email batch')
            .populate('exam');

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // 3. Verify trainer has access
        const studentBatch = await Batch.findById(submission.student.batch);
        if (!studentBatch) {
            return res.status(404).json({ message: 'Student batch not found' });
        }

        const trainerObjectId = new mongoose.Types.ObjectId(trainerId);
        const isTrainerOfBatch = studentBatch.trainer &&
            studentBatch.trainer.toString() === trainerObjectId.toString();

        if (!isTrainerOfBatch) {
            return res.status(403).json({
                message: 'You are not authorized to evaluate this submission'
            });
        }

        // 4. Validate scores against question marks (removed exam-batch assignment check)
        const exam = submission.exam;
        const theoryQuestions = exam.questions.filter(q => q.type === 'theory');

        for (const scoreEntry of scores) {
            const question = theoryQuestions.find(q => q.id === scoreEntry.questionId);
            if (!question) {
                return res.status(400).json({
                    message: `Question ${scoreEntry.questionId} not found`
                });
            }
            if (scoreEntry.score > question.marks) {
                return res.status(400).json({
                    message: `Score for question ${scoreEntry.questionId} exceeds maximum marks`
                });
            }
            if (scoreEntry.score < 0) {
                return res.status(400).json({
                    message: `Score cannot be negative`
                });
            }
        }

        // 6. Calculate total manual score
        const totalManualScore = scores.reduce((sum, s) => sum + s.score, 0);

        // 7. Calculate overall score (include auto-graded questions if any)
        let totalScore = totalManualScore;
        let totalPossibleMarks = theoryQuestions.reduce((sum, q) => sum + q.marks, 0);

        // Add scores from MCQ and coding questions if they exist
        const autoGradedAnswers = submission.answers.filter(
            a => a.questionType !== 'theory'
        );
        const autoGradedScore = autoGradedAnswers.reduce(
            (sum, a) => sum + (a.marksObtained || 0),
            0
        );
        totalScore += autoGradedScore;

        // Get total possible marks for auto-graded questions
        const autoGradedQuestions = exam.questions.filter(q => q.type !== 'theory');
        const autoGradedMaxMarks = autoGradedQuestions.reduce(
            (sum, q) => sum + q.marks,
            0
        );
        totalPossibleMarks += autoGradedMaxMarks;

        // 8. Calculate percentage and grade
        const percentageScore = totalPossibleMarks > 0
            ? (totalScore / totalPossibleMarks) * 100
            : 0;

        // ✅ FIX: Update submission scores BEFORE calculating grade/qualification
        // This ensures applyQualificationAndGrade sees the correct percentage
        submission.totalMarksObtained = totalScore;
        submission.totalMarksMax = totalPossibleMarks;
        submission.percentageScore = percentageScore;

        // Apply RAG grading
        await applyQualificationAndGrade(submission);
        const { grade, qualified } = submission;

        // 9. Update submission metadata
        submission.manualScores = scores;
        submission.totalManualScore = totalManualScore;
        submission.isEvaluated = true;
        submission.evaluatedBy = trainerId;
        submission.evaluatedAt = new Date();
        // Scores are already set above
        // submission.totalMarksObtained = totalScore;
        // submission.totalMarksMax = totalPossibleMarks;
        // submission.percentageScore = percentageScore;
        submission.grade = grade;
        submission.qualified = qualified;
        submission.status = 'graded';

        // Update individual answer marks
        scores.forEach(scoreEntry => {
            const answerIndex = submission.answers.findIndex(
                a => a.questionId === scoreEntry.questionId
            );
            if (answerIndex !== -1) {
                submission.answers[answerIndex].marksObtained = scoreEntry.score;
                const question = theoryQuestions.find(q => q.id === scoreEntry.questionId);
                submission.answers[answerIndex].marksMax = question?.marks || 0;
            }
        });

        await submission.save();

        // 10. Send notification to student (optional - don't fail if this errors)
        try {
            if (typeof sendNotification === 'function') {
                await sendNotification(
                    submission.student._id,
                    'exam_evaluated',
                    'Exam Evaluated',
                    `Your ${exam.title} has been evaluated. Score: ${percentageScore.toFixed(2)}%`,
                    submission._id,
                    'ExamSubmission'
                );
            }
        } catch (notificationError) {
            console.log('⚠️ Failed to send notification (non-critical):', notificationError.message);
        }

        res.json({
            success: true,
            message: 'Submission evaluated successfully',
            submission: {
                _id: submission._id,
                totalManualScore,
                totalMarksObtained: totalScore,
                totalMarksMax: totalPossibleMarks,
                percentageScore,
                grade,
                qualified,
                evaluatedBy: trainerId,
                evaluatedAt: submission.evaluatedAt
            }
        });

    } catch (error) {
        console.error('Error evaluating submission:', error);
        res.status(500).json({
            message: 'Failed to evaluate submission',
            error: error.message
        });
    }
};
