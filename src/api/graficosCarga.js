import { API_URL } from './config.js';
const BASE_URL = `${API_URL}/api/graficos-carga`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getGraficosCarga() {
  const res = await fetch(BASE_URL, { headers: authHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Erro ao carregar gráficos (${res.status})`);
  }
  return json.data || [];
}

export async function getGraficoCargaById(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { headers: authHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gráfico não encontrado (${res.status})`);
  }
  return json.data;
}

export async function createGraficoCarga(data) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Erro ao criar gráfico de carga');
  }
  return json.data;
}

export async function updateGraficoCarga(id, data) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Erro ao atualizar gráfico de carga');
  }
  return json.data;
}

export async function deletGraficoCarga(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Erro ao remover gráfico de carga');
  }
  return true;
}
