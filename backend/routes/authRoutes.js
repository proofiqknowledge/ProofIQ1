const express = require('express');
const router = express.Router();
const { register, login, requestPasswordReset, resetPassword } = require('../controllers/authController');

// Test endpoint to verify API connectivity
router.get('/test', (req, res) => {
  res.json({ message: 'Auth API is responding', timestamp: new Date().toISOString() });
});

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

// ============================================
// MSAL (Microsoft Authentication) Routes
// ============================================
// FUTURE: Microsoft Azure AD login endpoint
// CURRENT STATUS: Returns 501 (Not Implemented)
// This is a placeholder for future MSAL integration
const msalAuthRoutes = require('./msalAuthRoutes');
router.use('/', msalAuthRoutes);

module.exports = router;
