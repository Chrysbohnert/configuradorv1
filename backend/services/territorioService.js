/**
 * services/territorioService.js
 * Listagem genérica de entidades territoriais (instaladoras, concessionárias, representantes)
 * e cálculo de relacionamentos entre áreas de atuação.
 */

const { query } = require('../db/pool');

const ALLOWED_TYPES = new Set(['instaladora', 'concessionaria', 'representante']);

function validateType(tipo) {
  const normalized = String(tipo || '').toLowerCase();
  if (!ALLOWED_TYPES.has(normalized)) {
    throw new Error(`Tipo de entidade inválido: ${tipo}. Permitidos: ${[...ALLOWED_TYPES].join(', ')}`);
  }
  return normalized;
}

async function listarEntidades(tipo) {
  const type = validateType(tipo);

  if (type === 'instaladora') {
    const { rows } = await query(
      `SELECT id, oficina AS nome, cidade, uf, NULL::text AS cor
       FROM public.fretes
       ORDER BY oficina ASC`
    );
    return rows.map((r) => ({ ...r, tipo: 'instaladora' }));
  }

  if (type === 'concessionaria') {
    const { rows } = await query(
      `SELECT id, nome, cidade, uf, cor
       FROM public.concessionarias
       WHERE ativo = true
       ORDER BY nome ASC`
    );
    return rows.map((r) => ({ ...r, tipo: 'concessionaria' }));
  }

  // representante -> usuários com tipo representante
  const { rows } = await query(
    `SELECT id, nome, cidade, uf, cor
     FROM public.app_users
     WHERE tipo = 'representante'
     ORDER BY nome ASC`
  );
  return rows.map((r) => ({ ...r, tipo: 'representante' }));
}

async function listarTodasEntidades() {
  // Promise.allSettled: uma falha (ex: coluna ausente em concessionarias/representantes)
  // não derruba as outras — instaladoras continuam visíveis.
  const [rInstaladora, rConcessionaria, rRepresentante] = await Promise.allSettled([
    listarEntidades('instaladora'),
    listarEntidades('concessionaria'),
    listarEntidades('representante'),
  ]);

  if (rInstaladora.status === 'rejected')
    console.error('[territorioService] Erro ao listar instaladoras:', rInstaladora.reason?.message);
  if (rConcessionaria.status === 'rejected')
    console.error('[territorioService] Erro ao listar concessionarias:', rConcessionaria.reason?.message);
  if (rRepresentante.status === 'rejected')
    console.error('[territorioService] Erro ao listar representantes:', rRepresentante.reason?.message);

  const instaladoras    = rInstaladora.status    === 'fulfilled' ? rInstaladora.value    : [];
  const concessionarias = rConcessionaria.status === 'fulfilled' ? rConcessionaria.value : [];
  const representantes  = rRepresentante.status  === 'fulfilled' ? rRepresentante.value  : [];

  return [...instaladoras, ...concessionarias, ...representantes];
}

/**
 * Retorna instaladoras cujas áreas de atuação possuem ao menos um município
 * em comum com a área da entidade informada (concessionária/representante).
 */
async function listarInstaladorasComAreaComum(tipo, entidadeId) {
  const type = validateType(tipo);
  if (type === 'instaladora') return [];

  const id = String(entidadeId);
  const { rows } = await query(
    `SELECT DISTINCT f.id, f.oficina AS nome, f.cidade, f.uf
     FROM public.areas_atuacao a
     INNER JOIN public.areas_atuacao b
       ON a.codigo_ibge = b.codigo_ibge
       AND b.tipo_entidade = 'instaladora'
     INNER JOIN public.fretes f
       ON f.id::text = b.entidade_id
     WHERE a.tipo_entidade = $1
       AND a.entidade_id = $2
     ORDER BY f.oficina ASC`,
    [type, id]
  );
  return rows;
}

module.exports = {
  listarEntidades,
  listarTodasEntidades,
  listarInstaladorasComAreaComum,
};
