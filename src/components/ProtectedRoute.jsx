import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false, requireVendedor = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const tipoAdmin = user.tipo === 'admin' || user.tipo === 'admin_concessionaria';
  const tipoVendedor = user.tipo === 'vendedor' || user.tipo === 'vendedor_concessionaria' || user.tipo === 'vendedor_exterior' || user.tipo === 'admin_concessionaria';

  if (requireAdmin && !tipoAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireVendedor && !tipoVendedor) {
    return <Navigate to="/dashboard-admin" replace />;
  }

  return children;
};

export default ProtectedRoute;
