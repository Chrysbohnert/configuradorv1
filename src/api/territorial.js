/**
 * src/api/territorial.js
 * Client for the unified territorial API.
 */

import { API_URL } from './config.js';

const BASE = `${API_URL}/api/territorial`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(response) {
  if (!response.ok) {
    let data = null;
    try { data = await response.json(); } catch { /* ignore */ }
    const error = new Error(data?.error || `Erro ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  const json = await response.json();
  return json.data ?? json;
}

/** List all cadastros */
export async function getCadastros() {
  const res = await fetch(`${BASE}/cadastros`, { headers: authHeaders() });
  return handle(res);
}

/** Map dataset: cadastros + vendas */
export async function getMapData() {
  const res = await fetch(`${BASE}/mapa`, { headers: authHeaders() });
  return handle(res);
}

/** Single cadastro */
export async function getCadastro(tipo, id) {
  const res = await fetch(`${BASE}/cadastros/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}`, { headers: authHeaders() });
  return handle(res);
}

/** Create cadastro */
export async function createCadastro(body) {
  const res = await fetch(`${BASE}/cadastros`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
  });
  return handle(res);
}

/** Update cadastro */
export async function updateCadastro(tipo, id, body) {
  const res = await fetch(`${BASE}/cadastros/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}`, {
    method: 'PUT', headers: authHeaders(), body: JSON.stringify(body),
  });
  return handle(res);
}

/** Delete cadastro */
export async function deleteCadastro(tipo, id) {
  const res = await fetch(`${BASE}/cadastros/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: authHeaders(),
  });
  return handle(res);
}

/** Save areas (with optional transfer for 409 retry) */
export async function saveAreas(tipo, id, areas, { transfer = false } = {}) {
  const res = await fetch(`${BASE}/cadastros/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}/areas`, {
    method: 'PUT', headers: authHeaders(),
    body: JSON.stringify({ areas, transfer }),
  });
  return handle(res);
}
