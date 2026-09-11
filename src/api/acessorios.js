/**
 * src/api/acessorios.js
 * Cliente REST para /api/acessorios.
 */

import { API_URL } from './config.js';

const BASE_URL = `${API_URL}/api/acessorios`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getAcessorios() {
  const res = await fetch(BASE_URL, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar acessórios');
  return json.data || [];
}

export async function createAcessorio(data) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao criar acessório');
  return json.data;
}

export async function updateAcessorio(id, data) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao atualizar acessório');
  return json.data;
}

export async function deleteAcessorio(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao excluir acessório');
  return json.data;
}
