import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * AdminRoute — Restricts access to global admins only
 * Local or non-admin users are redirected to dashboard
 */
export default function AdminRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Only global admins can access (isGlobal = true)
  if (!currentUser || (!currentUser.isGlobal && !currentUser.is_global)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
