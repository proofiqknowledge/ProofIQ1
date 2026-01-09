const mongoose = require('mongoose');
const User = require('../models/User');

const SYSTEM_USERS = [
    {
        name: 'Naren Kasyap (Master)',
        email: 'naren.kasyap@peopletech.com',
        role: 'Master',
        authType: 'MSAL',
        employeeId: 'MASTER_01'
    },
    {
        name: 'Kanishka Lama (Admin)',
        email: 'kanishka.lama@peopletech.com',
        role: 'Admin',
        authType: 'MSAL',
        employeeId: 'ADMIN_01'
    }
];

const seedSystemUsers = async () => {
    try {
        console.log('🚀 Starting System User Seeding...');

        for (const sysUser of SYSTEM_USERS) {
            const existingUser = await User.findOne({ email: sysUser.email.toLowerCase() });

            if (!existingUser) {
                console.log(`➕ Creating System User: ${sysUser.name} (${sysUser.role})`);

                await User.create({
                    name: sysUser.name,
                    email: sysUser.email.toLowerCase(),
                    role: sysUser.role,
                    authType: sysUser.authType,
                    employeeId: sysUser.employeeId,
                    passwordHash: 'MSAL_AUTH_REQUIRED_NO_PASSWORD', // Placeholder
                    rewardPoints: 0,
                    enrolledCourses: [],
                    azureOid: undefined // Will be bound on first MSAL login
                });

                console.log(`✅ Created ${sysUser.role}: ${sysUser.email}`);
            } else {
                // Optional: Ensure critical roles are preserved
                if (existingUser.role !== sysUser.role) {
                    console.warn(`⚠️ User ${sysUser.email} exists but has wrong role. Fixing...`);
                    existingUser.role = sysUser.role;
                    await existingUser.save();
                    console.log(`✏️ Fixed role for ${sysUser.email} to ${sysUser.role}`);
                } else {
                    console.log(`✅ System User already exists: ${sysUser.email} (${existingUser.role})`);
                }
            }
        }
        console.log('🏁 System User Seeding Completed.');

    } catch (error) {
        console.error('❌ Error during System User seeding:', error.message);
        // We do NOT exit process here, so server can still start even if seeding fails (e.g. DB connection blip)
    }
};

module.exports = seedSystemUsers;
