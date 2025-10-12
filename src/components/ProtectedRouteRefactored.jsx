/**
 * 🛡️ ProtectedRoute Refatorado - Suporta Supabase Auth + Local
 * 
 * Verifica autenticação via:
 * 1. Supabase Auth Session (prioridade)
 * 2. Local Storage (fallback)
 */

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import { getCurrentUser, validateSession } from '../utils/auth';

const ProtectedRouteRefactored = ({ children, requireAdmin = false, requireVendedor = false }) => {
  const [authState, setAuthState] = useState({
    loading: true,
    authenticated: false,
    user: null,
    tipo: null
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // 1. Verificar Supabase Auth Session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && session.user) {
        console.log('✅ Sessão Supabase ativa');
        
        // Extrair tipo do user_metadata
        const userMetadata = session.user.user_metadata || {};
        const tipo = userMetadata.tipo || 'vendedor';
        
        setAuthState({
          loading: false,
          authenticated: true,
          user: session.user,
          tipo: tipo
        });
        return;
      }

      // 2. Fallback: Verificar autenticação local
      console.log('⚠️ Sem sessão Supabase, verificando local...');
      const localUser = getCurrentUser();
      const sessionValid = validateSession();
      
      if (localUser && sessionValid) {
        console.log('✅ Autenticação local válida');
        
        setAuthState({
          loading: false,
          authenticated: true,
          user: localUser,
          tipo: localUser.tipo
        });
        return;
      }

      // 3. Não autenticado
      console.log('❌ Sem autenticação válida');
      setAuthState({
        loading: false,
        authenticated: false,
        user: null,
        tipo: null
      });
      
    } catch (error) {
      console.error('❌ Erro ao verificar autenticação:', error);
      setAuthState({
        loading: false,
        authenticated: false,
        user: null,
        tipo: null
      });
    }
  };

  // Loading
  if (authState.loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #000',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Verificando autenticação...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Não autenticado
  if (!authState.authenticated) {
    console.log('🔒 Acesso negado - redirecionando para login');
    return <Navigate to="/" replace />;
  }

  // Verificar permissões por tipo
  const isAdmin = authState.tipo === 'admin';
  const isVendedor = authState.tipo === 'vendedor';

  // Requer admin mas não é
  if (requireAdmin && !isAdmin) {
    console.log('🔒 Acesso negado - requer admin');
    return <Navigate to="/dashboard" replace />;
  }

  // Requer vendedor mas não é
  if (requireVendedor && !isVendedor) {
    console.log('🔒 Acesso negado - requer vendedor');
    return <Navigate to="/dashboard-admin" replace />;
  }

  // Autenticado e com permissões
  console.log(`✅ Acesso autorizado - ${authState.tipo}`);
  return children;
};

export default ProtectedRouteRefactored;

