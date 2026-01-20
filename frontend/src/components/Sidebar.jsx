import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import {
  FaBook,
  FaChartLine,
  FaCertificate,
  FaTasks,
  FaHome,
  FaClipboardList,
  FaPenFancy,
  FaBlog,
  FaEdit,
  FaCog,
  FaChartBar,
  FaVideo,
  FaRedo,
  FaCheckCircle,
  FaUserGraduate,
  FaBookOpen,
  FaCode,
  FaUsers,
} from 'react-icons/fa';

import { COLORS, FONT_SIZES, TRANSITIONS } from '../constants/designSystem';

export default function Sidebar({ isHovered, onHoverChange }) {
  const { role, token } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!token) return null;

  // ==========================================================
  // ⭐ NAVIGATION LINKS
  // ==========================================================

  const links = [
    // ==========================================
    // 1. DASHBOARD / OVERVIEW
    // ==========================================
    { to: '/admin', label: 'Dashboard', icon: FaHome, show: role === 'Admin' || role === 'Master' },
    { to: '/trainer', label: 'Dashboard', icon: FaHome, show: role === 'Trainer' },
    { to: '/student', label: 'Dashboard', icon: FaHome, show: role === 'Student' },

    // ==========================================
    // 2. USER & ROLE MANAGEMENT
    // ==========================================
    { to: '/admin/manage-users', label: 'Manage Users', icon: FaUsers, show: role === 'Admin' },

    // ==========================================
    // 3. LEARNING & CONTENT MANAGEMENT
    // ==========================================
    // Admin / Master
    { to: '/admin/courses', label: 'Manage Courses', icon: FaCog, show: role === 'Admin' || role === 'Master' },

    // Trainer / Admin / Master
    { to: '/trainer/batches/progress', label: 'Batch Progress', icon: FaChartBar, show: role === 'Trainer' || role === 'Admin' || role === 'Master' },

    // Course Views (Role Specific Labels/Icons)
    { to: '/courses', label: 'My Library', icon: FaBookOpen, show: role === 'Student' },
    { to: '/courses', label: 'Courses', icon: FaBook, show: role === 'Trainer' },
    { to: '/courses', label: 'Courses', icon: FaUserGraduate, show: role === 'Admin' || role === 'Master' },

    // ==========================================
    // 4. ASSESSMENTS / EXAMS
    // ==========================================
    // Student
    { to: '/exams', label: 'Assessments', icon: FaClipboardList, show: role === 'Student' },

    // Admin / Master
    { to: '/admin/exams', label: 'Assessments', icon: FaTasks, show: role === 'Admin' || role === 'Master' },
    { to: '/admin/reexam-requests', label: 'Re-Assessment Requests', icon: FaRedo, show: role === 'Admin' || role === 'Master' },
    { to: '/admin/rewatch-requests', label: 'Rewatch Requests', icon: FaVideo, show: role === 'Admin' || role === 'Master' },

    // Trainer
    { to: '/trainer/exam-evaluations', label: 'Assessments Evaluations', icon: FaPenFancy, show: role === 'Trainer' },
    { to: '/trainer/rewatch-requests', label: 'Rewatch Requests', icon: FaVideo, show: role === 'Trainer' },

    // ==========================================
    // 5. PERFORMANCE & REPORTS
    // ==========================================
    { to: '/certificates/my', label: 'Certificates', icon: FaCertificate, show: role === 'Student' },
    { to: '/leaderboard', label: 'Leaderboard', icon: FaChartLine, show: true },

    // ==========================================
    // 6. COMMUNICATION & COLLABORATION
    // ==========================================
    { to: '/community/blogs/my', label: 'My Blogs', icon: FaEdit, show: role === 'Student' },
    { to: '/community/blogs', label: 'Community Blogs', icon: FaBlog, show: true },
    { to: '/community/study-groups', label: 'Study Groups', icon: FaUsers, show: true },
    { to: '/admin/blogs/reviews', label: 'Blog Reviews', icon: FaCheckCircle, show: role === 'Master' },

    // ==========================================
    // 7. SYSTEM / CONFIGURATION
    // ==========================================
    { to: '/playground', label: 'Coding Playground', icon: FaCode, show: true },
  ];

  const filteredLinks = links.filter((l) => l.show);

  // To check active route
  const isActiveLink = (path) => location.pathname === path;

  // Sidebar sizes
  const COLLAPSED_WIDTH = 70;
  const EXPANDED_WIDTH = 250;

  // Sidebar style
  const sidebarStyle = {
    position: 'fixed',
    left: 0,
    top: '70px',
    width: isHovered ? `${EXPANDED_WIDTH}px` : `${COLLAPSED_WIDTH}px`,
    height: 'calc(100vh - 70px)',
    backgroundColor: COLORS.secondary,
    transition: `width ${TRANSITIONS.normal}`,
    boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
    overflowY: 'auto',
    zIndex: 100,
  };

  const linkStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: isHovered ? 'flex-start' : 'center',
    gap: isHovered ? '16px' : 0,
    paddingLeft: isHovered ? '20px' : '0px',
    paddingRight: isHovered ? '20px' : '0px',
    paddingTop: '12px',
    paddingBottom: '12px',
    color: COLORS.white,
    backgroundColor: active ? COLORS.primary : 'transparent',
    textDecoration: 'none',
    fontSize: FONT_SIZES.bodySm,
    fontWeight: 500,
    minHeight: '56px',
    cursor: 'pointer',
    borderLeft: active ? `4px solid ${COLORS.white}` : '4px solid transparent',
    transition: `all ${TRANSITIONS.normal}`,
    boxSizing: 'border-box',
  });

  const iconWrapper = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    fontSize: '20px',
    flexShrink: 0,
  };

  const labelStyle = {
    opacity: isHovered ? 1 : 0,
    visibility: isHovered ? 'visible' : 'hidden',
    transition: `opacity ${TRANSITIONS.fast}`,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div
      style={sidebarStyle}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', paddingBottom: '20px' }}>
        {filteredLinks.map((item, index) => {
          const Icon = item.icon;
          const active = isActiveLink(item.to);

          return (
            <Link
              key={`${item.to}-${index}`}
              to={item.to}
              style={linkStyle(active)}
              title={!isHovered ? item.label : ''}
            >
              <div style={iconWrapper}>
                <Icon />
              </div>
              <span style={labelStyle}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
