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
