import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../../services/authService';
import { toast } from 'react-toastify';
import { COLORS, FONT_SIZES, SPACING, SHADOWS, BORDER_RADIUS, TRANSITIONS } from '../../constants/designSystem';
import { FaEye, FaEyeSlash, FaArrowLeft, FaCheck, FaTimes } from 'react-icons/fa';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const passwordChecks = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter (a-z)', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number (0-9)', test: (pw) => /\d/.test(pw) },
  {
    label: 'One special character (!@#$%^&*)',
    test: (pw) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(pw),
  },
];

export default function ResetPassword() {
  const query = useQuery();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    setToken(query.get('token') || '');
    setUserId(query.get('id') || '');
  }, [query]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await resetPassword({ userId, token, password });
      toast.success('Password reset successfully. You can now login.');
      navigate('/login');
    } catch (err) {
      console.error('ResetPassword error:', err);
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Password validation
  const pw = password;
  const checks = passwordChecks.map((rule) => rule.test(pw));
  const allValid = checks.every(Boolean);

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
    maxWidth: '500px',
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

  const infoBoxStyle = {
    backgroundColor: COLORS.infoLight,
    border: `1px solid ${COLORS.info}`,
    color: COLORS.info,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.bodySm,
    marginBottom: SPACING.lg,
  };

  const checklistStyle = {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.offWhite,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.bodySm,
  };

  const checkItemStyle = (isValid) => ({
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
    color: isValid ? COLORS.success : COLORS.textSecondary,
  });

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
  };

  const linkStyle = {
    color: COLORS.primary,
    textDecoration: 'none',
    fontWeight: 500,
    transition: `color ${TRANSITIONS.normal}`,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  };

  const footerStyle = {
    textAlign: 'center',
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTop: `1px solid ${COLORS.lightGray}`,
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={brandStyle}>PeopleTech LMS</div>
          <p style={subtitleStyle}>Set a new password for your account</p>
        </div>

        {/* Info Box */}
        <div style={infoBoxStyle}>
          Enter a strong password with uppercase, lowercase, numbers, and special characters.
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Password Field */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>New Password</label>
            <div style={inputWrapperStyle}>
              <input
                style={inputStyle}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
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

            {/* Password Strength Checklist */}
            {password && (
              <div style={checklistStyle}>
                {passwordChecks.map((rule, idx) => (
                  <div key={idx} style={checkItemStyle(checks[idx])}>
                    {checks[idx] ? (
                      <FaCheck style={{ color: COLORS.success }} />
                    ) : (
                      <FaTimes style={{ color: COLORS.textSecondary }} />
                    )}
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>Confirm Password</label>
            <div style={inputWrapperStyle}>
              <input
                style={inputStyle}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={loading}
                required
                onFocus={(e) => (e.target.style.borderColor = COLORS.primary)}
                onBlur={(e) => (e.target.style.borderColor = COLORS.lightGray)}
              />
              <div
                style={eyeIconStyle}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            style={buttonStyle}
            disabled={loading || !allValid}
            onMouseEnter={(e) => {
              if (!loading && allValid)
                e.target.style.backgroundColor = COLORS.primaryDark;
            }}
            onMouseLeave={(e) => {
              if (!loading && allValid)
                e.target.style.backgroundColor = COLORS.primary;
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        {/* Footer */}
        <div style={footerStyle}>
          <Link
            to="/login"
            style={linkStyle}
            onMouseEnter={(e) => (e.target.style.color = COLORS.primaryDark)}
            onMouseLeave={(e) => (e.target.style.color = COLORS.primary)}
          >
            <FaArrowLeft /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
