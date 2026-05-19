/**
 * Helpers de resposta padronizada.
 * Mantém consistência no formato JSON de toda a API.
 */

const ok = (res, data, meta = {}) => {
  const payload = { success: true, data };
  if (Object.keys(meta).length) payload.meta = meta;
  return res.status(200).json(payload);
};

const created = (res, data) =>
  res.status(201).json({ success: true, data });

const noContent = (res) => res.status(204).send();

const badRequest = (res, message = 'Requisição inválida', errors = null) => {
  const payload = { success: false, error: message };
  if (errors) payload.errors = errors;
  return res.status(400).json(payload);
};

const unauthorized = (res, message = 'Não autenticado') =>
  res.status(401).json({ success: false, error: message });

const forbidden = (res, message = 'Acesso negado') =>
  res.status(403).json({ success: false, error: message });

const notFound = (res, message = 'Registro não encontrado') =>
  res.status(404).json({ success: false, error: message });

const conflict = (res, message = 'Conflito de dados') =>
  res.status(409).json({ success: false, error: message });

const serverError = (res, message = 'Erro interno do servidor') =>
  res.status(500).json({ success: false, error: message });

module.exports = { ok, created, noContent, badRequest, unauthorized, forbidden, notFound, conflict, serverError };
