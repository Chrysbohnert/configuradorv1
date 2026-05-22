/**
 * routes/guindastes.js
 * CRUD de guindastes — migração gradual do Supabase.
 * Descomentar cada rota conforme o service for implementado.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/guindastes.Service');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const limit  = req.query.limit  ? parseInt(req.query.limit,  10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset, 10) : undefined;
  const [data, total] = await Promise.all([
    svc.findAll({ limit, offset, lite: true }),
    svc.count(),
  ]);
  return res_.ok(res, data, { count: total });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.findById(req.params.id);
  if (!data) return res_.notFound(res, 'Guindaste não encontrado');
  return res_.ok(res, data);
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.create(req.body);
  return res_.created(res, data);
}));

router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.update(req.params.id, req.body);
  if (!data) return res_.notFound(res, 'Guindaste não encontrado');
  return res_.ok(res, data);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await svc.remove(req.params.id);
  if (!deleted) return res_.notFound(res, 'Guindaste não encontrado');
  return res_.ok(res, { message: 'Guindaste removido' });
}));

module.exports = router;
