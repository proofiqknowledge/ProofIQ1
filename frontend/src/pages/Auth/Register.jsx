import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerAPI } from '../../services/authService';
import { setCredentials } from '../../redux/slices/authSlice';
import { COLORS, FONT_SIZES, SPACING, SHADOWS, BORDER_RADIUS, TRANSITIONS } from '../../constants/designSystem';
import { FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';

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

const roleOptions = ['Student', 'Trainer'];


export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    // designation: '',
    // yearsOfExperience: '',
    confirm: '',
    role: 'Student',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.password || !form.role) {
      setError('Please fill all fields');
      return;
    }

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      };
      if (form.employeeId) payload.employeeId = String(form.employeeId).toUpperCase().trim();
      if (form.role === 'Trainer') {
        if (form.designation) payload.designation = form.designation;
        if (form.yearsOfExperience !== '') payload.yearsOfExperience = Number(form.yearsOfExperience);
      }


      const res = await registerAPI(payload);
      dispatch(
        setCredentials({
          user: res.user,
          token: res.token,
          role: res.user.role,
        })
      );

      localStorage.setItem('token', res.token);

      toast.success('🎉 Registration successful! Welcome to PeopleTech LMS.', {
        position: 'top-center',
        autoClose: 3000,
        theme: 'light',
      });

      setTimeout(() => {
        
        if (res.user.role === 'Trainer') navigate('/trainer');
        else if (res.user.role === 'Admin') navigate('/admin');
        else navigate('/student');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Password validation
  const pw = form.password;
  const checks = passwordChecks.map((rule) => rule.test(pw));
  const allValid = checks.every(Boolean);
  // Employee ID validation (optional but must match EMP + digits when present)
  const empValid = true; 
  const yearsValid = form.yearsOfExperience === '' || /^[0-9]+$/.test(String(form.yearsOfExperience));

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
    maxHeight: '90vh',
    overflowY: 'auto',
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

  const selectStyle = {
    width: '100%',
    padding: `${SPACING.md} ${SPACING.md}`,
    border: `1px solid ${COLORS.lightGray}`,
    borderRadius: BORDER_RADIUS.md,
    fontSize: FONT_SIZES.body,
    fontFamily: 'inherit',
  };

  const errorStyle = {
    color: COLORS.danger,
    fontSize: FONT_SIZES.bodySm,
    marginTop: SPACING.sm,
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.dangerLight,
    borderRadius: BORDER_RADIUS.md,
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
    marginBottom: SPACING.lg,
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
          <div style={brandStyle}>PeopleTech LMS</div>
          <p style={subtitleStyle}>Sign up to start learning — choose your role</p>
        </div>

        {/* Error Message */}
        {error && <div style={errorStyle}>{error}</div>}

        {/* Form */}
        <form onSubmit={handleRegister}>
          {/* Name Field */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>Full Name</label>
            <input
              style={inputStyle}
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={form.name}
              onChange={handleChange}
              disabled={loading}
              required
              onFocus={(e) => (e.target.style.borderColor = COLORS.primary)}
              onBlur={(e) => (e.target.style.borderColor = COLORS.lightGray)}
            />
          </div>

          {/* Email Field */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>Email Address</label>
            <input
              style={inputStyle}
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
              required
              onFocus={(e) => (e.target.style.borderColor = COLORS.primary)}
              onBlur={(e) => (e.target.style.borderColor = COLORS.lightGray)}
            />
          </div>

          {/* Employee ID (optional) */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>Employee ID (optional)</label>
            <input
              type="text"
              name="employeeId"
              value={form.employeeId}
              onChange={handleChange}
              placeholder="1916"  // ✅ Updated placeholder
              style={inputStyle}  // ✅ Removed conditional error styling
            />
            
          </div>

          {/* Role Selection */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>Role</label>
            <select
              style={selectStyle}
              name="role"
              value={form.role}
              onChange={handleChange}
              disabled={loading}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          {/* Password Field */}
          <div style={formGroupStyle}>
            <label style={labelStyle}>Password</label>
            <div style={inputWrapperStyle}>
              <input
                style={inputStyle}
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Create a strong password"
                value={form.password}
                onChange={handleChange}
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
            {form.password && (
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
                name="confirm"
                placeholder="Confirm your password"
                value={form.confirm}
                onChange={handleChange}
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

          

          {/* Admin extra fields */}
          {form.role === 'Admin' && (
            <>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Admin Code (optional)</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="adminCode"
                  placeholder="e.g. ADM001"
                  value={form.adminCode || ''}
                  onChange={(e) => setForm({ ...form, adminCode: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Department (optional)</label>
                <input
                  style={inputStyle}
                  type="text"
                  name="department"
                  placeholder="e.g. Management"
                  value={form.department || ''}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  disabled={loading}
                />
              </div>
            </>
          )}


          {/* Submit Button */}
          <button
            type="submit"
            style={buttonStyle}
            disabled={loading || !allValid || !empValid}
            onMouseEnter={(e) => {
              if (!loading && allValid)
                e.target.style.backgroundColor = COLORS.primaryDark;
            }}
            onMouseLeave={(e) => {
              if (!loading && allValid)
                e.target.style.backgroundColor = COLORS.primary;
            }}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        {/* Footer */}
        <div style={footerStyle}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ ...linkStyle, ...footerLinkStyle }}
            onMouseEnter={(e) => (e.target.style.color = COLORS.primaryDark)}
            onMouseLeave={(e) => (e.target.style.color = COLORS.primary)}
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
