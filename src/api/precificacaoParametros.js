/**
 * src/api/precificacaoParametros.js
 * Cliente REST para /api/precificacao-parametros.
 */

import { API_URL } from './config.js';

const BASE_URL = `${API_URL}/api/precificacao-parametros`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getParametros() {
  const res = await fetch(BASE_URL, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar parâmetros');
  return json.data;
}

export async function salvarParametros(data) {
  const res = await fetch(BASE_URL, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao salvar parâmetros');
  return json.data;
}
