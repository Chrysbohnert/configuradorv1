/**
 * routes/metas.js
 * Metas de vendedores — PostgreSQL.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/metasService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// GET /api/metas/:vendedorId/:ano
router.get('/:vendedorId/:ano', requireAuth, asyncHandler(async (req, res) => {
  const { vendedorId, ano } = req.params;
  const data = await svc.findByVendedorAno(vendedorId, ano);
  return res_.ok(res, data);
}));

// PUT /api/metas/:vendedorId/:ano  (upsert array de meses)
router.put('/:vendedorId/:ano', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { vendedorId, ano } = req.params;
  const { metas } = req.body;

  if (!Array.isArray(metas) || metas.length === 0) {
    return res_.badRequest(res, 'metas deve ser um array não-vazio');
  }

  const data = await svc.upsertAno(vendedorId, ano, metas);
  return res_.ok(res, data);
}));

module.exports = router;
