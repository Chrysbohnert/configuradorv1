/**
 * permissions.js
 * Helpers centralizados de perfis e permissões.
 * Mantém compatibilidade com tipos legados mapeando para o novo modelo.
 */

// Perfis administrativos (ordem: mais abrangente primeiro)
const ADMIN_ROLES = new Set([
  'admin_full',
  'admin_concessionarias',
  'admin_concessionaria',
  'admin_representantes',
  'admin_canal_interno',
  'admin_comercio_exterior',
]);

// Perfis que podem operar como vendedor (acesso ao Novo Pedido)
const VENDEDOR_ROLES = new Set([
  'vendedor',
  'vendedor_concessionaria',
  'vendedor_exterior',
  'admin_concessionaria',
]);

// Canais comerciais suportados
const CANAIS = {
  INTERNO: 'interno',
  REPRESENTANTES: 'representantes',
  CONCESSIONARIAS: 'concessionarias',
  COMERCIO_EXTERIOR: 'comercio_exterior',
};

// Mapeia tipo de usuário operacional para canal
const TIPO_PARA_CANAL = {
  vendedor: CANAIS.REPRESENTANTES,
  admin_canal_interno: CANAIS.INTERNO,
  admin_representantes: CANAIS.REPRESENTANTES,
  admin_comercio_exterior: CANAIS.COMERCIO_EXTERIOR,
  admin_concessionaria: CANAIS.CONCESSIONARIAS,
  vendedor_concessionaria: CANAIS.CONCESSIONARIAS,
  vendedor_exterior: CANAIS.COMERCIO_EXTERIOR,
};

// Canal padrão para usuários legados sem canal definido
function canalDoUsuario(usuario) {
  if (!usuario) return null;
  if (usuario.canal) return usuario.canal;
  return TIPO_PARA_CANAL[usuario.tipo] || null;
}

function isAdmin(usuario) {
  return !!usuario?.tipo && ADMIN_ROLES.has(usuario.tipo);
}

function isAdminFull(usuario) {
  return usuario?.tipo === 'admin_full';
}

function isAdminConcessionarias(usuario) {
  return usuario?.tipo === 'admin_concessionarias';
}

function isAdminConcessionaria(usuario) {
  return usuario?.tipo === 'admin_concessionaria';
}

function isAdminCanalRepresentantes(usuario) {
  return usuario?.tipo === 'admin_representantes';
}

function isAdminCanalInterno(usuario) {
  return usuario?.tipo === 'admin_canal_interno';
}

function isAdminComercioExterior(usuario) {
  return usuario?.tipo === 'admin_comercio_exterior';
}

function isVendedor(usuario) {
  return !!usuario?.tipo && VENDEDOR_ROLES.has(usuario.tipo);
}

function isConcessionariaUser(usuario) {
  return canalDoUsuario(usuario) === CANAIS.CONCESSIONARIAS;
}

function isComercioExteriorUser(usuario) {
  return canalDoUsuario(usuario) === CANAIS.COMERCIO_EXTERIOR;
}

// Recursos restritos a admin_full
function podeAcessarPrecificacao(usuario) {
  return isAdminFull(usuario);
}

function podeAcessarParametros(usuario) {
  return isAdminFull(usuario);
}

function podeGerenciarGuindastesTecnico(usuario) {
  return isAdminFull(usuario);
}

function podeAcessarConfiguracoesGlobais(usuario) {
  return isAdminFull(usuario);
}

function podeGerenciarConcessionarias(usuario) {
  return isAdminFull(usuario) || isAdminConcessionarias(usuario);
}

function podeAcessarPedidosCompra(usuario) {
  return isAdminFull(usuario) || isAdminConcessionarias(usuario) || isAdminConcessionaria(usuario);
}

// Helpers de visibilidade por canal
function usuarioPodeVerCanal(usuario, canal) {
  if (!usuario) return false;
  if (isAdminFull(usuario)) return true;
  if (isAdminConcessionarias(usuario)) return canal === CANAIS.CONCESSIONARIAS;
  if (isAdminCanalRepresentantes(usuario)) return canal === CANAIS.REPRESENTANTES;
  if (isAdminCanalInterno(usuario)) return canal === CANAIS.INTERNO;
  if (isAdminComercioExterior(usuario)) return canal === CANAIS.COMERCIO_EXTERIOR;
  if (isAdminConcessionaria(usuario)) return canal === CANAIS.CONCESSIONARIAS;
  return canal === canalDoUsuario(usuario);
}

module.exports = {
  ADMIN_ROLES,
  VENDEDOR_ROLES,
  CANAIS,
  TIPO_PARA_CANAL,
  canalDoUsuario,
  isAdmin,
  isAdminFull,
  isAdminConcessionarias,
  isAdminConcessionaria,
  isAdminCanalRepresentantes,
  isAdminCanalInterno,
  isAdminComercioExterior,
  isVendedor,
  isConcessionariaUser,
  isComercioExteriorUser,
  podeAcessarPrecificacao,
  podeAcessarParametros,
  podeGerenciarGuindastesTecnico,
  podeAcessarConfiguracoesGlobais,
  podeGerenciarConcessionarias,
  podeAcessarPedidosCompra,
  usuarioPodeVerCanal,
};
