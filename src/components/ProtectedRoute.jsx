import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isAdmin, isAdminFull, isAdminCanalRepresentantes, isAdminCanalInterno, isAdminConcessionaria, isVendedor, podeAcessarMapaTerritorial } from '../utils/permissions';
import { db } from '../config/supabase';
import { isConcessionariaInterna } from '../config/concessionariasInternas';

const ProtectedRoute = ({ children, requireAdmin = false, requireVendedor = false, requireAdminFull = false, requireDescontoExtra = false, requireMapaTerritorial = false }) => {
  const { user, loading } = useAuth();
  const [concessionariaVerificada, setConcessionariaVerificada] = useState(null);

  useEffect(() => {
    if (!requireMapaTerritorial || !isAdminConcessionaria(user) || !user?.concessionaria_id) return;
    db.getConcessionariaById(user.concessionaria_id)
      .then((concessionaria) => setConcessionariaVerificada({ id: user.concessionaria_id, interna: isConcessionariaInterna(concessionaria) }))
      .catch(() => setConcessionariaVerificada({ id: user.concessionaria_id, interna: false }));
  }, [requireMapaTerritorial, user]);

  const verificandoConcessionaria = requireMapaTerritorial && isAdminConcessionaria(user) && user?.concessionaria_id && concessionariaVerificada?.id !== user.concessionaria_id;
  const concessionariaInterna = concessionariaVerificada?.id === user?.concessionaria_id && concessionariaVerificada?.interna;

  if (loading || verificandoConcessionaria) {
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

  if (requireDescontoExtra && !isAdminFull(user) && !isAdminCanalRepresentantes(user) && !isAdminCanalInterno(user)) {
    return <Navigate to="/dashboard-admin" replace />;
  }

  if (requireMapaTerritorial && !podeAcessarMapaTerritorial(user, concessionariaInterna)) {
    return <Navigate to="/dashboard" replace />;
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
