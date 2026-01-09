const Exam = require('../models/Exam');

async function calculateTotalMarks(submission) {
  if (!submission) return;

  let totalObtained = 0;
  let totalMax = 0;

  // ✅ FIX: Get total marks from the EXAM, not just answered questions
  // With shuffling, submission.answers only contains answered questions
  try {
    const exam = await Exam.findById(submission.exam);
    if (exam && Array.isArray(exam.questions)) {
      // Total marks = sum of all questions in exam
      totalMax = exam.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    } else {
      // Fallback: count answered questions only (old behavior)
      (submission.answers || []).forEach((answer) => {
        if (answer.marksMax) {
          totalMax += answer.marksMax;
        }
      });
    }
  } catch (err) {
    console.warn('Error fetching exam for totalMarks calculation:', err.message);
    // Fallback to old behavior if exam fetch fails
    (submission.answers || []).forEach((answer) => {
      if (answer.marksMax) {
        totalMax += answer.marksMax;
      }
    });
  }

  // Count obtained marks from answered questions
  (submission.answers || []).forEach((answer) => {
    if (answer.marksObtained !== undefined && answer.marksObtained !== null) {
      totalObtained += answer.marksObtained;
    }
  });

  console.log(`[calculateTotalMarks] Answers count: ${(submission.answers || []).length}`);
  console.log(`[calculateTotalMarks] Total obtained: ${totalObtained}, Total max: ${totalMax}`);
  console.log(`[calculateTotalMarks] Answers:`, (submission.answers || []).map(a => ({
    questionId: a.questionId,
    marksObtained: a.marksObtained,
    marksMax: a.marksMax
  })));

  submission.totalMarksObtained = totalObtained;
  submission.totalMarksMax = totalMax;
  submission.percentageScore = totalMax > 0
    ? Math.round((totalObtained / totalMax) * 100 * 100) / 100  // Multiply by 100 for %, then by 100 and divide by 100 for rounding to 2 decimals
    : 0;

  console.log(`[calculateTotalMarks] Final percentage: ${submission.percentageScore}%`);

  // Also set the percentage field for backward compatibility
  submission.percentage = submission.percentageScore;
}

async function applyQualificationAndGrade(submission) {
  if (!submission) return;

  try {
    console.log(`\n[GRADING] Processing submission ${submission._id}`);
    console.log(`[GRADING] Exam ID: ${submission.exam}`);

    const exam = await Exam.findById(submission.exam);

    if (exam) {
      console.log(`[GRADING] Assessment found: "${exam.title}"`);
      console.log(`[GRADING] Assessment thresholds: qualification=${exam.qualificationPercentage}, excellent=${exam.excellentMin}, good=${exam.goodMin}`);
    } else {
      console.log(`[GRADING] ⚠️  Assessment NOT found, using defaults`);
    }

    // Use exam thresholds if available, otherwise use defaults
    const qualificationCutoff = exam?.qualificationPercentage ?? 65;
    const excellentMin = exam?.excellentMin ?? 90;
    const goodMin = exam?.goodMin ?? 80;

    console.log(`[GRADING] Using thresholds: qualification=${qualificationCutoff}, excellent=${excellentMin}, good=${goodMin}`);

    // ✅ FIX: Don't check totalMarksMax here - it may not be set yet
    // calculateTotalMarks should be called BEFORE this function
    // Use percentageScore instead which is set by calculateTotalMarks

    const percent = submission.percentageScore || 0;

    // Fix: Use correct variables for thresholds
    const greenThreshold = excellentMin;
    const amberThreshold = qualificationCutoff;

    let grade = 'Red';
    let gradeColor = 'Red';
    let qualified = false;

    if (percent >= greenThreshold) {
      grade = 'Green';
      gradeColor = 'Green';
      qualified = true;
    } else if (percent >= amberThreshold) {
      grade = 'Amber';
      gradeColor = 'Amber';
      qualified = true;
    } else {
      grade = 'Red';
      gradeColor = 'Red';
      qualified = false;
    }

    console.log(`[GRADING] Percentage: ${percent}%, Grade: ${grade}, Qualified: ${qualified}`);

    submission.qualified = qualified;
    submission.grade = grade;
    submission.gradeColor = gradeColor;

    console.log(`[GRADING] ✅ Grading complete: ${grade} (${gradeColor})\n`);
  } catch (error) {
    console.error('[GRADING] Error in applyQualificationAndGrade:', error.message);
  }
}

module.exports = {
  calculateTotalMarks,
  applyQualificationAndGrade,
};
