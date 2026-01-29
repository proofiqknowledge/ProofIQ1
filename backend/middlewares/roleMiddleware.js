// Role middleware factory
const checkRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    console.error('❌ No user in request');
    return res.status(403).json({ message: 'Forbidden: no user in request' });
  }
  const userRole = req.user.role;
  console.log(`🔐 Role check: user.role="${userRole}" (type: ${typeof userRole}, length: ${userRole.length}) allowed=[${roles.join(',')}]`);
  // Check each role carefully
  const hasRole = roles.some(role => {
    const matches = role.toLowerCase() === userRole.toLowerCase();
    console.log(`  - Comparing "${userRole}" === "${role}": ${matches}`);
    return matches;
  });

  if (!hasRole) {
    console.error(`❌ Insufficient rights: user role="${userRole}" not in ${JSON.stringify(roles)}`);
    return res.status(403).json({ message: 'Forbidden: insufficient rights' });
  }

  console.log(`✅ Role check passed for roles: ${roles.join(',')}`);
  next();
};

// Export specific role middleware
exports.isAdmin = checkRole('Admin', 'Master');
exports.isTrainer = checkRole('Trainer');
exports.isStudent = checkRole('Student', 'Admin', 'Master');
