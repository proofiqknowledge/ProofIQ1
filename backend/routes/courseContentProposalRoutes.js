const express = require("express");
const router = express.Router();
const {
  proposeCourseContent,
  getPendingProposals,
  getAllProposals,
  reviewProposal,
} = require("../controllers/courseContentProposalController");
const { isAdmin } = require("../middlewares/roleMiddleware");
const auth = require("../middlewares/authMiddleware");
const { uploadDocument } = require("../utils/uploadHandler");

// Public routes
// Trainers must be authenticated to propose content and may upload a single document
router.post("/propose", auth, uploadDocument.single('document'), proposeCourseContent);
router.get("/pending", getPendingProposals);
// Trainer-specific proposals
router.get('/trainer/proposals', auth, require('../controllers/courseContentProposalController').getTrainerProposals);


// Admin-only routes - must have auth BEFORE role check
router.get("/admin/all", auth, isAdmin, getAllProposals);
router.post("/admin/review", auth, isAdmin, reviewProposal);

module.exports = router;
