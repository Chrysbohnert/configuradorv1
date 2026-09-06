/**
 * routes/precificacaoCondicoes.js
 * Endpoints para condições de pagamento isoladas do simulador de precificação.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/precificacaoCondicoesService');
const { requireAuth, requireAdminFull } = require('../middleware/auth');

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.findAll(req.query);
  return res_.ok(res, data, { count: data.length });
}));

router.post('/', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const data = await svc.create(req.body);
  return res_.ok(res, data);
}));

router.put('/:id', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const data = await svc.update(req.params.id, req.body);
  if (!data) return res_.notFound(res, 'Condição não encontrada');
  return res_.ok(res, data);
}));

router.delete('/:id', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const removed = await svc.remove(req.params.id);
  if (!removed) return res_.notFound(res, 'Condição não encontrada');
  return res_.ok(res, { message: 'Condição removida' });
}));

module.exports = router;
