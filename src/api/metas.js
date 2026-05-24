/**
 * src/api/metas.js
 * Cliente REST para /api/metas (metas de vendedores).
 */

const BASE_URL = 'https://api-pedidos.starkindustrial.ind.br/api/metas';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getMetasAnoVendedor(vendedorId, ano) {
  const res = await fetch(`${BASE_URL}/${vendedorId}/${ano}`, { headers: authHeaders() });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Erro ao carregar metas');
  }
  return json.data || [];
}

export async function setMetasAnoVendedor(vendedorId, ano, metas) {
  const res = await fetch(`${BASE_URL}/${vendedorId}/${ano}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ metas }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Erro ao salvar metas');
  }
  return json.data || [];
}
