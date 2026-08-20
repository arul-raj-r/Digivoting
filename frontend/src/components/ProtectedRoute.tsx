import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: 'ADMIN' | 'VOTER';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gov-light dark:bg-gov-dark">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    // If voter tries to access admin or vice versa, redirect appropriately
    return <Navigate to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};
