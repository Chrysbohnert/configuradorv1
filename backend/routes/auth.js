/**
 * routes/auth.js
 * Autenticação dedicada (login, refresh, logout, reset password).
 * Por enquanto login está em /api/users/login.
 * Migrar aqui quando implementar refresh token e logout.
 */

const { Router } = require('express');

const router = Router();

router.get('/ping', (_req, res) => {
  res.json({ success: true, message: 'auth route - em breve' });
});

module.exports = router;
