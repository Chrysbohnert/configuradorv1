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
  return user?.tipo === 'vendedor' || user?.tipo === 'vendedor_concessionaria' || user?.tipo === 'vendedor_exterior';
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
