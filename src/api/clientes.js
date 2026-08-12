import { API_URL } from './config.js';
const BASE_URL = `${API_URL}/api/clientes`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getClientes({ search, vendedor_id } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (vendedor_id) params.set('vendedor_id', vendedor_id);

  const res = await fetch(`${BASE_URL}?${params.toString()}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar clientes');
  return json.data || [];
}

export async function getClienteById(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Cliente não encontrado');
  return json.data;
}

export async function getPropostasDoCliente(id) {
  const res = await fetch(`${BASE_URL}/${id}/propostas`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar histórico de propostas');
  return json.data || [];
}

export async function createCliente(data) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao criar cliente');
  return json.data;
}

export async function updateCliente(id, updates) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao atualizar cliente');
  return json.data;
}
