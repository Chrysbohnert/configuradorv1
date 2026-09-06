/**
 * routes/precificacaoSimulador.js
 * Endpoints do simulador e histórico da nova Precificação.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const simuladorSvc = require('../services/precificacaoSimuladorService');
const historicoSvc = require('../services/precificacaoHistoricoService');
const { requireAuth, requireAdminFull } = require('../middleware/auth');

const router = Router();

// POST /api/precificacao/simular — calcula preço sem salvar proposta
router.post('/simular', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const { resultado } = await simuladorSvc.simular(req.body, req.user);
  return res_.ok(res, resultado);
}));

// POST /api/precificacao/simular-salvar — calcula e guarda snapshot no histórico
router.post('/simular-salvar', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const { resultado, snapshot } = await simuladorSvc.simular(req.body, req.user);
  const historico = await historicoSvc.create(snapshot);
  return res_.ok(res, { resultado, historico_id: historico.id });
}));

// GET /api/precificacao/historico — lista snapshots
router.get('/historico', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const data = await historicoSvc.findAll({
    guindaste_id: req.query.guindaste_id,
    limit: req.query.limit ? Number(req.query.limit) : 100,
  });
  return res_.ok(res, data, { count: data.length });
}));

// GET /api/precificacao/historico/:id — detalhe de um snapshot
router.get('/historico/:id', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const data = await historicoSvc.findById(req.params.id);
  if (!data) return res_.notFound(res, 'Snapshot não encontrado');
  return res_.ok(res, data);
}));

// DELETE /api/precificacao/historico/:id — remove snapshot
router.delete('/historico/:id', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const removed = await historicoSvc.remove(req.params.id);
  if (!removed) return res_.notFound(res, 'Snapshot não encontrado');
  return res_.ok(res, { message: 'Snapshot removido' });
}));

module.exports = router;
