/**
 * routes/concessionaria_precos.js
 * Preços de venda das concessionárias — PostgreSQL.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/concessionariaPrecosService');
const { requireAuth } = require('../middleware/auth');

const router = Router();

// GET /api/concessionaria-precos/:concessionariaId
router.get('/:concessionariaId', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.findByConcessionaria(req.params.concessionariaId);
  return res_.ok(res, data);
}));

// GET /api/concessionaria-precos/:concessionariaId/:guindasteId
router.get('/:concessionariaId/:guindasteId', requireAuth, asyncHandler(async (req, res) => {
  const preco = await svc.findOne(req.params.concessionariaId, req.params.guindasteId);
  return res_.ok(res, { preco_override: preco });
}));

// PUT /api/concessionaria-precos (upsert)
router.put('/', requireAuth, asyncHandler(async (req, res) => {
  const { concessionaria_id, guindaste_id, preco_override, updated_by } = req.body;

  if (!concessionaria_id || !guindaste_id) {
    return res_.badRequest(res, 'concessionaria_id e guindaste_id são obrigatórios');
  }
  if (preco_override == null || preco_override < 0) {
    return res_.badRequest(res, 'preco_override inválido');
  }

  const result = await svc.upsert({ concessionaria_id, guindaste_id, preco_override, updated_by });
  return res_.ok(res, result);
}));

module.exports = router;
