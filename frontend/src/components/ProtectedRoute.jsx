// src/components/ProtectedRoute.jsx
import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, role }) => {
  const { token, user } = useSelector((state) => state.auth);
  const location = useLocation();

  // 🔒 HARD AUTH CHECK
  // If token is missing, user is logged out → always go to login
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 🔐 ROLE CHECK (NO silent redirect to dashboard/root)
  if (role) {
    const userRole = (user?.role || '').toLowerCase();
    const isMaster = userRole === 'master';

    if (Array.isArray(role)) {
      const allowed = role.map(r => (r || '').toLowerCase());

      if (isMaster && allowed.includes('admin')) {
        return children;
      }

      if (!allowed.includes(userRole)) {
        return <Navigate to="/login" replace />;
      }
    } else {
      const requiredRole = (role || '').toLowerCase();

      if (isMaster && requiredRole === 'admin') {
        return children;
      }

      if (userRole !== requiredRole) {
        return <Navigate to="/login" replace />;
      }
    }
  }

  // ✅ Access granted
  return children;
};

export default ProtectedRoute;
