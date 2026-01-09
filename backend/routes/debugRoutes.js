const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { documentUpload } = require('../utils/uploadMiddleware');
const mammoth = require('mammoth');

// Debug endpoint to test multer + disk storage
router.post('/upload-test', documentUpload.single('document'), (req, res) => {
  try {
    // Return the uploaded file info and any form fields
    return res.json({ message: 'Upload test OK', file: req.file, body: req.body });
  } catch (err) {
    console.error('Debug upload-test error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Serve documents with proper MIME types and headers for inline viewing
router.get('/view-document/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filepath = path.join(__dirname, '../uploads/documents', filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get file extension
    const ext = path.extname(filename).toLowerCase();

    // Set appropriate MIME types for inline viewing
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Set headers to allow inline viewing in browser
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Stream the file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });
  } catch (err) {
    console.error('View document error:', err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});

// Convert DOCX to HTML server-side and return sanitized HTML
router.get('/convert-docx/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;

    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filepath = path.join(__dirname, '../uploads/documents', filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const ext = path.extname(filename).toLowerCase();
    if (ext !== '.docx' && ext !== '.doc') {
      return res.status(400).json({ error: 'Not a supported Word document' });
    }

    const buffer = fs.readFileSync(filepath);

    const result = await mammoth.convertToHtml({ buffer });

    // Basic sanitization: strip <script> tags (recommend adding dompurify on frontend)
    const safeHtml = result.value.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(safeHtml);
  } catch (err) {
    console.error('convert-docx error:', err);
    res.status(500).json({ error: 'Failed to convert document', message: err.message });
  }
});

module.exports = router;
