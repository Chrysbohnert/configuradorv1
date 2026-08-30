/**
 * routes/precificacao.js
 * Endpoints para gerenciamento de precificação por equipamento/referência.
 * Acesso restrito a Admin. Frete e instalação continuam nas fontes atuais.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/precificacaoService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// GET /api/precificacao/equipamentos — lista todos os guindastes com custo e regras
router.get('/equipamentos', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.listarEquipamentosComCusto();
  return res_.ok(res, data, { count: data.length });
}));

router.post('/importar', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.importarAtomico(req.body || {});
  return res_.ok(res, data);
}));

// POST /api/precificacao — cria ou atualiza precificação de um equipamento
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { guindaste_id } = req.body;
  if (!guindaste_id) return res_.badRequest(res, 'guindaste_id é obrigatório');
  const data = await svc.upsert(req.body);
  return res_.ok(res, data);
}));

module.exports = router;
