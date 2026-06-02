/**
 * src/api/solicitacoesDesconto.js
 * Cliente REST para /api/solicitacoes-desconto.
 * Substitui as chamadas Supabase em supabase.js para solicitações de desconto.
 */

import { API_URL } from './config.js';
const BASE_URL = `${API_URL}/api/solicitacoes-desconto`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function criarSolicitacao(dados) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(dados),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao criar solicitação');
  return json.data;
}

export async function listarPendentes() {
  const res = await fetch(`${BASE_URL}/pendentes`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao listar solicitações');
  return json.data;
}

export async function buscarPorId(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao buscar solicitação');
  return json.data;
}

export async function buscarPorVendedor(vendedorId) {
  const res = await fetch(`${BASE_URL}/vendedor/${vendedorId}`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao buscar solicitações');
  return json.data;
}

export async function aprovarSolicitacao(id, descontoAprovado, observacao) {
  const res = await fetch(`${BASE_URL}/${id}/aprovar`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ desconto_aprovado: descontoAprovado, observacao }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao aprovar solicitação');
  return json.data;
}

export async function negarSolicitacao(id, observacao) {
  const res = await fetch(`${BASE_URL}/${id}/negar`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ observacao }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao negar solicitação');
  return json.data;
}
