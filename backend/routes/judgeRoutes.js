const express = require("express");
const router = express.Router();
const { runCode } = require("../controllers/judgeController");
const auth = require("../middlewares/authMiddleware");
const decodeHTML = require("../middlewares/decodeHTML");

// Apply HTML decode middleware to all routes to fix &lt; &gt; encoding
router.post("/run", auth, decodeHTML, runCode);

module.exports = router;
