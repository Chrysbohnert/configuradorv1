/**
 * routes/propostas.js
 * CRUD completo de propostas.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/propostasService');
const clientesService = require('../services/clientesService');
const usersService = require('../services/usersService');
const concessionariasService = require('../services/concessionariasService');
const { requireAuth } = require('../middleware/auth');
const {
  isAdmin,
  isAdminFull,
  isAdminConcessionarias,
  isAdminConcessionaria,
  isAdminCanalRepresentantes,
  isAdminCanalInterno,
  isAdminComercioExterior,
  podeAcessarPedidosCompra,
  CANAIS,
} = require('../utils/permissions');

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { status, tipo, limit, offset, includeDadosSerializados, vendedor_id: qVendedor, cliente_id, canal_venda: qCanalVenda } = req.query;

  let vendedor_id;
  if (isAdmin(req.user)) {
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
    cliente_id: cliente_id || undefined,
    limit:     limit !== undefined ? (parseInt(limit) || 0) : 0,
    offset:    parseInt(offset) || 0,
    includeDadosSerializados: includeDadosSerializados === 'true',
    canal_venda: isAdminFull(req.user) && qCanalVenda
      ? (qCanalVenda.includes(',') ? qCanalVenda.split(',') : qCanalVenda)
      : undefined,
  };

  // Restrição de visibilidade por perfil admin
  if (isAdminConcessionaria(req.user)) {
    filters.concessionaria_id = req.user.concessionaria_id;
  } else if (isAdminConcessionarias(req.user)) {
    filters.canal_venda = ['Concessionária Nacional', 'Concessionária Internacional'];
  } else if (isAdminCanalRepresentantes(req.user)) {
    filters.canal_venda = ['Representante'];
  } else if (isAdminCanalInterno(req.user)) {
    filters.canal_venda = ['Vendedor Interno'];
  } else if (isAdminComercioExterior(req.user)) {
    filters.canal_venda = ['Concessionária Internacional'];
  }

  console.log(`📋 [GET /propostas] user=${req.user.id} tipo=${req.user.tipo} filtros=${JSON.stringify({ vendedor_id, status, tipo, limit, offset, includeDadosSerializados, canal_venda: filters.canal_venda, concessionaria_id: filters.concessionaria_id })}`);

  const [data, total] = await Promise.all([svc.findAll(filters), svc.count(filters)]);

  console.log(`✅ [GET /propostas] ${data.length}/${total} registros retornados`);
  return res_.ok(res, data, { count: total });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  console.log(`📋 [GET /propostas/${req.params.id}] user=${req.user.id}`);
  const data = await svc.findById(req.params.id);
  if (!data) return res_.notFound(res, 'Proposta não encontrada');

  if (!isAdmin(req.user) && String(data.vendedor_id) !== String(req.user.id)) {
    console.warn(`⛔ [GET /propostas/${req.params.id}] Acesso negado: user=${req.user.id} dono=${data.vendedor_id}`);
    return res_.forbidden(res, 'Acesso negado');
  }

  return res_.ok(res, data);
}));

router.post('/', requireAuth, asyncHandler(async (req, res) => {
  console.log(`📋 [POST /propostas] user=${req.user.id} numero=${req.body.numero_proposta}`);
  const payload = { ...req.body };

  const isPedidoCompra = payload.dados_serializados?.tipo_fluxo === 'pedido_compra_concessionaria';
  const podeCriarParaQualquerConcessionaria = podeAcessarPedidosCompra(req.user) &&
    (isAdminFull(req.user) || isAdminConcessionarias(req.user));

  if (isPedidoCompra && podeCriarParaQualquerConcessionaria) {
    if (!payload.concessionaria_id) return res_.badRequest(res, 'Concessionária responsável obrigatória');
    const concessionaria = await concessionariasService.findById(payload.concessionaria_id);
    if (!concessionaria || concessionaria.ativo === false) return res_.badRequest(res, 'Concessionária responsável inválida');
    payload.vendedor_id = req.user.id;
    payload.vendedor_nome = req.user.nome;
    payload.dados_serializados = {
      ...payload.dados_serializados,
      autoria: { usuario_id: req.user.id, usuario_nome: req.user.nome },
      concessionaria_responsavel: { concessionaria_id: concessionaria.id, concessionaria_nome: concessionaria.nome },
    };
  } else if (isAdminFull(req.user)) {
    if (!payload.vendedor_id) return res_.badRequest(res, 'Responsável comercial obrigatório');
    const responsavel = await usersService.findById(payload.vendedor_id);
    if (!responsavel || !['vendedor', 'vendedor_concessionaria', 'vendedor_exterior'].includes(responsavel.tipo)) {
      return res_.badRequest(res, 'Responsável comercial inválido');
    }
    if (!payload.cliente_id) return res_.badRequest(res, 'Cliente obrigatório');
    const cliente = await clientesService.findById(payload.cliente_id);
    if (!cliente || String(cliente.vendedor_id) !== String(responsavel.id)) {
      return res_.badRequest(res, 'Cliente não pertence ao responsável comercial selecionado');
    }
    payload.vendedor_nome = responsavel.nome;
    payload.dados_serializados = {
      ...(payload.dados_serializados || {}),
      autoria: { usuario_id: req.user.id, usuario_nome: req.user.nome },
      responsavel_comercial: { usuario_id: responsavel.id, usuario_nome: responsavel.nome },
    };
  } else {
    payload.vendedor_id = req.user.id;
    payload.vendedor_nome = req.user.nome;
  }

  const data = await svc.create(payload);
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
