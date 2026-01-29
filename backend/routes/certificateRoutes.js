const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { downloadCertificate } = require('../controllers/certificateController');

// Download certificate if completed (student for self, admin for any user)
router.get('/:courseId', auth, downloadCertificate);

module.exports = router;
