import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin, isAdminFull, isVendedor } from '../utils/permissions';

const ProtectedRoute = ({ children, requireAdmin = false, requireVendedor = false, requireAdminFull = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const tipoAdmin = isAdmin(user);
  const tipoVendedor = isVendedor(user);

  if (requireAdminFull && !isAdminFull(user)) {
    return <Navigate to="/dashboard-admin" replace />;
  }

  if (requireAdmin && !tipoAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireVendedor && !tipoVendedor) {
    return <Navigate to="/dashboard-admin" replace />;
  }

  return children;
};

export default ProtectedRoute;
