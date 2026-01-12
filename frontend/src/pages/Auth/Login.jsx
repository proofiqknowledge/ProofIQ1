import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { useMsal } from "@azure/msal-react";
import { login as loginAPI } from '../../services/authService';
import api from '../../services/api';
import { setCredentials } from '../../redux/slices/authSlice';
import { COLORS, FONT_SIZES, SPACING, SHADOWS, BORDER_RADIUS, TRANSITIONS } from '../../constants/designSystem';
import { FaEye, FaEyeSlash, FaMicrosoft } from 'react-icons/fa';
import { loginRequest, MSAL_ENABLED } from '../../config/msalConfig';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { instance } = useMsal();

  // Helper to handle successful LMS login response
  const handleLmsLoginSuccess = (user, token) => {
    dispatch(
      setCredentials({
        user,
        token,
        role: user.role,
      })
    );

    localStorage.setItem('token', token);
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch (err) {
      // ignore storage errors
    }

    // Redirect based on role
    switch (user.role) {
      case 'Master': // Master uses Admin route
      case 'Admin':
        navigate('/admin');
        break;
      case 'Trainer':
        navigate('/trainer');
        break;
      case 'Student':
      default:
        navigate('/student');
        break;
    }
  };

  const handleLegacyLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginAPI(email, password);
      const { user, token } = res;
      handleLmsLoginSuccess(user, token);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Handle Redirect Response (When user returns from Microsoft)
  React.useEffect(() => {
    const handleResponse = async () => {
      try {
        const msalResponse = await instance.handleRedirectPromise();

        // If we have a response, it means we just came back from Microsoft Login
        if (msalResponse) {
          console.log("✅ Microsoft Redirect Successful. Verifying with Backend...");
          setLoading(true);

          const azureIdToken = msalResponse.idToken;

          // Exchange Azure Token for LMS Token
          const response = await api.post('/auth/msal-login', {}, {
            headers: {
              Authorization: `Bearer ${azureIdToken}`
            }
          });

          const { user, token } = response.data;
          console.log("✅ Backend Verification Successful. Logging in as:", user.email);
          handleLmsLoginSuccess(user, token);
          setLoading(false);
        }
      } catch (err) {
        // Ignore "interaction_in_progress" error which can happen on reload/redirect races
        if (err.name === 'BrowserAuthError' && (err.errorCode === 'interaction_in_progress' || err.message?.includes('interaction_in_progress'))) {
          console.warn("Recovering from MSAL interaction race condition (interaction_in_progress).");
          setLoading(false);
          return;
        }

        console.error("Redirect Login Failed:", err);
        setError("Login failed after redirect. Please try again.");
        setLoading(false);
      }
    };

    handleResponse();
  }, [instance]); // Run once on mount (and when instance is stable)

  const handleTenantLogin = async (targetTenant) => {
    // 1. Check current configured tenant
    const currentTenant = localStorage.getItem('msal_tenant') || 'ptg';

    // 2. If different, switch and reload to re-init MSAL
    if (currentTenant !== targetTenant) {
      localStorage.setItem('msal_tenant', targetTenant);
      window.location.reload();
      return;
    }

    // 3. If same, proceed with login
    setLoading(true);
    setError('');

    try {
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      console.error("Login Start Failed:", err);
      setError("Failed to start login process.");
      setLoading(false);
    }
  };

  // ===== INLINE STYLES =====
  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.offWhite,
    padding: SPACING.lg,
  };

  const cardStyle = {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    boxShadow: SHADOWS.lg,
    maxWidth: '450px',
    width: '100%',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: SPACING.xl,
  };

  const brandStyle = {
    fontSize: '28px',
    fontWeight: 700,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  };

  const subtitleStyle = {
    fontSize: FONT_SIZES.bodySm,
    color: COLORS.textSecondary,
  };

  const formGroupStyle = {
    marginBottom: SPACING.lg,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: SPACING.sm,
    fontWeight: 600,
    fontSize: FONT_SIZES.bodySm,
    color: COLORS.textPrimary,
  };

  const inputWrapperStyle = {
    position: 'relative',
  };

  const inputStyle = {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.md}`,
    border: `1px solid ${COLORS.lightGray}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.body,
    fontFamily: 'inherit',
    transition: `all ${TRANSITIONS.normal}`,
  };

  const eyeIconStyle = {
    position: 'absolute',
    right: SPACING.md,
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'pointer',
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.h5,
  };

  const errorStyle = {
    color: COLORS.danger,
    fontSize: FONT_SIZES.bodySm,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.dangerLight,
    borderRadius: BORDER_RADIUS.md,
  };

  const buttonStyle = {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.lg}`,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.body,
    fontWeight: 600,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    marginBottom: SPACING.lg,
  };

  const msalButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#2F2F2F', // Microsoft Dark Grey
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: 0
  };

  const linkStyle = {
    color: COLORS.primary,
    textDecoration: 'none',
    fontWeight: 500,
    transition: `color ${TRANSITIONS.normal}`,
  };

  const footerStyle = {
    textAlign: 'center',
    paddingTop: SPACING.lg,
    borderTop: `1px solid ${COLORS.lightGray}`,
    fontSize: FONT_SIZES.bodySm,
    color: COLORS.textSecondary,
  };

  const footerLinkStyle = {
    display: 'block',
    marginTop: SPACING.md,
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={brandStyle}>ProofIQ</div>
          <p style={subtitleStyle}>Login to continue your learning journey</p>
        </div>

        {/* Error Message */}
        {error && <div style={errorStyle}>{error}</div>}

        {/* MSAL LOGIN (PRIMARY) */}
        {MSAL_ENABLED && (
          <div style={{ marginBottom: SPACING.lg, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              style={msalButtonStyle}
              onClick={() => handleTenantLogin('ptg')}
              disabled={loading}
              onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = '#000000'; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = '#2F2F2F'; }}
            >
              {loading && localStorage.getItem('msal_tenant') === 'ptg' ? 'Redirecting...' : <><FaMicrosoft /> Sign in with ProofIQ</>}
            </button>

            <button
              type="button"
              style={{ ...msalButtonStyle, backgroundColor: '#0078D4' }} // Azure Blue
              onClick={() => handleTenantLogin('ramp')}
              disabled={loading}
              onMouseEnter={(e) => { if (!loading) e.target.style.backgroundColor = '#106EBE'; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.backgroundColor = '#0078D4'; }}
            >
              {loading && localStorage.getItem('msal_tenant') === 'ramp' ? 'Redirecting...' : <><FaMicrosoft /> Sign in with Ramp Group</>}
            </button>

            <p style={{ marginTop: SPACING.md, fontSize: '0.85rem', color: COLORS.textSecondary, textAlign: 'center' }}>
              Select your organization to sign in.
            </p>
          </div>
        )}

        {/* LEGACY LOGIN (FALLBACK) - Only shown if MSAL is DISABLED */}
        {!MSAL_ENABLED && (
          <form onSubmit={handleLegacyLogin}>
            {/* Email Field */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Email Address</label>
              <input
                style={inputStyle}
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                onFocus={(e) => (e.target.style.borderColor = COLORS.primary)}
                onBlur={(e) => (e.target.style.borderColor = COLORS.lightGray)}
              />
            </div>

            {/* Password Field */}
            <div style={formGroupStyle}>
              <label style={labelStyle}>Password</label>
              <div style={inputWrapperStyle}>
                <input
                  style={inputStyle}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  onFocus={(e) => (e.target.style.borderColor = COLORS.primary)}
                  onBlur={(e) => (e.target.style.borderColor = COLORS.lightGray)}
                />
                <div
                  style={eyeIconStyle}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </div>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div style={{ marginBottom: SPACING.lg }}>
              <Link
                to="/forgot-password"
                style={linkStyle}
                onMouseEnter={(e) => (e.target.style.color = COLORS.primaryDark)}
                onMouseLeave={(e) => (e.target.style.color = COLORS.primary)}
              >
                Forgot your password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              style={buttonStyle}
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.backgroundColor = COLORS.primaryDark;
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.backgroundColor = COLORS.primary;
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div style={footerStyle}>
          {!MSAL_ENABLED && (
            <>
              Don't have an account?{' '}
              <Link
                to="/register"
                style={{ ...linkStyle, ...footerLinkStyle }}
                onMouseEnter={(e) => (e.target.style.color = COLORS.primaryDark)}
                onMouseLeave={(e) => (e.target.style.color = COLORS.primary)}
              >
                Sign up here
              </Link>
            </>
          )}
          {MSAL_ENABLED && (
            <span style={{ fontSize: '0.8rem', color: COLORS.textSecondary }}>
              Protected by Microsoft Azure AD
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

