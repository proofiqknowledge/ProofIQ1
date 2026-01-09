import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../../services/authService';
import { toast } from 'react-toastify';
import { COLORS, FONT_SIZES, SPACING, SHADOWS, BORDER_RADIUS, TRANSITIONS } from '../../constants/designSystem';
import { FaArrowLeft, FaCopy, FaCheck } from 'react-icons/fa';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await requestPasswordReset(email);
      toast.success(
        res.message || 'If that email exists, a reset link has been sent'
      );

      if (res.resetUrl) {
        setResetUrl(res.resetUrl);
        toast.info('Reset link available (dev) — copy it below', {
          autoClose: 8000,
        });
      } else {
        setResetUrl('');
      }

      setEmail('');
    } catch (err) {
      console.error('ForgotPassword error:', err);
      toast.error(
        err.response?.data?.message || 'Failed to request reset'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResetUrl = () => {
    navigator.clipboard.writeText(resetUrl);
    setCopied(true);
    toast.success('Reset link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
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

  const inputStyle = {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.md}`,
    border: `1px solid ${COLORS.lightGray}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.body,
    fontFamily: 'inherit',
    transition: `all ${TRANSITIONS.normal}`,
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

  const resetUrlBoxStyle = {
    backgroundColor: COLORS.offWhite,
    border: `1px solid ${COLORS.lightGray}`,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    wordBreak: 'break-all',
    fontSize: FONT_SIZES.bodySm,
    color: COLORS.textPrimary,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const copyButtonStyle = {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    border: 'none',
    borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer',
    fontSize: FONT_SIZES.bodySm,
    fontWeight: 600,
    transition: `all ${TRANSITIONS.normal}`,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    marginLeft: SPACING.md,
    whiteSpace: 'nowrap',
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
          <p style={subtitleStyle}>Reset Your Password</p>
        </div>

        {/* Info Box */}
        <div style={infoBoxStyle}>
          Enter your account email and we'll send a reset link.
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
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

          {/* Submit Button */}
          <button
            type="submit"
            style={buttonStyle}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading)
                e.target.style.backgroundColor = COLORS.primaryDark;
            }}
            onMouseLeave={(e) => {
              if (!loading) e.target.style.backgroundColor = COLORS.primary;
            }}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        {/* Dev Reset URL Box */}
        {resetUrl && (
          <div style={formGroupStyle}>
            <label style={labelStyle}>Reset Link (Development Only)</label>
            <div style={resetUrlBoxStyle}>
              <span style={{ flex: 1, marginRight: SPACING.md }}>
                {resetUrl}
              </span>
              <button
                type="button"
                style={copyButtonStyle}
                onClick={handleCopyResetUrl}
                onMouseEnter={(e) =>
                  (e.target.style.backgroundColor = COLORS.primaryDark)
                }
                onMouseLeave={(e) =>
                  (e.target.style.backgroundColor = COLORS.primary)
                }
              >
                {copied ? (
                  <>
                    <FaCheck /> Copied
                  </>
                ) : (
                  <>
                    <FaCopy /> Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}

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
