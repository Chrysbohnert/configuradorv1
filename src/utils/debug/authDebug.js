/**
 * Funções de debug para autenticação
 * Disponíveis apenas em desenvolvimento
 */

import { supabase } from '../../config/supabase';
import { verifyPassword } from '../passwordHash';

export const debugAuth = {
  /**
   * Debug completo da autenticação
   */
  async debugAuth() {
    try {
      console.log('🔍 DEBUG: Verificando autenticação completa...');
      
      // Verificar localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const userObj = JSON.parse(userData);
        console.log('✅ Usuário no localStorage:', {
          nome: userObj.nome,
          email: userObj.email,
          tipo: userObj.tipo
        });
      } else {
        console.log('❌ Nenhum usuário no localStorage');
      }
      
      // Verificar sessão do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔑 Sessão Supabase:', session ? 'Ativa' : 'Inativa');
      
      // Verificar usuário do Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('👤 Usuário Supabase:', user ? 'Autenticado' : 'Não autenticado');
      
      if (session) {
        console.log('📋 Detalhes da sessão:');
        console.log('  - Email:', session.user.email);
        console.log('  - Expira em:', new Date(session.expires_at * 1000).toLocaleString());
      }
      
      if (user) {
        console.log('📋 Detalhes do usuário:');
        console.log('  - ID:', user.id);
        console.log('  - Email:', user.email);
      }
      
      // Recomendações
      if (!session) {
        console.log('💡 RECOMENDAÇÃO: Faça login novamente para ativar a sessão Supabase');
      } else {
        console.log('✅ Sessão Supabase ativa e funcionando');
      }
      
      return { userData, session, user };
    } catch (error) {
      console.error('❌ Erro no debug:', error);
    }
  },

  /**
   * Verifica apenas o status da sessão
   */
  async checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔑 Status da sessão:', session ? '✅ Ativa' : '❌ Inativa');
    return session;
  },

  /**
   * Limpa dados de autenticação
   */
  async clearAuth() {
    localStorage.removeItem('user');
    localStorage.removeItem('supabaseSession');
    await supabase.auth.signOut();
    console.log('🧹 Dados de autenticação limpos');
  }
};

/**
 * Debug de login - verifica credenciais no banco local
 */
export const debugLogin = async (email, senha) => {
  try {
    console.log('🔍 DEBUG LOGIN: Verificando credenciais...');
    
    // Buscar usuário no banco
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);
    
    if (error) {
      console.error('❌ Erro ao buscar usuário:', error);
      return { user: null, isValidPassword: false, isHashed: false };
    }
    
    const user = users?.[0];
    
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return { user: null, isValidPassword: false, isHashed: false };
    }
    
    console.log('✅ Usuário encontrado:', user.email);
    
    // Verificar se a senha está em hash
    const isHashed = user.senha && user.senha.length === 64; // SHA256 tem 64 caracteres
    
    if (!isHashed) {
      console.log('⚠️ Senha não está em hash');
      return { user, isValidPassword: false, isHashed: false };
    }
    
    // Verificar senha
    const isValidPassword = verifyPassword(senha, user.senha);
    
    if (isValidPassword) {
      console.log('✅ Senha válida');
    } else {
      console.log('❌ Senha inválida');
    }
    
    return { user, isValidPassword, isHashed };
  } catch (error) {
    console.error('❌ Erro no debugLogin:', error);
    return { user: null, isValidPassword: false, isHashed: false };
  }
};

// Expor no window apenas em DEV
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.debugAuth = debugAuth.debugAuth;
  window.checkSession = debugAuth.checkSession;
  window.clearAuth = debugAuth.clearAuth;
  window.debugLogin = debugLogin;
}

