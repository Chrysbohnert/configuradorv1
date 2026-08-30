/**
 * src/api/tributacao.js
 * Cliente REST para /api/tributacao.
 */

import { API_URL } from './config.js';

const BASE_URL = `${API_URL}/api/tributacao`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getRegrasTributacao(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar regras tributárias');
  return json.data || [];
}

export async function salvarRegraTributacao(data) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao salvar regra tributária');
  return json.data;
}

export async function gerarRegrasParaTodasUFs(data) {
  const res = await fetch(`${BASE_URL}/gerar-ufs`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao gerar regras para UFs');
  return json.data || [];
}

export async function atualizarRegraTributacao(id, data) {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao atualizar regra tributária');
  return json.data;
}

export async function excluirRegraTributacao(id) {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao excluir regra tributária');
  return json.data;
}
