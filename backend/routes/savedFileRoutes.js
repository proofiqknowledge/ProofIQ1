const express = require('express');
const router = express.Router();
const protect = require('../middlewares/authMiddleware');
const savedFileController = require('../controllers/savedFileController');

router.use(protect); // Protect all routes

router.get('/', savedFileController.getSavedFiles);
router.post('/save', savedFileController.saveFile);
router.delete('/:id', savedFileController.deleteFile);

module.exports = router;
