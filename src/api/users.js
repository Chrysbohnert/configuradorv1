/**
 * src/api/users.js
 * Cliente REST para /api/users.
 * Expõe updateMe e changePassword para o próprio usuário autenticado,
 * sem exigir papel de admin (usado em Configuracoes.jsx).
 */

const BASE_URL = 'https://api-pedidos.starkindustrial.ind.br/api/users';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function updateMe(fields) {
  const res = await fetch(`${BASE_URL}/me`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(fields),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao atualizar perfil');
  return json.data;
}

export async function changePassword({ senhaAtual, novaSenha }) {
  const res = await fetch(`${BASE_URL}/me/password`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Erro ao alterar senha');
  return json.data;
}
