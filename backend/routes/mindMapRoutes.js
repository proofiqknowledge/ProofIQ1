const express = require("express");
const router = express.Router();
const { generateMindMap } = require("../controllers/mindMapController");
const auth = require("../middlewares/authMiddleware"); // if you want only logged in users

router.post("/generate", auth, generateMindMap);
// or without auth: router.post("/generate", generateMindMap);

module.exports = router;
