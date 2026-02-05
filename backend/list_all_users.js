const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const allUsers = await User.find({}).select('name email role batch');
        console.log('Total Users:', allUsers.length);
        console.table(allUsers.map(u => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
            batch: u.batch
        })));

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
};

run();
