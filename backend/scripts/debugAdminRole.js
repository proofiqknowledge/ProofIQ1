require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function debugAdminRole() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lms');
    console.log('✅ Connected to MongoDB');

    const adminUser = await User.findOne({ role: 'Admin' }).select('-passwordHash');
    
    if (adminUser) {
      console.log('\n👤 Admin User Found:');
      console.log(`   Name: ${adminUser.name}`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Role: "${adminUser.role}" (type: ${typeof adminUser.role})`);
      console.log(`   Role length: ${adminUser.role.length}`);
      console.log(`   Role charCodes: ${[...adminUser.role].map(c => c.charCodeAt(0)).join(',')}`);
    } else {
      console.log('❌ No Admin user found in database');
      const allUsers = await User.find().select('name email role');
      console.log('\nAll users:');
      allUsers.forEach(u => {
        console.log(`  - ${u.name}: role="${u.role}" (type: ${typeof u.role})`);
      });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

debugAdminRole();
