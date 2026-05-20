const BASE_URL = 'https://api-pedidos.starkindustrial.ind.br/api/graficos-carga';

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
