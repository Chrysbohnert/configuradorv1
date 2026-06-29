/**
 * routes/fretes.js
 * Leitura dos pontos de instalação/oficinas e valores de frete CIF.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/fretesService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// GET /api/fretes?uf=RS — lista de fretes com filtro opcional por UF
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { uf } = req.query;
  const data = await svc.getFretes(uf || null);
  return res_.ok(res, data, { count: data.length });
}));

// GET /api/fretes/por-vendedor/:vendedorId — filtrado pela região do vendedor
router.get('/por-vendedor/:vendedorId', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.getFretesPorVendedor(req.params.vendedorId);
  return res_.ok(res, data, { count: data.length });
}));

// GET /api/fretes/admin — todos os fretes (Admin Stark apenas)
router.get('/admin', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.getTodosFretesAdmin();
  return res_.ok(res, data, { count: data.length });
}));

// POST /api/fretes/admin — criar novo frete (Admin Stark apenas)
router.post('/admin', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.createFrete(req.body);
  return res_.ok(res, data);
}));

// PUT /api/fretes/admin/:id — atualizar frete (Admin Stark apenas)
router.put('/admin/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.updateFrete(req.params.id, req.body);
  return res_.ok(res, data);
}));

// DELETE /api/fretes/admin/:id — excluir frete (Admin Stark apenas)
router.delete('/admin/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.deleteFrete(req.params.id);
  return res_.ok(res, data);
}));

module.exports = router;
