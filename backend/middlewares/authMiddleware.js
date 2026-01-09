const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    // Check for authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ No valid Bearer token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`✅ Token verified. Decoded:`, { id: decoded.id, role: decoded.role });

    // Get user from database to ensure they still exist and their role hasn't changed
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      console.warn(`⚠️ User not found: ${decoded.id}`);
      return res.status(401).json({ message: 'User no longer exists' });
    }

    // Set full user object in request (includes name, employeeId, etc.)
    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      employeeId: user.employeeId,
      role: user.role,
      avatar: user.avatar,
      profileImage: user.profileImage,
      rewardPoints: user.rewardPoints,
      batch: user.batch
    };
    console.log(`✅ req.user set:`, { id: req.user.id, name: req.user.name, employeeId: req.user.employeeId, role: req.user.role });
    next();
  } catch (err) {
    // Handle expected authentication errors gracefully
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    // Only log unexpected errors
    console.error('Auth middleware error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
