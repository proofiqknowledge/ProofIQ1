require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/peopletech-lms";
        await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    }
};

const cleanup = async () => {
    await connectDB();

    try {
        console.log('🔍 Searching for load test users...');
        const pattern = /^load_(trainee|admin)_/;

        const count = await User.countDocuments({ email: { $regex: pattern } });
        console.log(`📊 Found ${count} users matching pattern 'load_(trainee|admin)_'`);

        if (count > 0) {
            const result = await User.deleteMany({ email: { $regex: pattern } });
            console.log(`🗑️ Deleted ${result.deletedCount} users.`);
        } else {
            console.log('✨ No users to clean up.');
        }

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Connection closed');
        process.exit(0);
    }
};

cleanup();
