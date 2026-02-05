const mongoose = require('mongoose');
const User = require('./models/User');
const Batch = require('./models/Batch');
const Course = require('./models/Course'); // Might need this if batch validates course
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const targetUser = await User.findOne({ email: 'harshad2@gmail.com' });
        if (!targetUser) {
            console.log('Target user Harshad2 not found!');
            return;
        }

        // Find any existing batch
        let batch = await Batch.findOne();
        if (!batch) {
            console.log('No batch found. Creating one...');
            // Need a course first? 
            let course = await Course.findOne();
            if (!course) {
                course = await Course.create({
                    title: 'Test Course',
                    description: 'Test Description',
                    thumbnail: 'test.jpg',
                    category: 'Test',
                    level: 'Beginner',
                    createdBy: targetUser._id
                });
            }

            batch = await Batch.create({
                name: 'Development Batch',
                startDate: new Date(),
                trainer: targetUser._id,
                course: course._id,
                status: 'active'
            });
            console.log('Created batch:', batch.name);
        }

        // Assign Harshad2 to batch
        targetUser.batch = batch._id;
        await targetUser.save();
        console.log(`Assigned Harshad2 to ${batch.name}`);

        // Find or create another student
        let buddy = await User.findOne({ email: 'buddy@test.com' });
        if (!buddy) {
            buddy = await User.create({
                name: 'Study Buddy',
                email: 'buddy@test.com',
                passwordHash: 'hashedpassword', // dummy
                role: 'Student',
                batch: batch._id
            });
            console.log('Created Study Buddy user');
        } else {
            buddy.batch = batch._id;
            await buddy.save();
            console.log('Assigned Study Buddy to batch');
        }

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
};

run();
