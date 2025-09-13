import React from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser, isAdmin, isVendedor } from '../utils/auth';

const ProtectedRoute = ({ children, requireAdmin = false, requireVendedor = false }) => {
  const user = getCurrentUser();
  
  // Se não há usuário logado
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  // Se requer admin mas usuário não é admin
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Se requer vendedor mas usuário não é vendedor
  if (requireVendedor && !isVendedor()) {
    return <Navigate to="/dashboard-admin" replace />;
  }
  
  return children;
};

export default ProtectedRoute;
