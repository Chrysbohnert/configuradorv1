import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GuindasteLoading from './GuindasteLoading';

const ProtectedRoute = ({ 
  children, 
  allowedTypes = ['vendedor', 'admin'],
  redirectTo = '/'
}) => {
  const { isAuthenticated, isLoading, user, hasPermission } = useAuth();
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return <GuindasteLoading text="Verificando autenticação..." />;
  }

  // Se não está autenticado, redirecionar para login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Se não tem permissão, redirecionar para dashboard apropriado
  if (!hasPermission(allowedTypes)) {
    const userType = user?.tipo;
    
    if (userType === 'admin') {
      return <Navigate to="/dashboard-admin" replace />;
    } else if (userType === 'vendedor') {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return children;
};

export default ProtectedRoute; 