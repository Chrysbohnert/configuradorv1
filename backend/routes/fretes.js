/**
 * routes/fretes.js
 * Leitura dos pontos de instalação/oficinas e valores de frete CIF.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/fretesService');
const { requireAuth } = require('../middleware/auth');

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

module.exports = router;
