/**
 * routes/precificacaoParametros.js
 * Endpoints dos parâmetros globais da nova Precificação.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/precificacaoParametrosService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// GET /api/precificacao-parametros
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.buscarParametros();
  return res_.ok(res, data);
}));

// PUT /api/precificacao-parametros
router.put('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.salvarParametros(req.body);
  return res_.ok(res, data);
}));

module.exports = router;
