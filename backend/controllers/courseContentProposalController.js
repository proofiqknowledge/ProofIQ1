const CourseContentProposal = require("../models/CourseContentProposal");
const Course = require("../models/Course");
const User = require("../models/User");
const { notifyProposalReview, notifyAdminsOnProposal } = require("../utils/notificationHelper");

// ✅ Trainer proposes content
exports.proposeCourseContent = async (req, res) => {
  try {
    // If a file was uploaded via multer, it'll be on req.file
    // Form fields for multipart requests will be on req.body
    const trainerId = req.user?.id; // set by auth middleware
    const { course, week, day, title, overview } = req.body;

    console.log('📤 proposeCourseContent called:');
    console.log('   trainerId:', trainerId);
    console.log('   course:', course);
    console.log('   week:', week);
    console.log('   day:', day);
    console.log('   title:', title);
    console.log('   overview:', overview);
    console.log('   file:', req.file ? { name: req.file.originalname, size: req.file.size } : 'none');
    console.log('   body keys:', Object.keys(req.body));

    if (!trainerId || !course) {
      console.error('❌ Missing fields: trainerId or course');
      return res.status(400).json({ message: 'Missing required fields: trainer (from auth) and course' });
    }

    // Build documents array from uploaded file (if present) or from body
    const docs = [];
    if (req.file) {
      // file saved by multer to uploads/documents
      const relativePath = `/uploads/documents/${req.file.filename}`;
      docs.push(relativePath);
      console.log(`✅ File saved: ${relativePath}`);
    }
    if (req.body.documents) {
      // allow sending documents as JSON array in body
      try {
        const parsed = typeof req.body.documents === 'string' ? JSON.parse(req.body.documents) : req.body.documents;
        if (Array.isArray(parsed)) docs.push(...parsed.filter(Boolean));
      } catch (e) {
        // ignore parse errors
      }
    }

    const proposal = new CourseContentProposal({
      trainer: trainerId,
      course,
      // only set numeric week/day if provided
      week: week ? Number(week) : undefined,
      day: day ? Number(day) : undefined,
      title: title || (req.file ? req.file.originalname : undefined),
      overview: overview || '',
      videos: [],
      documents: docs,
      status: "pending",
    });

    await proposal.save();
    await proposal.populate('trainer course');

    console.log('✅ Proposal created:', {
      id: proposal._id,
      trainer: proposal.trainer?.name,
      course: proposal.course?.title,
      status: proposal.status,
      documents: proposal.documents
    });

    // Notify admins that a new proposal has been submitted (fire-and-forget)
    notifyAdminsOnProposal(proposal).catch(err => console.error('notifyAdminsOnProposal error:', err));

    res.status(201).json({ message: 'Content proposal submitted successfully', proposal });
  } catch (error) {
    console.error('❌ Error creating proposal:', error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Admin views all pending proposals
exports.getPendingProposals = async (req, res) => {
  try {
    const proposals = await CourseContentProposal.find({ status: "pending" })
      .populate("trainer", "name email")
      .populate("course", "title");
    res.status(200).json(proposals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Trainer: get all proposals submitted by the logged-in trainer
exports.getTrainerProposals = async (req, res) => {
  try {
    const trainerId = req.user?.id;
    if (!trainerId) return res.status(401).json({ message: 'Unauthorized' });
    const proposals = await CourseContentProposal.find({ trainer: trainerId })
      .populate('course', 'title')
      .populate('trainer', 'name email')
      .sort('-createdAt');
    res.status(200).json(proposals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// ✅ Admin gets all proposals 
exports.getAllProposals = async (req, res) => {
  try {
    const proposals = await CourseContentProposal.find()
      .populate("trainer", "name email")
      .populate("course", "title")
      .sort({ createdAt: -1 });

    console.log("Fetched proposals:", proposals);
    res.json(proposals);
  } catch (err) {
    console.error("Error fetching proposals:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ✅ Admin accepts/rejects proposal
exports.reviewProposal = async (req, res) => {
  try {
    const { proposalId, status, feedback } = req.body;
    
    // Find and populate proposal
    const proposal = await CourseContentProposal.findById(proposalId).populate("course");
    if (!proposal) {
      return res.status(404).json({ message: "Proposal not found" });
    }

    // Update proposal status and feedback
    proposal.status = status;
    if (feedback) {
      proposal.feedback = feedback;
    }
    await proposal.save();

    // If accepted, update course content (only if week/day are specified)
    if (status === "accepted" && proposal.week && proposal.day) {
      const course = proposal.course;
      if (!course) {
        return res.status(404).json({ message: "Associated course not found" });
      }

      // Extract content from proposal
      const { week, day, title, overview, videos, documents } = proposal;
      
      // Initialize course content structure if needed
      if (!course.weeks) {
        course.weeks = [];
      }
      
      // Find or create the week
      let weekContent = course.weeks.find(w => w.weekNumber === week);
      if (!weekContent) {
        weekContent = { weekNumber: week, days: [] };
        course.weeks.push(weekContent);
      }
      
      // Find or create the day
      let dayContent = weekContent.days.find(d => d.dayNumber === day);
      if (!dayContent) {
        dayContent = { 
          dayNumber: day,
          title: title || '',
          overview: overview || '',
          videoUrl: '',
          documentUrl: '',
          acknowledgementRequired: true,
        };
        weekContent.days.push(dayContent);
      }
      
      // Update day content
      dayContent.title = title || dayContent.title;
      dayContent.overview = overview || dayContent.overview;
      if (documents && documents.length > 0) {
        dayContent.documentUrl = documents[0]; // Use first document
      }
      if (videos && videos.length > 0) {
        dayContent.videoUrl = videos[0]; // Use first video
      }

      // Sort weeks and days to maintain order
      course.weeks.sort((a, b) => a.weekNumber - b.weekNumber);
      course.weeks.forEach(w => {
        w.days.sort((a, b) => a.dayNumber - b.dayNumber);
      });

      await course.save();
      console.log(`✅ Proposal accepted and added to course Week ${week}, Day ${day}`);
    } else if (status === "accepted") {
      console.log(`ℹ️ Proposal accepted but not injected into course (no week/day specified - course-level proposal)`);
    }

    res.status(200).json({ 
      message: `Proposal ${status} successfully`,
      proposal: await proposal.populate("trainer course")
    });

    // Send notification to trainer about proposal review
    await notifyProposalReview(proposal, status);

  } catch (error) {
    console.error("Review proposal error:", error);
    res.status(500).json({ message: error.message });
  }
};
