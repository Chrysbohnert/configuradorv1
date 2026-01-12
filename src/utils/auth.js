// Utilitários de autenticação

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
  return user?.tipo === 'admin' || user?.tipo === 'admin_concessionaria';
};

// Verificar se o usuário é vendedor
export const isVendedor = () => {
  const user = getCurrentUser();
  return user?.tipo === 'vendedor' || user?.tipo === 'vendedor_concessionaria';
};

// Fazer logout
export const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
  localStorage.removeItem('carrinho');
  window.location.href = '/';
};

// Validar sessão
export const validateSession = () => {
  if (!isAuthenticated()) {
    logout();
    return false;
  }
  
  // Verificar se o token não expirou (24 horas)
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    const tokenParts = authToken.split('_');
    if (tokenParts.length === 3) {
      const tokenTime = parseInt(tokenParts[1]);
      const currentTime = Date.now();
      const tokenAge = currentTime - tokenTime;
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas
      
      if (tokenAge > maxAge) {
        logout();
        return false;
      }
    }
  }
  
  return true;
};
