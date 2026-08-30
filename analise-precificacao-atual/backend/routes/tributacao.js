/**
 * routes/tributacao.js
 * Endpoints para cadastro de regras tributárias por UF + NCM.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/tributacaoService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.findAll(req.query);
  return res_.ok(res, data, { count: data.length });
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.create(req.body);
  return res_.ok(res, data);
}));

router.post('/gerar-ufs', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { ncm } = req.body;
  if (!ncm) return res_.badRequest(res, 'ncm é obrigatório');
  const data = await svc.createAllUFsForNCM(req.body);
  return res_.ok(res, data, { count: data.length });
}));

router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.update(req.params.id, req.body);
  if (!data) return res_.notFound(res, 'Regra não encontrada');
  return res_.ok(res, data);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const removed = await svc.remove(req.params.id);
  if (!removed) return res_.notFound(res, 'Regra não encontrada');
  return res_.ok(res, { message: 'Regra removida' });
}));

module.exports = router;
