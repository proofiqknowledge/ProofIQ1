// Authentication controller handling login, registration and user authentication
const User = require('../models/User');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendResetEmail } = require('../utils/emailSender');
//added
// @desc    Register new user
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    console.log('Registration request received:', { ...req.body, password: '[REDACTED]' });

    // ❌ REMOVE designation and yearsOfExperience from destructuring
    const { name, email, password, role, batch, employeeId } = req.body;

    // Validation
    const validationErrors = [];
    if (!name) validationErrors.push('Name is required');
    if (!email) validationErrors.push('Email is required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) validationErrors.push('Invalid email format');
    if (!password) validationErrors.push('Password is required');
    else {
      // Password strength validation
      if (password.length < 8) validationErrors.push('Password must be at least 8 characters');
      if (!/[A-Z]/.test(password)) validationErrors.push('Password must contain uppercase letter');
      if (!/[a-z]/.test(password)) validationErrors.push('Password must contain lowercase letter');
      if (!/\d/.test(password)) validationErrors.push('Password must contain number');
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) validationErrors.push('Password must contain special character');
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors.join(', ') });
    }

    // Check existing user
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Check duplicate employeeId if provided
    if (employeeId && String(employeeId).trim()) {
      const existingEmployee = await User.findOne({
        employeeId: String(employeeId).toUpperCase().trim()
      });
      if (existingEmployee) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
    }

    // Hash password
    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);

    // Create user object
    const createObj = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'Student', // 🔒 FORCE STUDENT ROLE for public registration
      rewardPoints: 0,
      enrolledCourses: [], // Initialize empty
    };

    if (batch) createObj.batch = batch;
    if (employeeId) createObj.employeeId = String(employeeId).toUpperCase().trim();
    // ❌ REMOVED: designation and yearsOfExperience

    const user = await User.create(createObj);

    // Generate token
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      batch: user.batch,
      employeeId: user.employeeId,
      // ❌ REMOVED: designation, yearsOfExperience
      rewardPoints: user.rewardPoints,
    };

    res.status(201).json({ user: userResponse, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};


// @desc    Login user
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // ✅ Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.warn(`⚠️ [AUTH] Login attempt with non-existent email: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // ✅ Check if user is active
    if (!user.isActive) {
      console.warn(`⚠️ [AUTH] Login attempt from inactive user: ${email}`);
      return res.status(403).json({ message: 'Account is inactive. Please contact support.' });
    }

    // ✅ Check if user is blocked
    if (user.isBlocked) {
      console.warn(`⚠️ [AUTH] Login attempt from blocked user: ${email}`);
      return res.status(403).json({ message: 'Your account has been blocked by the administrator.' });
    }

    // ✅ Verify password using bcryptjs
    let isPasswordMatch = false;
    try {
      isPasswordMatch = await bcryptjs.compare(password, user.passwordHash);
      console.log(`🔐 [AUTH] Password comparison result for ${email}: ${isPasswordMatch}`);
    } catch (compareError) {
      console.error(`❌ [AUTH] Password comparison error for ${email}:`, compareError.message);
      return res.status(500).json({ message: 'Authentication failed. Please try again.' });
    }

    if (!isPasswordMatch) {
      console.warn(`⚠️ [AUTH] Failed login attempt (wrong password) for: ${email}`);
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // ✅ Validate JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('❌ [AUTH] JWT_SECRET is not set in environment');
      return res.status(500).json({ message: 'Server misconfiguration: JWT secret missing' });
    }

    // ✅ Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ [AUTH] Successful login for: ${email} (${user.role})`);

    // ✅ Return safe user response
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        batch: user.batch,
        employeeId: user.employeeId,
        rewardPoints: user.rewardPoints
      }
    });
  } catch (err) {
    console.error('❌ [AUTH] Unexpected login error:', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error during login', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
};

// @desc    Request password reset (send token)
// @route   POST /api/auth/forgot-password
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });

    // Always respond with success message to avoid user enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }

    // Generate token
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600 * 1000; // 1 hour
    await user.save();

    // Build frontend URL for reset link.
    // Prefer explicit env var, fall back to request origin or referer (useful in dev with Vite on 5173), then final default.
    const reqOrigin = req.get('origin') || (req.headers.referer ? (() => {
      try { return new URL(req.headers.referer).origin; } catch (e) { return null; }
    })() : null);
    const frontendUrl = process.env.FRONTEND_URL || reqOrigin || 'http://localhost:5173';
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}&id=${user._id}`;

    // Try sending email via SMTP / nodemailer. If not available or not configured,
    // fall back to returning the resetUrl in the JSON response for local/dev debugging.
    const emailSent = await sendResetEmail(email, resetUrl);
    if (!emailSent) {
      console.log(`Password reset requested for ${email}. Reset link (dev): ${resetUrl}`);
    } else {
      console.log(`Password reset email dispatched to ${email}`);
    }

    // Always send a generic success response to avoid user enumeration.
    // For convenience in dev we include resetUrl in the response body so the frontend can show it.
    res.json({ message: 'If that email exists, a reset link has been sent', resetUrl: emailSent ? undefined : resetUrl });
  } catch (err) {
    console.error('requestPasswordReset error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { userId, token, password } = req.body;
    if (!userId || !token || !password) return res.status(400).json({ message: 'Missing required fields' });

    const user = await User.findOne({ _id: userId, resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    const salt = await bcryptjs.genSalt(10);
    const passwordHash = await bcryptjs.hash(password, salt);
    user.passwordHash = passwordHash;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
