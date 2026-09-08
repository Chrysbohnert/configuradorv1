/**
 * routes/configuracoes.js
 * GET, PUT e POST de configuracoes_globais (ex: cotação USD/BRL).
 */

const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/configuracoesService');
const { requireAuth, requireAdminFull } = require('../middleware/auth');

const router = Router();

// GET /api/configuracoes/:chave — qualquer usuário autenticado pode ler
router.get('/:chave', requireAuth, asyncHandler(async (req, res) => {
  const cfg = await svc.getConfiguracao(req.params.chave);
  if (!cfg) return res_.notFound(res, `Configuração '${req.params.chave}' não encontrada`);
  return res_.ok(res, cfg);
}));

// PUT /api/configuracoes/:chave — apenas admin Stark pode escrever
router.put('/:chave', requireAuth, requireAdminFull, asyncHandler(async (req, res) => {
  const { valor_numero, valor_texto } = req.body;
  if (valor_numero === undefined && valor_texto === undefined) {
    return res_.badRequest(res, 'valor_numero ou valor_texto é obrigatório');
  }
  const cfg = await svc.setConfiguracaoNumero(req.params.chave, valor_numero, valor_texto);
  return res_.ok(res, cfg);
}));

// POST /api/configuracoes/:chave/atualizar-ptax
// Atualiza a cotação com PTAX, salvo quando o modo atual é manual (a menos que force seja true)
router.post('/:chave/atualizar-ptax', requireAuth, asyncHandler(async (req, res) => {
  const { reativar } = req.body || {};
  const cfg = await svc.atualizarCotacaoPTAX(req.params.chave, reativar === true);
  return res_.ok(res, cfg);
}));

module.exports = router;
