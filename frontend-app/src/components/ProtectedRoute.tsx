import React from 'react';
import { Navigate } from 'react-router-dom';
import auth from '../services/auth';

interface Props {
  children: JSX.Element;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<Props> = ({ children, requireAdmin = false, redirectTo }) => {
  if (!auth.isAuthenticated()) {
    return <Navigate to={redirectTo ?? '/login'} replace />;
  }

  if (requireAdmin && !auth.isAdmin()) {
    return <Navigate to={redirectTo ?? '/overview'} replace />;
  }

  return children;
};

export default ProtectedRoute;
