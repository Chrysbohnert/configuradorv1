/**
 * src/api/precificacaoSimulador.js
 * Cliente REST para /api/precificacao-simulador.
 */

import { API_URL } from './config.js';

const BASE_URL = `${API_URL}/api/precificacao-simulador`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function simular(data) {
  const res = await fetch(`${BASE_URL}/simular`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao simular precificação');
  return json.data;
}

export async function simularESalvar(data) {
  const res = await fetch(`${BASE_URL}/simular-salvar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao simular/salvar precificação');
  return json.data;
}

export async function listarHistorico(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/historico${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar histórico');
  return json.data || [];
}

export async function excluirHistorico(id) {
  const res = await fetch(`${BASE_URL}/historico/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao excluir histórico');
  return json.data;
}
