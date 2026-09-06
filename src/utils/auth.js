// Utilitários de autenticação
import {
  isAdmin as checkAdmin,
  isVendedor as checkVendedor,
  isAdminFull as checkAdminFull,
} from './permissions';

// Verificar se o usuário está autenticado
export const isAuthenticated = () => {
  const user = localStorage.getItem('user');
  const authToken = localStorage.getItem('authToken');
  
  return !!(user && authToken);
};

// Obter dados do usuário logado
export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  if (!user) return null;
  
  try {
    return JSON.parse(user);
  } catch (error) {
    console.error('Erro ao parsear dados do usuário:', error);
    return null;
  }
};

// Verificar se o usuário é admin
export const isAdmin = () => {
  const user = getCurrentUser();
  return checkAdmin(user);
};

// Verificar se o usuário é admin_full
export const isAdminFull = () => {
  const user = getCurrentUser();
  return checkAdminFull(user);
};

// Verificar se o usuário é vendedor (inclui admin_concessionaria para acesso ao Novo Pedido)
export const isVendedor = () => {
  const user = getCurrentUser();
  return checkVendedor(user);
};

// Fazer logout
export const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
  localStorage.removeItem('carrinho');
  localStorage.removeItem('rememberMe');
  window.location.href = '/';
};

// Validar sessão
export const validateSession = () => {
  if (!isAuthenticated()) {
    logout();
    return false;
  }
  
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    const tokenParts = authToken.split('_');
    if (tokenParts.length === 3) {
      const tokenTime = parseInt(tokenParts[1]);
      const currentTime = Date.now();
      const tokenAge = currentTime - tokenTime;
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const maxAge = rememberMe
        ? 7 * 24 * 60 * 60 * 1000  // 7 dias se "lembrar de mim"
        : 24 * 60 * 60 * 1000;      // 24 horas padrão
      
      if (tokenAge > maxAge) {
        logout();
        return false;
      }
    }
  }
  
  return true;
};
