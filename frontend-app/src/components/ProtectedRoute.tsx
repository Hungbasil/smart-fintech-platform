import React from 'react';
import { Navigate } from 'react-router-dom';
import auth from '../services/auth';

interface Props {
  children: JSX.Element;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<Props> = ({ children, requireAdmin = false }) => {
  if (!auth.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !auth.isAdmin()) {
    return <Navigate to="/overview" replace />;
  }

  return children;
};

export default ProtectedRoute;
