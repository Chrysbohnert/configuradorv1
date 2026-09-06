/**
 * routes/territorial.js
 * Unified territorial API — four profile types (cliente, concessionaria,
 * representante, instaladora), map dataset, CRUD + areas.
 * GET routes: requireAuth
 * Mutations: requireAuth + requireAdmin
 * Instaladora is read-only in this API (data comes from fretes).
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const svc = require('../services/territorialService');

const router = Router();

function rejectIfReadOnly(tipo, res) {
  if (tipo === 'instaladora') {
    return res_.badRequest(res, 'Instaladora é somente leitura na API territorial; gerencie via /api/fretes');
  }
  return undefined;
}

// GET /api/territorial/cadastros — list editable cadastros
router.get('/cadastros', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.listCadastros();
  return res_.ok(res, data, { count: data.length });
}));

// GET /api/territorial/mapa — map dataset (cadastros + instaladoras + vendas)
router.get('/mapa', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.getMapDataset();
  return res_.ok(res, data);
}));

// GET /api/territorial/cadastros/:tipo/:id — single cadastro
router.get('/cadastros/:tipo/:id', requireAuth, asyncHandler(async (req, res) => {
  const data = await svc.getCadastro(req.params.tipo, req.params.id);
  if (!data) return res_.notFound(res, 'Cadastro não encontrado');
  return res_.ok(res, data);
}));

// POST /api/territorial/cadastros — create
router.post('/cadastros', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { tipo, ...rest } = req.body;
  if (!tipo || !rest.nome) return res_.badRequest(res, 'tipo e nome são obrigatórios');
  const rejected = rejectIfReadOnly(tipo, res);
  if (rejected) return rejected;
  const data = await svc.createCadastro(tipo, rest);
  return res_.created(res, data);
}));

// PUT /api/territorial/cadastros/:tipo/:id — update
router.put('/cadastros/:tipo/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const rejected = rejectIfReadOnly(req.params.tipo, res);
  if (rejected) return rejected;
  const data = await svc.updateCadastro(req.params.tipo, req.params.id, req.body);
  return res_.ok(res, data);
}));

// DELETE /api/territorial/cadastros/:tipo/:id — delete
router.delete('/cadastros/:tipo/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const rejected = rejectIfReadOnly(req.params.tipo, res);
  if (rejected) return rejected;
  await svc.deleteCadastro(req.params.tipo, req.params.id);
  return res_.ok(res, { message: 'Cadastro removido com sucesso' });
}));

// PUT /api/territorial/cadastros/:tipo/:id/areas — save areas
router.put('/cadastros/:tipo/:id/areas', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const areas = Array.isArray(req.body?.areas) ? req.body.areas : [];
  const transfer = req.body?.transfer === true;
  try {
    const data = await svc.saveAreas(req.params.tipo, req.params.id, areas, { transfer });
    return res_.ok(res, data);
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({
        success: false,
        error: err.message,
        conflicts: err.conflicts || [],
      });
    }
    throw err;
  }
}));

module.exports = router;
