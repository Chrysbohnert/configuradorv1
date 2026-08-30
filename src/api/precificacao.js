/**
 * src/api/precificacao.js
 * Cliente REST para /api/precificacao.
 * Precificação simplificada por equipamento/referência.
 */

import { API_URL } from './config.js';

const BASE_URL = `${API_URL}/api/precificacao`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getEquipamentosComPrecificacao() {
  const res = await fetch(`${BASE_URL}/equipamentos`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar equipamentos');
  return json.data || [];
}

export async function importarPrecificacao(data) {
  const res = await fetch(`${BASE_URL}/importar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao importar precificação');
  return json.data;
}

export async function salvarPrecificacao(data) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao salvar precificação');
  return json.data;
}
