const jwt = require('jsonwebtoken');
const {
  isAdmin,
  isAdminFull,
  canalDoUsuario,
} = require('../utils/permissions');

const JWT_SECRET = process.env.JWT_SECRET || 'stark-dev-secret-fallback';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    req.user.tipo = req.user.tipo || req.user.role || 'vendedor';
    req.user.canal = req.user.canal || canalDoUsuario(req.user);

    console.log('[AUTH ME]', { userId: req.user?.id, tipo: req.user?.tipo, canal: req.user?.canal });
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido';
    console.warn('[AUTH ME] Falha na verificação do token:', err.name, err.message);
    return res.status(401).json({ success: false, error: msg });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Não autenticado' });
  if (!isAdmin(req.user)) {
    return res.status(403).json({ success: false, error: 'Acesso negado: apenas administradores' });
  }
  next();
}

function requireAdminFull(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Não autenticado' });
  if (!isAdminFull(req.user)) {
    return res.status(403).json({ success: false, error: 'Acesso negado: apenas admin_full' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, error: 'Não autenticado' });
    if (!roles.includes(req.user.tipo)) {
      return res.status(403).json({ success: false, error: `Acesso negado. Perfil necessário: ${roles.join(' ou ')}` });
    }
    next();
  };
}

module.exports = { requireAuth, requireAdmin, requireAdminFull, requireRole };
