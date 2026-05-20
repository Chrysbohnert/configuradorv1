/**
 * routes/graficos_carga.js
 * Gráficos de carga — PostgreSQL.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/graficosCargaService');
const { requireAuth } = require('../middleware/auth');

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

module.exports = router;
