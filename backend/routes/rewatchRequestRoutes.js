const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");

const {
  requestRewatch,
  getPendingRequests,
  approveRewatch,
  rejectRewatch
} = require("../controllers/rewatchRequestController");

const { consumeRewatch } = require("../controllers/rewatchRequestController");

// Student sends a rewatch request
router.post("/request", auth, requestRewatch);

// Trainer/Admin get pending requests
router.get("/pending", auth, getPendingRequests);

// Trainer/Admin approve
router.put("/approve/:id", auth, approveRewatch);

// Trainer/Admin reject
router.put("/reject/:id", auth, rejectRewatch);

// Student or server can mark an approved rewatch as consumed
router.post('/consume', auth, consumeRewatch);

module.exports = router;
