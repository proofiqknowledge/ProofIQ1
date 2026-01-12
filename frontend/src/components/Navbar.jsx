import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useMsal } from "@azure/msal-react";
import { logout } from '../redux/slices/authSlice';
import { COLORS, FONT_SIZES, SPACING, SHADOWS, TRANSITIONS } from '../constants/designSystem';
import NotificationCenter from './NotificationCenter';

export default function Navbar() {
  const { user, role, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { instance } = useMsal();

  const handleLogout = () => {
    dispatch(logout());
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // MSAL Logout
    // instance.logoutRedirect({
    //   postLogoutRedirectUri: window.location.origin,
    // });
  };

  const navbarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${SPACING.md} ${SPACING.lg}`,
    backgroundColor: COLORS.white,
    borderBottom: `1px solid ${COLORS.lightGray}`,
    boxShadow: SHADOWS.sm,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const navbarLeftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
  };

  const navbarBrandStyle = {
    fontSize: FONT_SIZES.h4,
    fontWeight: 700,
    color: COLORS.primary,
    textDecoration: 'none',
    transition: `color ${TRANSITIONS.normal}`,
    cursor: 'pointer',
  };

  const navbarRightStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
  };

  const navbarUserStyle = {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
  };

  const primaryBtnStyle = {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: FONT_SIZES.bodySm,
    fontWeight: 600,
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
  };

  const secondaryBtnStyle = {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.secondary,
    color: COLORS.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: FONT_SIZES.bodySm,
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    display: 'inline-block',
  };

  const tertiaryBtnStyle = {
    padding: `${SPACING.sm} ${SPACING.md}`,
    backgroundColor: COLORS.info,
    color: COLORS.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: FONT_SIZES.bodySm,
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: `all ${TRANSITIONS.normal}`,
    display: 'inline-block',
  };

  return (
    <div style={navbarStyle}>
      {/* LEFT SIDE - Logo */}
      <div style={navbarLeftStyle}>
        <Link to="/" style={{ ...navbarBrandStyle }}>
          ProofIQ
        </Link>
      </div>

      {/* RIGHT SIDE - User & Auth */}
      <div style={navbarRightStyle}>
        {token ? (
          <>
            <NotificationCenter />
            <div style={navbarUserStyle}>
              <span>👤</span>
              <span>Hi {user?.name || 'User'}</span>
            </div>
            <button
              style={primaryBtnStyle}
              onMouseEnter={(e) => (e.target.style.backgroundColor = COLORS.primaryDark)}
              onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.primary)}
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              style={secondaryBtnStyle}
              onMouseEnter={(e) => (e.target.style.backgroundColor = COLORS.secondaryDark)}
              onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.secondary)}
            >
              Login
            </Link>
            {/* <Link
              to="/register"
              style={tertiaryBtnStyle}
              onMouseEnter={(e) => (e.target.style.backgroundColor = COLORS.primaryDark)}
              onMouseLeave={(e) => (e.target.style.backgroundColor = COLORS.primary)}
            >
              Register
            </Link> */}
          </>
        )}
      </div>
    </div>
  );
}
