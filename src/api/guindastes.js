const BASE_URL = 'https://api-pedidos.starkindustrial.ind.br/api/guindastes';

const _cache = new Map();

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getGuindastes() {
  const res = await fetch(`${BASE_URL}?limit=2000`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar guindastes');
  return json.data || [];
}

export async function getGuindastesLite(page = 1, pageSize = 100, forceRefresh = false) {
  const cacheKey = `lite_${page}_${pageSize}`;
  const now = Date.now();

  if (!forceRefresh && _cache.has(cacheKey)) {
    const cached = _cache.get(cacheKey);
    if (now - cached.ts < 10 * 60 * 1000) return cached.value;
    _cache.delete(cacheKey);
  }

  const offset = (page - 1) * pageSize;
  const res = await fetch(`${BASE_URL}?limit=${pageSize}&offset=${offset}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao carregar guindastes');

  const result = {
    data: json.data || [],
    count: typeof json.count === 'number' ? json.count : (json.data || []).length,
    page,
    pageSize,
  };

  _cache.set(cacheKey, { value: result, ts: now });
  if (_cache.size > 10) _cache.delete(_cache.keys().next().value);

  return result;
}

export async function getGuindasteById(id) {
  const res = await fetch(`${BASE_URL}/${id}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Guindaste não encontrado');
  const g = json.data;
  return { ...g, finame: g.finame || '', ncm: g.ncm || '' };
}

export async function getGuindasteImagemById(id) {
  const res = await fetch(`${BASE_URL}/${id}/imagem`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Erro ao carregar imagem do guindaste');
  }
  return json.data?.imagem_url ?? null;
}

export async function createGuindaste(data) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao criar guindaste');
  _cache.clear();
  return json.data;
}

export async function updateGuindaste(id, data) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao atualizar guindaste');
  _cache.clear();
  return json.data;
}

export async function deleteGuindaste(id) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao excluir guindaste');
  _cache.clear();
  return true;
}

export async function fetchPrecoPorRegiao(guindasteId, regiao) {
  const regiaoParam = encodeURIComponent(regiao || '');
  const res = await fetch(`${BASE_URL}/${guindasteId}/preco?regiao=${regiaoParam}`, {
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Erro ao buscar preço por região');
  }
  return json.data?.preco ?? 0;
}

export async function fetchPrecoCompraPorRegiao(guindasteId, regiao) {
  const regiaoParam = encodeURIComponent(regiao || '');
  const res = await fetch(`${BASE_URL}/${guindasteId}/preco-compra?regiao=${regiaoParam}`, {
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Erro ao buscar preço de compra por região');
  }
  return json.data?.preco ?? 0;
}

export async function getGuindastesCountForDashboard() {
  try {
    const res = await fetch(`${BASE_URL}?limit=1`, { headers: authHeaders() });
    const json = await res.json();
    if (!json.success) return 0;
    return typeof json.count === 'number' ? json.count : 0;
  } catch {
    return 0;
  }
}
