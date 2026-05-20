/**
 * routes/configuracoes.js
 * GET e PUT de configuracoes_globais (ex: cotação USD/BRL).
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/configuracoesService');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = Router();

// GET /api/configuracoes/:chave — qualquer usuário autenticado pode ler
router.get('/:chave', requireAuth, asyncHandler(async (req, res) => {
  const cfg = await svc.getConfiguracao(req.params.chave);
  if (!cfg) return res_.notFound(res, `Configuração '${req.params.chave}' não encontrada`);
  return res_.ok(res, cfg);
}));

// PUT /api/configuracoes/:chave — apenas admin Stark pode escrever
router.put('/:chave', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { valor_numero } = req.body;
  if (valor_numero === undefined) {
    return res_.badRequest(res, 'valor_numero é obrigatório');
  }
  const cfg = await svc.setConfiguracaoNumero(req.params.chave, valor_numero);
  return res_.ok(res, cfg);
}));

module.exports = router;
