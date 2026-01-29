#!/usr/bin/env node

/**
 * 🚀 Admin User Seed Script
 * 
 * Creates an admin user for development/testing
 * 
 * Usage: node scripts/createAdmin.js
 * 
 * Admin Credentials:
 * - Email: sritej@gmail.com
 * - Password: Sritej@12
 * - Role: Admin
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const User = require('../models/User');

// ============================================
// Configuration
// ============================================

const ADMIN_USER = {
  name: 'Sritej (Admin)',
  email: 'sritej@gmail.com',
  password: 'Sritej@12',
  role: 'Admin',
  isActive: true,
  rewardPoints: 0,
  batch: null,
  employeeId: 'ADMIN_SRITEJ_001'
};

// ============================================
// Main Seeding Function
// ============================================

const createAdminUser = async () => {
  try {
    // 1️⃣ Validate environment
    if (!process.env.MONGO_URI) {
      console.error('❌ ERROR: MONGO_URI not set in .env file');
      process.exit(1);
    }

    // 2️⃣ Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      ssl: true,
      sslValidate: false,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log('✅ Connected to MongoDB');

    // 3️⃣ Check if admin already exists
    const existingAdmin = await User.findOne({ email: ADMIN_USER.email.toLowerCase() });
    if (existingAdmin) {
      console.log(`⚠️ Admin user already exists: ${ADMIN_USER.email}`);
      console.log(`   📋 ID: ${existingAdmin._id}`);
      console.log(`   👤 Name: ${existingAdmin.name}`);
      console.log(`   🔐 Role: ${existingAdmin.role}`);
      console.log(`   ✔️ Active: ${existingAdmin.isActive}`);
      
      // Optional: Update if needed
      const updateResponse = await promptUpdateAdmin(existingAdmin);
      if (updateResponse) {
        console.log('✅ Admin updated successfully');
      }
      
      await mongoose.connection.close();
      process.exit(0);
    }

    // 4️⃣ Hash password using bcryptjs
    console.log(`🔐 Hashing password for ${ADMIN_USER.email}...`);
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(ADMIN_USER.password, salt);
    console.log('✅ Password hashed successfully');

    // 5️⃣ Create admin user
    console.log(`➕ Creating admin user...`);
    const adminUser = await User.create({
      name: ADMIN_USER.name,
      email: ADMIN_USER.email.toLowerCase().trim(),
      passwordHash,
      role: ADMIN_USER.role,
      authType: 'Local',
      isActive: ADMIN_USER.isActive,
      isBlocked: false,
      rewardPoints: ADMIN_USER.rewardPoints,
      employeeId: ADMIN_USER.employeeId,
      enrolledCourses: []
    });

    console.log('✅ Admin user created successfully!');
    console.log('\n' + '='.repeat(50));
    console.log('📊 ADMIN USER DETAILS');
    console.log('='.repeat(50));
    console.log(`✔️ ID:         ${adminUser._id}`);
    console.log(`👤 Name:       ${adminUser.name}`);
    console.log(`📧 Email:      ${adminUser.email}`);
    console.log(`🔐 Role:       ${adminUser.role}`);
    console.log(`✔️ Active:     ${adminUser.isActive}`);
    console.log(`🆔 Employee:   ${adminUser.employeeId}`);
    console.log('='.repeat(50));
    console.log('\n🎯 LOGIN CREDENTIALS');
    console.log('='.repeat(50));
    console.log(`📧 Email:    ${ADMIN_USER.email}`);
    console.log(`🔐 Password: ${ADMIN_USER.password}`);
    console.log('='.repeat(50));
    console.log('\n✅ You can now login with these credentials!\n');

    // 6️⃣ Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR: Failed to create admin user');
    console.error('Details:', error.message);
    if (error.stack) {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }
    
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError.message);
    }
    
    process.exit(1);
  }
};

// ============================================
// Helper: Prompt to update existing admin
// ============================================

const promptUpdateAdmin = async (existingAdmin) => {
  // In non-interactive mode, just return false
  // For interactive mode, you could use 'prompt' package
  return false;
};

// ============================================
// 🚀 Run Script
// ============================================

console.log('\n' + '='.repeat(50));
console.log('🚀 PROOFIQ ADMIN USER SEED SCRIPT');
console.log('='.repeat(50) + '\n');

createAdminUser();
