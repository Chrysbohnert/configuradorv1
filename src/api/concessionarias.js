/**
 * src/api/concessionarias.js
 * Cliente REST para /api/concessionarias.
 * Substitui db.getConcessionarias, db.getConcessionariaById,
 * db.createConcessionaria, db.updateConcessionaria e db.deleteConcessionaria
 * de src/config/supabase.js.
 */

import { API_URL } from './config.js';
const BASE_URL = `${API_URL}/api/concessionarias`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getConcessionarias(includeInactive = false) {
  const params = includeInactive ? '?includeInactive=true' : '';
  const res = await fetch(`${BASE_URL}${params}`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao carregar concessionárias');
  return json.data || [];
}

export async function getConcessionariaById(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Concessionária não encontrada');
  return json.data;
}

export async function createConcessionaria(data) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao criar concessionária');
  return json.data;
}

export async function updateConcessionaria(id, updates) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao atualizar concessionária');
  return json.data;
}

export async function deleteConcessionaria(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao remover concessionária');
  return true;
}
