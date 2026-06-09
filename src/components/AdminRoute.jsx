import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * AdminRoute — Restricts access to admin users only
 * Non-admin users are redirected to dashboard
 */
export default function AdminRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Only admin can access
  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
