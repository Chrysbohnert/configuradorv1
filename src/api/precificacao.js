/**
 * src/api/precificacao.js
 * Cliente REST para /api/precificacao.
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

export async function getRegras() {
  const res = await fetch(`${BASE_URL}/regras`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar regras');
  return json.data || [];
}

export async function getRegraPorUf(uf) {
  const res = await fetch(`${BASE_URL}/regras/${encodeURIComponent(uf)}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar regra');
  return json.data;
}

export async function salvarRegra(data) {
  const res = await fetch(`${BASE_URL}/regras`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao salvar regra');
  return json.data;
}

export async function atualizarRegra(id, data) {
  const res = await fetch(`${BASE_URL}/regras/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao atualizar regra');
  return json.data;
}

export async function excluirRegra(id) {
  const res = await fetch(`${BASE_URL}/regras/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao excluir regra');
  return json.data;
}

export async function calcularPreco(guindasteId, uf) {
  const res = await fetch(
    `${BASE_URL}/calcular/${encodeURIComponent(guindasteId)}/${encodeURIComponent(uf)}`,
    { headers: authHeaders() }
  );
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao calcular preço');
  return json.data;
}

export async function getGuindastesComCusto() {
  const res = await fetch(`${BASE_URL}/guindastes`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar guindastes');
  return json.data || [];
}

export async function getPrecosCalculados(params = {}) {
  const qs = new URLSearchParams();
  if (params.guindaste_id) qs.append('guindaste_id', params.guindaste_id);
  if (params.uf) qs.append('uf', params.uf);
  const res = await fetch(`${BASE_URL}/precos?${qs.toString()}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar preços');
  return json.data || [];
}

export async function salvarPrecoCalculado(data) {
  const res = await fetch(`${BASE_URL}/precos`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao salvar preço calculado');
  return json.data;
}

export async function recalcularPorUf(uf) {
  const res = await fetch(`${BASE_URL}/recalcular/${encodeURIComponent(uf)}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao recalcular preços');
  return json.data || [];
}
