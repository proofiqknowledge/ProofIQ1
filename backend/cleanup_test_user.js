const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const result = await User.deleteOne({ email: 'buddy@test.com' });
        console.log('Deleted Study Buddy:', result);

    } catch (err) {
        console.error(err);
    } finally {
        mongoose.connection.close();
    }
};

run();
