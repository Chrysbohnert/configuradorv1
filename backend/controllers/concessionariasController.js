/**
 * concessionariasController.js
 * Recebe req/res, chama o service, formata a resposta.
 * Sem SQL aqui — toda query fica em concessionariasService.js.
 */

const asyncHandler = require('../utils/asyncHandler');
const res_ = require('../utils/response');
const svc = require('../services/concessionariasService');

const getConcessionarias = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true';
  const data = await svc.findAll(includeInactive);
  return res_.ok(res, data, { count: data.length });
});

const getConcessionariaById = asyncHandler(async (req, res) => {
  const row = await svc.findById(req.params.id);
  if (!row) return res_.notFound(res, 'Concessionária não encontrada');
  return res_.ok(res, row);
});

const createConcessionaria = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const requiredFields = ['nome', 'regiao_preco'];

  // [DEBUG TEMP] Cadastro de concessionária — remover após validar em produção
  console.log('[POST /concessionarias] payload recebido:', JSON.stringify(payload));
  console.log('[POST /concessionarias] campos obrigatórios esperados:', requiredFields);

  const missingFields = requiredFields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || (typeof value === 'string' && !value.trim());
  });

  if (missingFields.length) {
    console.warn('[POST /concessionarias] campo(s) faltante(s):', missingFields);
    return res_.badRequest(res, `Campo(s) obrigatório(s) ausente(s): ${missingFields.join(', ')}`);
  }

  const created = await svc.create(payload);
  return res_.created(res, created);
});

const updateConcessionaria = asyncHandler(async (req, res) => {
  const updated = await svc.update(req.params.id, req.body);
  if (!updated) return res_.notFound(res, 'Concessionária não encontrada');
  return res_.ok(res, updated);
});

const deleteConcessionaria = asyncHandler(async (req, res) => {
  const deleted = await svc.remove(req.params.id);
  if (!deleted) return res_.notFound(res, 'Concessionária não encontrada');
  return res_.ok(res, { message: 'Concessionária removida com sucesso' });
});

module.exports = {
  getConcessionarias,
  getConcessionariaById,
  createConcessionaria,
  updateConcessionaria,
  deleteConcessionaria,
};
