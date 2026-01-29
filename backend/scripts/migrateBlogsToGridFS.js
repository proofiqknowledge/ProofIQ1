require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Blog = require('../models/Blog');

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/peopletech-lms";

const migrate = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'blogImages'
        });

        const blogs = await Blog.find({});
        console.log(`Found ${blogs.length} blogs to check.`);

        for (const blog of blogs) {
            let updated = false;

            // Migrate Attachment
            if (blog.attachmentUrl && typeof blog.attachmentUrl === 'string') {
                const localPath = path.join(__dirname, '..', blog.attachmentUrl);
                if (fs.existsSync(localPath)) {
                    console.log(`Migrating attachment for blog ${blog._id}...`);
                    const filename = path.basename(localPath);
                    const uploadStream = bucket.openUploadStream(filename);
                    const readStream = fs.createReadStream(localPath);

                    await new Promise((resolve, reject) => {
                        readStream.pipe(uploadStream)
                            .on('error', reject)
                            .on('finish', resolve);
                    });

                    blog.attachmentUrl = {
                        id: uploadStream.id,
                        filename: filename
                    };
                    updated = true;

                    // Delete local file
                    fs.unlinkSync(localPath);
                } else {
                    console.warn(`⚠️ Attachment file not found: ${localPath}`);
                }
            }

            // Migrate Images
            if (blog.images && blog.images.length > 0) {
                const newImages = [];
                for (const imgPath of blog.images) {
                    if (typeof imgPath === 'string') {
                        const localPath = path.join(__dirname, '..', imgPath);
                        if (fs.existsSync(localPath)) {
                            console.log(`Migrating image for blog ${blog._id}...`);
                            const filename = path.basename(localPath);
                            const uploadStream = bucket.openUploadStream(filename);
                            const readStream = fs.createReadStream(localPath);

                            await new Promise((resolve, reject) => {
                                readStream.pipe(uploadStream)
                                    .on('error', reject)
                                    .on('finish', resolve);
                            });

                            newImages.push({
                                id: uploadStream.id,
                                filename: filename
                            });
                            updated = true;

                            // Delete local file
                            fs.unlinkSync(localPath);
                        } else {
                            console.warn(`⚠️ Image file not found: ${localPath}`);
                            // Keep original string if file not found, or remove it?
                            // Let's keep it to avoid data loss, but it won't work with new schema validation if strict
                            // Actually, schema is mixed now, so it might be fine, but better to filter out broken links
                        }
                    } else {
                        newImages.push(imgPath); // Already migrated
                    }
                }
                blog.images = newImages;
            }

            if (updated) {
                await blog.save();
                console.log(`✅ Blog ${blog._id} updated.`);
            }
        }

        console.log('Migration complete.');

        // Optional: Remove empty directories
        const uploadDir = path.join(__dirname, '..', 'uploads', 'blogs');
        if (fs.existsSync(uploadDir)) {
            const files = fs.readdirSync(uploadDir);
            if (files.length === 0) {
                fs.rmdirSync(uploadDir);
                console.log('🗑️ Removed empty uploads/blogs directory.');
            } else {
                console.log(`⚠️ uploads/blogs is not empty (${files.length} files remaining).`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

migrate();
