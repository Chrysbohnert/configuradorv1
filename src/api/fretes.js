/**
 * src/api/fretes.js
 * Cliente REST para /api/fretes.
 * Substitui db.getFretes e db.getPontosInstalacaoPorVendedor de src/config/supabase.js.
 */

import { API_URL } from './config.js';
const BASE_URL = `${API_URL}/api/fretes`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getFretes(uf = null) {
  const params = uf ? `?uf=${encodeURIComponent(uf)}` : '';
  const res = await fetch(`${BASE_URL}${params}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar fretes');
  return json.data || [];
}

export async function getPontosInstalacaoPorVendedor(vendedorId) {
  if (!vendedorId) return getFretes();
  const res = await fetch(`${BASE_URL}/por-vendedor/${vendedorId}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar pontos de instalação');
  return json.data || [];
}

// Admin Stark: todos os fretes sem filtro de UF
export async function getTodosFretesAdmin() {
  const res = await fetch(`${BASE_URL}/admin`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar fretes');
  return json.data || [];
}

// Admin Stark: criar novo frete
export async function createFrete(freteData) {
  const res = await fetch(`${BASE_URL}/admin`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(freteData),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao criar frete');
  return json.data;
}

// Admin Stark: atualizar frete
export async function updateFrete(id, freteData) {
  const res = await fetch(`${BASE_URL}/admin/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(freteData),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao atualizar frete');
  return json.data;
}

// Admin Stark: excluir frete
export async function deleteFrete(id) {
  const res = await fetch(`${BASE_URL}/admin/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao excluir frete');
  return json.data;
}
