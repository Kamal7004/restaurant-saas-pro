import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  roles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles }) => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    // Redirect based on role
    if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'KITCHEN_STAFF') return <Navigate to="/kitchen" replace />;
    if (user.role === 'STAFF') return <Navigate to="/staff" replace />;
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

export const CustomerRoute: React.FC = () => {
  const session = (() => {
    try { return localStorage.getItem('tf_session') ? JSON.parse(localStorage.getItem('tf_session')!) : null; }
    catch { return null; }
  })();
  if (!session?.sessionToken) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
