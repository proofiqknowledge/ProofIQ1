const express = require('express');
const router = express.Router();

/**
 * MSAL LOGIN ENDPOINT (STUB - NOT IMPLEMENTED YET)
 * 
 * PURPOSE:
 * This endpoint will handle Microsoft Azure AD authentication in the future.
 * Currently returns 501 (Not Implemented) as a placeholder.
 * 
 * FUTURE BEHAVIOR:
 * 1. Receive Azure ID token from frontend (in Authorization header)
 * 2. Validate token signature using Microsoft's public keys
 * 3. Extract user info (email, name) from token claims
 * 4. Check if user exists in LMS database (by email)
 * 5. If exists: Return existing user with LMS JWT
 * 6. If new: Create user with default role (Student), return LMS JWT
 * 7. LMS roles (Student/Trainer/Admin) are managed internally, NOT from Azure AD
 * 
 * AUTHENTICATION FLOW:
 * Frontend → Microsoft Login → Azure ID Token → This Endpoint → LMS JWT → Frontend
 * 
 * ROLE ASSIGNMENT LOGIC:
 * - New MSAL users: Default to "Student" role
 * - Existing users (matched by email): Keep existing role
 * - Admins can change roles via LMS admin panel
 * - Azure AD groups/roles are NOT used for LMS authorization
 * 
 * TO ENABLE THIS ENDPOINT:
 * 1. Install dependencies: npm install jsonwebtoken axios
 * 2. Implement token validation (see comments below)
 * 3. Update frontend to send ID token
 * 4. Test with real Azure AD tokens
 * 5. Remove 501 response and uncomment implementation
 */

/**
 * POST /api/auth/msal-login
 * 
 * REQUEST HEADERS:
 * Authorization: Bearer <Azure_ID_Token>
 * 
 * REQUEST BODY: (optional, for future use)
 * {
 *   "idToken": "eyJ0eXAiOiJKV1QiLCJhbGc..." // Azure ID token
 * }
 * 
 * SUCCESS RESPONSE (200):
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "user": {
 *     "_id": "...",
 *     "name": "John Doe",
 *     "email": "john@peopletech.com",
 *     "role": "Student"
 *   },
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // LMS JWT
 * }
 * 
 * ERROR RESPONSES:
 * 401: Invalid or expired Azure token
 * 500: Server error
 * 501: Not implemented (current state)
 */
router.post('/msal-login', async (req, res) => {
  try {
    console.log('🔵 MSAL Login Request Received');

    // Step 1: Extract Azure ID token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const idToken = authHeader.split(' ')[1];

    // Step 2: Validate Azure ID token
    // 🔐 SECURE IMPLEMENTATION with JWKS-RSA
    const jwt = require('jsonwebtoken');
    const jwksClient = require('jwks-rsa');

    // Helper: Verify token against a specific Tenant Configuration
    const verifyToken = (token, clientId, tenantId) => {
      return new Promise((resolve, reject) => {
        if (!clientId || !tenantId) return reject(new Error("Missing Config"));

        const client = jwksClient({
          jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
          cache: true,
          rateLimit: true,
        });

        function getKey(header, callback) {
          client.getSigningKey(header.kid, (err, key) => {
            if (err) return callback(err);
            const signingKey = key.getPublicKey();
            callback(null, signingKey);
          });
        }

        jwt.verify(token, getKey, {
          audience: clientId,
          issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
          algorithms: ['RS256']
        }, (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        });
      });
    };

    let decoded;
    try {
      // Try validating against Tenant 1 (People Tech)
      decoded = await verifyToken(idToken, process.env.MSAL_CLIENT_ID, process.env.MSAL_TENANT_ID);
      console.log('✅ Azure Token Verified (Tenant 1 - People Tech)');
    } catch (err1) {
      console.log('⚠️ Token not valid for Tenant 1. Trying Tenant 2...');
      try {
        // Try validating against Tenant 2 (Ramp Group)
        decoded = await verifyToken(idToken, process.env.MSAL_CLIENT_ID_RAMP, process.env.MSAL_TENANT_ID_RAMP);
        console.log('✅ Azure Token Verified (Tenant 2 - Ramp Group)');
      } catch (err2) {
        console.error('❌ Token validation failed for both tenants.');
        throw new Error('Invalid Azure Token: ' + err1.message);
      }
    }

    console.log('✅ Azure Token Verified. User:', decoded.name);

    // Step 3: Extract user info
    const oid = decoded.oid; // Azure Immutable Object ID
    const email = (decoded.email || decoded.preferred_username || '').toLowerCase();
    const name = decoded.name;

    if (!oid || !email) {
      return res.status(400).json({ success: false, message: 'Token missing required claims (oid, email)' });
    }

    // Step 4: Find or Create User
    const User = require('../models/User');

    // 4a. Try finding by Azure OID (Primary Identity)
    let user = await User.findOne({ azureOid: oid });

    // 4b. Fallback: Find by Email (Migration Scenario)
    if (!user) {
      console.log('⚠️ User not found by OID. Checking email fallback...');
      user = await User.findOne({ email: email });

      if (user) {
        // Link existing user to Azure OID
        console.log(`🔗 Linking existing user ${email} to Azure OID ${oid}`);
        user.azureOid = oid;

        // SAVE happens below after name check
      }
    }

    // 4b.2 Name Synchronization (Azure is Source of Truth)
    if (user && name) {
      const currentName = user.name || '';
      // Update if name is missing OR different (case-sensitive check is fine, or trim/compare)
      if (currentName.trim() !== name.trim()) {
        console.log(`🔄 Syncing Name for ${email}: "${currentName}" -> "${name}"`);
        user.name = name.trim();
        // Ensure to save if we modified name OR just linked OID
        await user.save();
      } else if (user.isModified('azureOid')) {
        // If we only linked OID but name matched
        await user.save();
      }
    }

    // 4c. Create New User
    if (!user) {
      console.log(`➕ Creating new MSAL user: ${email}`);
      user = await User.create({
        name: name || email.split('@')[0],
        email: email,
        role: 'Student', // Default role
        azureOid: oid,
        passwordHash: 'MSAL_AUTH_NO_PASSWORD',
        rewardPoints: 0,
        authType: 'MSAL',
        enrolledCourses: []
      });
    }

    // Step 5: Generate LMS JWT
    // We use our OWN token for internal RBAC, not the Azure token.
    const lmsToken = jwt.sign(
      {
        id: user._id,
        role: user.role // Internal Role (Master/Admin/Student)
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log(`✅ Login Successful for ${user.email} (${user.role})`);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: lmsToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId
      }
    });

  } catch (error) {
    console.error('❌ MSAL login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during MSAL login',
      error: error.message,
    });
  }
});

/**
 * HELPER FUNCTION: Validate Azure ID Token
 * 
 * This function will be implemented when MSAL is enabled.
 * It verifies the token signature using Microsoft's public keys.
 * 
 * LIBRARIES NEEDED:
 * - jsonwebtoken: npm install jsonwebtoken
 * - jwks-rsa: npm install jwks-rsa
 * 
 * IMPLEMENTATION EXAMPLE:
 * 
 * const jwt = require('jsonwebtoken');
 * const jwksClient = require('jwks-rsa');
 * 
 * const client = jwksClient({
 *   jwksUri: 'https://login.microsoftonline.com/common/discovery/v2.0/keys'
 * });
 * 
 * function getKey(header, callback) {
 *   client.getSigningKey(header.kid, (err, key) => {
 *     const signingKey = key.publicKey || key.rsaPublicKey;
 *     callback(null, signingKey);
 *   });
 * }
 * 
 * async function validateAzureToken(token) {
 *   return new Promise((resolve, reject) => {
 *     jwt.verify(token, getKey, {
 *       audience: process.env.MSAL_CLIENT_ID,
 *       issuer: `https://login.microsoftonline.com/${process.env.MSAL_TENANT_ID}/v2.0`,
 *     }, (err, decoded) => {
 *       if (err) reject(err);
 *       else resolve(decoded);
 *     });
 *   });
 * }
 */

module.exports = router;
