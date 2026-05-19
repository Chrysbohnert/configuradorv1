/**
 * routes/payment_plans.js
 * Planos de pagamento — migração gradual do Supabase.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const { query } = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { audience, active } = req.query;
  const conditions = [];
  const params = [];

  if (audience) { params.push(audience); conditions.push(`audience = $${params.length}`); }
  if (typeof active !== 'undefined') { params.push(active === 'true'); conditions.push(`active = $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT * FROM payment_plans ${where} ORDER BY "order" ASC`, params);
  return res_.ok(res, rows, { count: rows.length });
}));

module.exports = router;
