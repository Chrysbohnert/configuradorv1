/**
 * src/api/configuracoes.js
 * Cliente REST para /api/configuracoes.
 * Substitui db.getConfiguracaoGlobal, db.setConfiguracaoGlobalNumero,
 * db.getCotacaoUSD e db.setCotacaoUSD de src/config/supabase.js.
 */

import { API_URL } from './config.js';
const BASE_URL = `${API_URL}/api/configuracoes`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getConfiguracaoGlobal(chave) {
  const res = await fetch(`${BASE_URL}/${chave}`, { headers: authHeaders() });
  if (res.status === 404) return null;
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar configuração');
  return json.data;
}

export async function setConfiguracaoGlobalNumero(chave, valorNumero) {
  const res = await fetch(`${BASE_URL}/${chave}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ valor_numero: valorNumero }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao salvar configuração');
  return json.data;
}

export async function getCotacaoUSD() {
  const cfg = await getConfiguracaoGlobal('usd_brl');
  const v = Number(cfg?.valor_numero);
  return Number.isFinite(v) && v > 0 ? v : 5.12;
}

export async function setCotacaoUSD(valorBRL) {
  const v = Number(valorBRL);
  if (!Number.isFinite(v) || v <= 0) throw new Error('Cotação inválida');
  return setConfiguracaoGlobalNumero('usd_brl', v);
}
