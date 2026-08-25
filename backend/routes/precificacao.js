/**
 * routes/precificacao.js
 * Endpoints para gerenciamento de regras de precificação
 * e preços de venda calculados por UF.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/precificacaoService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// GET /api/precificacao/regras — lista todas as regras (ativas e inativas)
router.get('/regras', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.findAllRegras();
  return res_.ok(res, data, { count: data.length });
}));

// GET /api/precificacao/regras/:uf — regra de uma UF específica ou default
router.get('/regras/:uf', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.findRegraByUf(req.params.uf);
  if (!data) return res_.notFound(res, 'Regra não encontrada');
  return res_.ok(res, data);
}));

// POST /api/precificacao/regras — cria ou atualiza uma regra por UF
router.post('/regras', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.upsertRegra(req.body);
  return res_.ok(res, data);
}));

// PUT /api/precificacao/regras/:id — atualiza uma regra existente
router.put('/regras/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const existing = await svc.findRegraById(req.params.id);
  if (!existing) return res_.notFound(res, 'Regra não encontrada');
  const data = await svc.upsertRegra({ ...req.body, id: existing.id });
  return res_.ok(res, data);
}));

// DELETE /api/precificacao/regras/:id — remove uma regra
router.delete('/regras/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const removed = await svc.removeRegra(req.params.id);
  if (!removed) return res_.notFound(res, 'Regra não encontrada');
  return res_.ok(res, { message: 'Regra removida' });
}));

// GET /api/precificacao/calcular/:guindasteId/:uf — calcula preço de venda
router.get('/calcular/:guindasteId/:uf', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const preco = await svc.calcularPreco(req.params.guindasteId, req.params.uf);
  return res_.ok(res, { guindaste_id: req.params.guindasteId, uf: req.params.uf, preco });
}));

// GET /api/precificacao/guindastes — guindastes com campos de custo
router.get('/guindastes', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.findAllGuindastesComCusto();
  return res_.ok(res, data, { count: data.length });
}));

// GET /api/precificacao/precos — preços calculados salvos
router.get('/precos', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { guindaste_id, uf } = req.query;
  const data = await svc.findPrecosCalculados({ guindaste_id, uf });
  return res_.ok(res, data, { count: data.length });
}));

// POST /api/precificacao/precos — salva/atualiza preço calculado
router.post('/precos', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { guindaste_id, uf, preco_calculado, formula_snapshot } = req.body;
  if (!guindaste_id || !uf || preco_calculado === undefined) {
    return res_.badRequest(res, 'guindaste_id, uf e preco_calculado são obrigatórios');
  }
  const data = await svc.upsertPrecoCalculado({ guindaste_id, uf, preco_calculado, formula_snapshot });
  return res_.ok(res, data);
}));

// POST /api/precificacao/recalcular/:uf — recalcula e salva preços de venda para todos os guindastes de uma UF
router.post('/recalcular/:uf', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.recalcularTodosPorUf(req.params.uf);
  return res_.ok(res, data, { count: data.length });
}));

module.exports = router;
