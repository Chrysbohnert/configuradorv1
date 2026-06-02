/**
 * routes/guindastes.js
 * CRUD de guindastes — migração gradual do Supabase.
 * Descomentar cada rota conforme o service for implementado.
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/guindastes.Service');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const limit  = req.query.limit  ? parseInt(req.query.limit,  10) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset, 10) : undefined;
  const [data, total] = await Promise.all([
    svc.findAll({ limit, offset, lite: true }),
    svc.count(),
  ]);
  return res_.ok(res, data, { count: total });
}));

router.get('/:id/preco', requireAuth, asyncHandler(async (req, res) => {
  const regiao = (req.query.regiao || '').trim();
  if (!regiao) return res_.badRequest(res, 'Query regiao é obrigatória');

  const preco = await svc.findPrecoPorRegiao(req.params.id, regiao);
  return res_.ok(res, { preco });
}));

router.get('/:id/preco-compra', requireAuth, asyncHandler(async (req, res) => {
  const regiao = (req.query.regiao || '').trim();
  if (!regiao) return res_.badRequest(res, 'Query regiao é obrigatória');

  const preco = await svc.findPrecoCompraPorRegiao(req.params.id, regiao);
  return res_.ok(res, { preco });
}));

router.get('/:id/precos', requireAuth, asyncHandler(async (req, res) => {
  const precos = await svc.findAllPrecosPorRegiao(req.params.id);
  return res_.ok(res, precos);
}));

router.get('/:id/precos-compra', requireAuth, asyncHandler(async (req, res) => {
  const precos = await svc.findAllPrecosCompraPorRegiao(req.params.id);
  return res_.ok(res, precos);
}));

router.post('/:id/precos', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { precos } = req.body;
  if (!Array.isArray(precos)) return res_.badRequest(res, 'precos deve ser um array');

  await svc.savePrecosPorRegiao(req.params.id, precos);
  return res_.ok(res, { message: 'Preços salvos com sucesso' });
}));

router.post('/:id/precos-compra', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { precos } = req.body;
  if (!Array.isArray(precos)) return res_.badRequest(res, 'precos deve ser um array');

  await svc.savePrecosCompraPorRegiao(req.params.id, precos);
  return res_.ok(res, { message: 'Preços de compra salvos com sucesso' });
}));

router.get('/:id/imagem', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.findImagemById(req.params.id);
  if (!data) return res_.notFound(res, 'Guindaste não encontrado');
  return res_.ok(res, { id: data.id, imagem_url: data.imagem_url ?? null });
}));

router.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.findById(req.params.id);
  if (!data) return res_.notFound(res, 'Guindaste não encontrado');
  return res_.ok(res, data);
}));

router.post('/', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.create(req.body);
  return res_.created(res, data);
}));

router.put('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const data = await svc.update(req.params.id, req.body);
  if (!data) return res_.notFound(res, 'Guindaste não encontrado');
  return res_.ok(res, data);
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const deleted = await svc.remove(req.params.id);
  if (!deleted) return res_.notFound(res, 'Guindaste não encontrado');
  return res_.ok(res, { message: 'Guindaste removido' });
}));

module.exports = router;
