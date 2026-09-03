import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../services/api';

export default function ProtectedRoute({ children, user, adminOnly = false }) {
  const token = getToken();
  const location = useLocation();

  if (!token) {
    // If trying to access admin area without token, go to admin login
    if (adminOnly) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    // Otherwise go to participant login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If route is admin only and user is not admin
  if (adminOnly && user && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
}
