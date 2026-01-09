const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Helper to get bucket
const getBucket = (type) => {
    if (type === 'image') return global.gfsBucket; // courseImages
    if (type === 'blog') return global.blogGfsBucket; // blogImages
    return global.videoGfsBucket; // fs (default for videos/docs)
};

// Stream Resource (Video/Doc/Image)
router.get('/:type/:filename', async (req, res) => {
    try {
        const { type, filename } = req.params;
        const bucket = getBucket(type);

        if (!bucket) {
            return res.status(500).json({ message: 'Storage bucket not initialized' });
        }

        const file = await bucket.find({ filename }).toArray();
        if (!file || file.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }

        const fileMeta = file[0];

        // Handle Range Requests (Critical for Videos)
        if (req.headers.range) {
            const parts = req.headers.range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileMeta.length - 1;
            const chunksize = (end - start) + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileMeta.length}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': fileMeta.contentType || 'application/octet-stream',
            });

            bucket.openDownloadStreamByName(filename, { start, end: end + 1 }).pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileMeta.length,
                'Content-Type': fileMeta.contentType || 'application/octet-stream',
            });
            bucket.openDownloadStreamByName(filename).pipe(res);
        }

    } catch (err) {
        console.error('File stream error:', err);
        res.status(500).json({ message: 'Error streaming file' });
    }
});

module.exports = router;
