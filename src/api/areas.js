/**
 * src/api/areas.js
 * Cliente REST genérico para áreas de atuação de qualquer entidade territorial.
 */

import { API_URL } from './config.js';

const BASE_URL = `${API_URL}/api/areas`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse(response) {
  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const data = await response.json();
      message = data.message || data.error || message;
    } catch {
      // mantém mensagem padrão
    }
    throw new Error(message);
  }
  const data = await response.json();
  return data.data ?? data;
}

export async function getEntidades(tipo = null) {
  const url = tipo
    ? `${BASE_URL}/${encodeURIComponent(tipo)}/entidades`
    : `${BASE_URL}/todas/entidades`;
  const response = await fetch(url, {
    method: 'GET',
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getAreas(tipo, entidadeId) {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(tipo)}/${encodeURIComponent(entidadeId)}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function getInstaladorasComAreaComum(tipo, entidadeId) {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(tipo)}/${encodeURIComponent(entidadeId)}/instaladoras-comuns`, {
    method: 'GET',
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function saveAreas(tipo, entidadeId, areas) {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(tipo)}/${encodeURIComponent(entidadeId)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ areas }),
  });
  return handleResponse(response);
}
