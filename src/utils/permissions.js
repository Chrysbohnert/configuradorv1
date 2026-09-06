/**
 * permissions.js
 * Helpers centralizados de perfis e permissões no frontend.
 * Deve espelhar backend/utils/permissions.js.
 */

export const CANAIS = {
  INTERNO: 'interno',
  REPRESENTANTES: 'representantes',
  CONCESSIONARIAS: 'concessionarias',
  COMERCIO_EXTERIOR: 'comercio_exterior',
};

export const ADMIN_ROLES = [
  'admin_full',
  'admin_concessionarias',
  'admin_concessionaria',
  'admin_representantes',
  'admin_canal_interno',
  'admin_comercio_exterior',
];

const TIPO_PARA_CANAL = {
  admin_concessionaria: CANAIS.CONCESSIONARIAS,
  admin_representantes: CANAIS.REPRESENTANTES,
  admin_canal_interno: CANAIS.INTERNO,
  admin_comercio_exterior: CANAIS.COMERCIO_EXTERIOR,
  vendedor_concessionaria: CANAIS.CONCESSIONARIAS,
  vendedor_exterior: CANAIS.COMERCIO_EXTERIOR,
  vendedor: CANAIS.REPRESENTANTES,
};

export function canalDoUsuario(user) {
  if (!user) return null;
  if (user.canal) return user.canal;
  return TIPO_PARA_CANAL[user.tipo] || null;
}

export function isAdmin(user) {
  return !!user?.tipo && ADMIN_ROLES.includes(user.tipo);
}

export function isAdminFull(user) {
  return user?.tipo === 'admin_full';
}

export function isAdminConcessionarias(user) {
  return user?.tipo === 'admin_concessionarias';
}

export function isAdminConcessionaria(user) {
  return user?.tipo === 'admin_concessionaria';
}

export function isAdminCanalRepresentantes(user) {
  return user?.tipo === 'admin_representantes';
}

export function isAdminCanalInterno(user) {
  return user?.tipo === 'admin_canal_interno';
}

export function isAdminComercioExterior(user) {
  return user?.tipo === 'admin_comercio_exterior';
}

export function isVendedor(user) {
  if (!user?.tipo) return false;
  return ['vendedor', 'vendedor_concessionaria', 'vendedor_exterior', 'admin_concessionaria'].includes(user.tipo);
}

export function isConcessionariaUser(user) {
  return canalDoUsuario(user) === CANAIS.CONCESSIONARIAS;
}

export function isComercioExteriorUser(user) {
  return canalDoUsuario(user) === CANAIS.COMERCIO_EXTERIOR;
}

export function podeAcessarPrecificacao(user) {
  return isAdminFull(user);
}

export function podeAcessarParametros(user) {
  return isAdminFull(user);
}

export function podeGerenciarGuindastesTecnico(user) {
  return isAdminFull(user);
}

export function podeAcessarConfiguracoesGlobais(user) {
  return isAdminFull(user);
}

export function podeGerenciarConcessionarias(user) {
  return isAdminFull(user) || isAdminConcessionarias(user);
}

export function podeAcessarPedidosCompra(user) {
  return isAdminFull(user) || isAdminConcessionarias(user) || isAdminConcessionaria(user);
}

export function usuarioPodeVerCanal(user, canal) {
  if (!user) return false;
  if (isAdminFull(user)) return true;
  if (isAdminConcessionarias(user)) return canal === CANAIS.CONCESSIONARIAS;
  if (isAdminCanalRepresentantes(user)) return canal === CANAIS.REPRESENTANTES;
  if (isAdminCanalInterno(user)) return canal === CANAIS.INTERNO;
  if (isAdminComercioExterior(user)) return canal === CANAIS.COMERCIO_EXTERIOR;
  if (isAdminConcessionaria(user)) return canal === CANAIS.CONCESSIONARIAS;
  return canal === canalDoUsuario(user);
}
