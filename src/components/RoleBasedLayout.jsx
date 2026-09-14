import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin, isVendedor } from '../utils/permissions';
import AdminLayout from './AdminLayout';
import VendedorLayout from './VendedorLayout';

const RoleBasedLayout = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (isAdmin(user)) return <AdminLayout />;
  if (isVendedor(user)) return <VendedorLayout />;

  return <Outlet />;
};

export default RoleBasedLayout;
