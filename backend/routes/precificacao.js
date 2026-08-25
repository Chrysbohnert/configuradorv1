/**
 * routes/precificacao.js
 * Endpoints para gerenciamento de precificação por equipamento/referência.
 * Acesso restrito a Admin. Frete e instalação continuam nas fontes atuais.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/precificacaoService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// GET /api/precificacao — lista todas as precificações
router.get('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.findAll();
  return res_.ok(res, data, { count: data.length });
}));

// GET /api/precificacao/equipamentos — lista todos os guindastes com custo e regras
router.get('/equipamentos', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.listarEquipamentosComCusto();
  return res_.ok(res, data, { count: data.length });
}));

// GET /api/precificacao/:guindasteId — regra de um equipamento específico
router.get('/:guindasteId', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.findByGuindasteId(req.params.guindasteId);
  if (!data) return res_.notFound(res, 'Precificação não encontrada');
  return res_.ok(res, data);
}));

// GET /api/precificacao/:guindasteId/calcular — calcula preço base do equipamento
router.get('/:guindasteId/calcular', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const preco = await svc.calcularPrecoBase(req.params.guindasteId);
  return res_.ok(res, { guindaste_id: req.params.guindasteId, preco });
}));

// POST /api/precificacao — cria ou atualiza precificação de um equipamento
router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { guindaste_id } = req.body;
  if (!guindaste_id) return res_.badRequest(res, 'guindaste_id é obrigatório');
  const data = await svc.upsert(req.body);
  return res_.ok(res, data);
}));

// DELETE /api/precificacao/:id — remove uma precificação
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const removed = await svc.remove(req.params.id);
  if (!removed) return res_.notFound(res, 'Precificação não encontrada');
  return res_.ok(res, { message: 'Precificação removida' });
}));

module.exports = router;
