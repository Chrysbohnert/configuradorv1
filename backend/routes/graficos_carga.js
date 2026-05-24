/**
 * routes/graficos_carga.js
 * Gráficos de carga — PostgreSQL.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/graficosCargaService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.findAll();
  return res_.ok(res, data, { count: data.length });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.findById(req.params.id);
  if (!data) return res_.notFound(res, 'Gráfico de carga não encontrado');
  return res_.ok(res, data);
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    return res_.badRequest(res, 'nome é obrigatório');
  }
  const created = await svc.create(req.body);
  return res_.created(res, created);
}));

router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const updated = await svc.update(req.params.id, req.body);
  if (!updated) return res_.notFound(res, 'Gráfico de carga não encontrado');
  return res_.ok(res, updated);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await svc.remove(req.params.id);
  if (!deleted) return res_.notFound(res, 'Gráfico de carga não encontrado');
  return res_.ok(res, { message: 'Gráfico removido com sucesso' });
}));

module.exports = router;
