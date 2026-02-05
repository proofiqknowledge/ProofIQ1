const mongoose = require('mongoose');
const User = require('./models/User');
const Batch = require('./models/Batch');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const batches = await Batch.find({});
        console.log('Batches found:', batches);

        const users = await User.find({ role: 'Student' }).select('name email batch');
        console.log('Students found:', users);

        const targetUser = await User.findOne({ email: 'harshad2@gmail.com' });
        console.log('Target User:', targetUser);

        if (batches.length > 0 && targetUser && !targetUser.batch) {
            console.log(`Assigning batch ${batches[0].name} to user...`);
            targetUser.batch = batches[0]._id;
            await targetUser.save();
            console.log('Batch assigned successfully!');
        } else if (batches.length === 0) {
            console.log('No batches found. Creating a test batch...');
            const newBatch = await Batch.create({
                name: 'Test Setup Batch',
                trainer: targetUser._id, // Just assigning self or admin as trainer for now to satisfy required
                course: '64e8e1234567890abcdef123', // Dummy ID if needed, or we might valid one. Actually Batch required Course.
                // Wait, strict mode might fail if course doesn't exist.
                // Let's just create a batch without required checks if possible or just log.
            });
            // Actually, risking validation errors. Let's just look first.
        }

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
};

run();
