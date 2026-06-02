/**
 * src/api/solicitacoesDesconto.js
 * Cliente REST para /api/solicitacoes-desconto.
 * Substitui as chamadas Supabase em supabase.js para solicitações de desconto.
 */

import { API_URL } from './config.js';
const BASE_URL = `${API_URL}/api/solicitacoes-desconto`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function criarSolicitacao(dados) {
  // Gerar justificativa automática se ausente
  if (!dados.justificativa) {
    const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const partes = [];

    if (dados.tipo_solicitante === 'admin_concessionaria') {
      partes.push('Solicitação de desconto via Admin Concessionária.');
    }

    if (dados.valor_final_desejado && dados.valor_base) {
      const vBase = Number(dados.valor_base);
      const vFinal = Number(dados.valor_final_desejado);
      const descR$ = vBase - vFinal;
      const pct = ((descR$ / vBase) * 100).toFixed(2).replace('.', ',');
      partes.push(`Valor original: ${fmt(vBase)} | Valor solicitado: ${fmt(vFinal)} | Desconto solicitado: ${pct}%`);
    } else if (dados.desconto_desejado) {
      partes.push(`Desconto solicitado: ${dados.desconto_desejado}%`);
    }

    dados = { ...dados, justificativa: partes.join(' ') || 'Solicitação de desconto' };
  }

  console.log('[solicitacoes-desconto] payload enviado:', JSON.stringify(dados, null, 2));
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(dados),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao criar solicitação');
  return json.data;
}

export async function listarPendentes() {
  const res = await fetch(`${BASE_URL}/pendentes`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao listar solicitações');
  return json.data;
}

export async function buscarPorId(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao buscar solicitação');
  return json.data;
}

export async function buscarPorVendedor(vendedorId) {
  const res = await fetch(`${BASE_URL}/vendedor/${vendedorId}`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao buscar solicitações');
  return json.data;
}

export async function aprovarSolicitacao(id, descontoAprovado, observacao) {
  const res = await fetch(`${BASE_URL}/${id}/aprovar`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ desconto_aprovado: descontoAprovado, observacao }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao aprovar solicitação');
  return json.data;
}

export async function negarSolicitacao(id, observacao) {
  const res = await fetch(`${BASE_URL}/${id}/negar`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ observacao }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao negar solicitação');
  return json.data;
}
