/**
 * routes/propostas.js
 * CRUD completo de propostas.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/propostasService');
const { requireAuth } = require('../middleware/auth');

const router = Router();

const isAdmin = (req) => ['admin_stark', 'admin', 'admin_concessionaria'].includes(req.user?.tipo);

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { status, tipo, limit, offset, includeDadosSerializados, vendedor_id: qVendedor } = req.query;

  let vendedor_id;
  if (isAdmin(req)) {
    if (qVendedor) {
      vendedor_id = qVendedor.includes(',') ? qVendedor.split(',') : qVendedor;
    }
  } else {
    vendedor_id = req.user.id;
  }

  const filters = {
    vendedor_id,
    status:    status    || undefined,
    tipo:      tipo      || undefined,
    limit:     parseInt(limit)  || 100,
    offset:    parseInt(offset) || 0,
    includeDadosSerializados: includeDadosSerializados === 'true',
  };

  console.log(`📋 [GET /propostas] user=${req.user.id} tipo=${req.user.tipo} filtros=${JSON.stringify({ vendedor_id, status, tipo, limit, offset, includeDadosSerializados })}`);

  const [data, total] = await Promise.all([svc.findAll(filters), svc.count(filters)]);

  console.log(`✅ [GET /propostas] ${data.length}/${total} registros retornados`);
  return res_.ok(res, data, { count: total });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  console.log(`📋 [GET /propostas/${req.params.id}] user=${req.user.id}`);
  const data = await svc.findById(req.params.id);
  if (!data) return res_.notFound(res, 'Proposta não encontrada');

  if (!isAdmin(req) && String(data.vendedor_id) !== String(req.user.id)) {
    console.warn(`⛔ [GET /propostas/${req.params.id}] Acesso negado: user=${req.user.id} dono=${data.vendedor_id}`);
    return res_.forbidden(res, 'Acesso negado');
  }

  return res_.ok(res, data);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  console.log(`📋 [POST /propostas] user=${req.user.id} numero=${req.body.numero_proposta}`);
  const data = await svc.create(req.body);
  console.log(`✅ [POST /propostas] Criada: id=${data.id} numero=${data.numero_proposta}`);
  return res_.created(res, data);
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  console.log(`📋 [PUT /propostas/${req.params.id}] user=${req.user.id}`);
  const data = await svc.update(req.params.id, req.body);
  if (!data) return res_.notFound(res, 'Proposta não encontrada');
  console.log(`✅ [PUT /propostas/${req.params.id}] Atualizada`);
  return res_.ok(res, data);
}));

router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const permanent = req.query.permanent === 'true';
  console.log(`🗑️ [DELETE /propostas/${req.params.id}] permanent=${permanent} user=${req.user.id}`);

  if (permanent) {
    const deleted = await svc.hardDelete(req.params.id);
    if (!deleted) return res_.notFound(res, 'Proposta não encontrada');
    console.log(`✅ [DELETE /propostas/${req.params.id}] Excluída permanentemente`);
    return res_.ok(res, { message: 'Proposta excluída permanentemente' });
  }

  const data = await svc.softDelete(req.params.id);
  if (!data) return res_.notFound(res, 'Proposta não encontrada');
  console.log(`✅ [DELETE /propostas/${req.params.id}] Soft delete (status=excluido)`);
  return res_.ok(res, data);
}));

module.exports = router;
