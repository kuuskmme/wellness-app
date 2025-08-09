// src/components/ProtectedRoute.js - Protected Route Component
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireVerified = true }) => {
  const { isAuthenticated, isVerified, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Not verified - redirect to verification pending page
  if (requireVerified && !isVerified) {
    return <Navigate to="/verify-pending" replace />;
  }

  return children;
};

export default ProtectedRoute;