/**
 * routes/clientes.js
 * CRUD de clientes + histórico de propostas vinculadas.
 * Vendedor comum: vê/cria apenas clientes vinculados a ele (vendedor_id).
 * Admin: vê todos os clientes e o vendedor responsável.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/clientesService');
const { requireAuth } = require('../middleware/auth');

const router = Router();

const isAdmin = (req) => ['admin_stark', 'admin', 'admin_concessionaria'].includes(req.user?.tipo);

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { search } = req.query;
  const vendedor_id = isAdmin(req) ? (req.query.vendedor_id || undefined) : req.user.id;

  const data = await svc.findAll({ vendedor_id, search });
  return res_.ok(res, data);
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.findById(req.params.id);
  if (!data) return res_.notFound(res, 'Cliente não encontrado');

  if (!isAdmin(req) && String(data.vendedor_id) !== String(req.user.id)) {
    return res_.forbidden(res, 'Acesso negado');
  }

  return res_.ok(res, data);
}));

router.get('/:id/propostas', requireAuth, asyncHandler(async (req, res) => {
  const cliente = await svc.findById(req.params.id);
  if (!cliente) return res_.notFound(res, 'Cliente não encontrado');

  if (!isAdmin(req) && String(cliente.vendedor_id) !== String(req.user.id)) {
    return res_.forbidden(res, 'Acesso negado');
  }

  const propostas = await svc.findPropostasByClienteId(req.params.id);
  return res_.ok(res, propostas);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const payload = { ...req.body };

  // Vendedor comum: vincula automaticamente ao usuário logado
  if (!isAdmin(req)) {
    payload.vendedor_id = req.user.id;
  }

  // Evitar duplicidade: se já existe cliente com o mesmo documento (do mesmo vendedor
  // quando vendedor comum), reaproveita o cadastro em vez de criar outro.
  if (payload.documento) {
    const existente = await svc.findByDocumento(payload.documento);
    if (existente && (isAdmin(req) || String(existente.vendedor_id) === String(req.user.id))) {
      const atualizado = await svc.update(existente.id, payload);
      return res_.ok(res, atualizado || existente);
    }
  }

  const data = await svc.create(payload);
  return res_.created(res, data);
}));

router.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const existente = await svc.findById(req.params.id);
  if (!existente) return res_.notFound(res, 'Cliente não encontrado');

  if (!isAdmin(req) && String(existente.vendedor_id) !== String(req.user.id)) {
    return res_.forbidden(res, 'Acesso negado');
  }

  const payload = { ...req.body };
  if (!isAdmin(req)) delete payload.vendedor_id; // vendedor comum não troca o responsável

  const data = await svc.update(req.params.id, payload);
  return res_.ok(res, data);
}));

module.exports = router;
