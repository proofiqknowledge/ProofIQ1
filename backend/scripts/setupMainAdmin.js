const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import User model
const User = require('../models/User');

async function setupMainAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // 📌 Seed MASTER User
    const masterEmail = process.env.MASTER_EMAIL;
    const masterPassword = process.env.MASTER_PASSWORD;

    if (masterEmail && masterPassword) {
      let master = await User.findOne({ email: masterEmail.toLowerCase() });
      if (!master) {
        console.log(`➕ Creating MASTER user (${masterEmail})...`);
        const salt = await bcrypt.genSalt(10);
        master = await User.create({
          name: 'System Master',
          email: masterEmail.toLowerCase(),
          passwordHash: await bcrypt.hash(masterPassword, salt),
          role: 'Master',
          batch: null,
          rewardPoints: 0,
          enrolledCourses: []
        });
        console.log('✅ MASTER user created successfully.');
      } else {
        // Ensure role is correct even if user exists
        if (master.role !== 'Master') {
          console.log(`✏️ Updating existing user to MASTER role...`);
          master.role = 'Master';
          await master.save();
        }
        console.log('✅ MASTER user already exists.');
      }
    } else {
      console.warn('⚠️ MASTER_EMAIL or MASTER_PASSWORD not set in .env. Skipping Master seeding.');
    }

    // 📌 Seed ADMIN User
    const adminEmail = process.env.MAIN_ADMIN_EMAIL;
    const adminPassword = process.env.MAIN_ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      let admin = await User.findOne({ email: adminEmail.toLowerCase() });
      if (!admin) {
        console.log(`➕ Creating ADMIN user (${adminEmail})...`);
        const salt = await bcrypt.genSalt(10);
        admin = await User.create({
          name: 'System Admin',
          email: adminEmail.toLowerCase(),
          passwordHash: await bcrypt.hash(adminPassword, salt),
          role: 'Admin',
          batch: null,
          rewardPoints: 0,
          enrolledCourses: []
        });
        console.log('✅ ADMIN user created successfully.');
      } else {
        if (admin.role !== 'Admin' && admin.role !== 'Master') {
          console.log(`✏️ Updating existing user to ADMIN role...`);
          admin.role = 'Admin';
          await admin.save();
        }
        console.log('✅ ADMIN user already exists.');
      }
    } else {
      console.warn('⚠️ MAIN_ADMIN_EMAIL or MAIN_ADMIN_PASSWORD not set in .env. Skipping Admin seeding.');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up system users:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupMainAdmin();
