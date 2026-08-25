/**
 * routes/areas.js
 * Endpoints genéricos para gerenciamento de áreas de atuação
 * de qualquer entidade territorial (instaladora, concessionaria, representante).
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const { getAreas, replaceAreas } = require('../services/areasAtuacaoService');
const { listarEntidades, listarTodasEntidades, listarInstaladorasComAreaComum } = require('../services/territorioService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

const ALLOWED_TYPES = new Set(['instaladora', 'concessionaria', 'representante']);

function validateType(req, res, next) {
  const tipo = String(req.params.tipo || '').toLowerCase();
  if (!ALLOWED_TYPES.has(tipo)) {
    return res_.badRequest(res, `Tipo de entidade inválido. Permitidos: ${[...ALLOWED_TYPES].join(', ')}`);
  }
  req.entityType = tipo;
  next();
}

// GET /api/areas/todas/entidades — lista todas as entidades territoriais
// DEVE vir antes de /:tipo/:entidadeId para não ser capturada pelo parâmetro dinâmico
router.get('/todas/entidades', requireAuth, asyncHandler(async (req, res) => {
  const data = await listarTodasEntidades();
  return res_.ok(res, data, { count: data.length });
}));

// GET /api/areas/:tipo/entidades — lista entidades de um tipo
// DEVE vir antes de /:tipo/:entidadeId (segmento fixo 'entidades' vs param genérico)
router.get('/:tipo/entidades', requireAuth, validateType, asyncHandler(async (req, res) => {
  const data = await listarEntidades(req.entityType);
  return res_.ok(res, data, { count: data.length });
}));

// GET /api/areas/:tipo/:entidadeId/instaladoras-comuns — instaladoras com municípios em comum
router.get('/:tipo/:entidadeId/instaladoras-comuns', requireAuth, validateType, asyncHandler(async (req, res) => {
  const data = await listarInstaladorasComAreaComum(req.entityType, req.params.entidadeId);
  return res_.ok(res, data, { count: data.length });
}));

// GET /api/areas/:tipo/:entidadeId — lista municípios da área
router.get('/:tipo/:entidadeId', requireAuth, validateType, asyncHandler(async (req, res) => {
  const data = await getAreas(req.entityType, req.params.entidadeId);
  return res_.ok(res, data, { count: data.length });
}));

// PUT /api/areas/:tipo/:entidadeId — substitui toda a área
router.put('/:tipo/:entidadeId', requireAuth, requireAdmin, validateType, asyncHandler(async (req, res) => {
  const areas = Array.isArray(req.body?.areas) ? req.body.areas : [];
  const data = await replaceAreas(req.entityType, req.params.entidadeId, areas);
  return res_.ok(res, data);
}));

module.exports = router;
