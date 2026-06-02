import { API_URL } from './config.js';
const BASE_URL = `${API_URL}/api/propostas`;

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getPropostas(filters = {}) {
  const params = new URLSearchParams();
  if (filters.limit !== undefined)           params.set('limit', filters.limit);
  if (filters.offset !== undefined)          params.set('offset', filters.offset);
  if (filters.status)                        params.set('status', filters.status);
  if (filters.tipo)                          params.set('tipo', filters.tipo);
  if (filters.includeDadosSerializados)      params.set('includeDadosSerializados', 'true');
  if (filters.vendedor_id) {
    if (Array.isArray(filters.vendedor_id)) {
      params.set('vendedor_id', filters.vendedor_id.join(','));
    } else {
      params.set('vendedor_id', filters.vendedor_id);
    }
  }

  const res = await fetch(`${BASE_URL}?${params.toString()}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar propostas');
  return json.data || [];
}

export async function getPropostaById(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Proposta não encontrada');
  return json.data;
}

export async function createProposta(data) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao criar proposta');
  return json.data;
}

export const createpropostas = createProposta;

export async function updateProposta(id, updates) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao atualizar proposta');
  return json.data;
}

export const updatepropostas = updateProposta;

export async function deleteProposta(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao excluir proposta');
  return json.data;
}

export async function deletePropostaPermanente(id) {
  const res = await fetch(`${BASE_URL}/${id}?permanent=true`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao excluir proposta permanentemente');
  return true;
}

export async function updateResultadoVendaProposta(id, { resultado_venda = null, motivo_perda = null } = {}) {
  return updateProposta(id, {
    resultado_venda,
    motivo_perda: resultado_venda === 'perdida' ? (motivo_perda || null) : null,
    data_resultado_venda: resultado_venda ? new Date().toISOString() : null,
  });
}
