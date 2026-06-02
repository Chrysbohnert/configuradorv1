/**
 * routes/solicitacoes_desconto.js
 * CRUD de solicitações de desconto.
 * - Vendedores/admin_concessionaria criam solicitações
 * - Admin Stark aprova/nega
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/solicitacoesDescontoService');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = Router();

// POST /api/solicitacoes-desconto — criar solicitação (vendedor ou admin_concessionaria)
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const { vendedor_id, vendedor_nome, vendedor_email, equipamento_descricao,
          valor_base, desconto_atual, desconto_desejado, justificativa, tipo_solicitante } = req.body;

  if (!vendedor_id || !vendedor_nome || !equipamento_descricao || !valor_base) {
    return res_.badRequest(res, 'Campos obrigatórios: vendedor_id, vendedor_nome, equipamento_descricao, valor_base');
  }

  const solicitacao = await svc.criar({
    vendedor_id,
    vendedor_nome,
    vendedor_email,
    equipamento_descricao,
    valor_base,
    desconto_atual,
    desconto_desejado,
    justificativa,
    tipo_solicitante: tipo_solicitante || 'vendedor'
  });

  return res_.created(res, solicitacao);
}));

// GET /api/solicitacoes-desconto/pendentes — listar pendentes (admin)
router.get('/pendentes', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const solicitacoes = await svc.listarPendentes();
  return res_.ok(res, solicitacoes);
}));

// GET /api/solicitacoes-desconto/:id — buscar por ID
router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const solicitacao = await svc.buscarPorId(req.params.id);
  if (!solicitacao) return res_.notFound(res, 'Solicitação não encontrada');
  return res_.ok(res, solicitacao);
}));

// GET /api/solicitacoes-desconto/vendedor/:vendedorId — listar por vendedor
router.get('/vendedor/:vendedorId', requireAuth, asyncHandler(async (req, res) => {
  const solicitacoes = await svc.buscarPorVendedor(req.params.vendedorId);
  return res_.ok(res, solicitacoes);
}));

// PUT /api/solicitacoes-desconto/:id/aprovar — aprovar (admin Stark)
router.put('/:id/aprovar', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const { desconto_aprovado, observacao } = req.body;

  if (desconto_aprovado == null || isNaN(Number(desconto_aprovado))) {
    return res_.badRequest(res, 'desconto_aprovado é obrigatório e deve ser numérico');
  }

  const solicitacao = await svc.aprovar(
    req.params.id,
    Number(desconto_aprovado),
    req.user.id,
    req.user.nome || 'Admin',
    observacao
  );

  if (!solicitacao) return res_.notFound(res, 'Solicitação não encontrada ou já respondida');
  return res_.ok(res, solicitacao);
}));

// PUT /api/solicitacoes-desconto/:id/negar — negar (admin Stark)
router.put('/:id/negar', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const { observacao } = req.body;

  if (!observacao || !observacao.trim()) {
    return res_.badRequest(res, 'Informe o motivo da negação');
  }

  const solicitacao = await svc.negar(
    req.params.id,
    req.user.id,
    req.user.nome || 'Admin',
    observacao
  );

  if (!solicitacao) return res_.notFound(res, 'Solicitação não encontrada ou já respondida');
  return res_.ok(res, solicitacao);
}));

module.exports = router;
