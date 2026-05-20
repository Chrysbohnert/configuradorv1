/**
 * services/configuracoesService.js
 * Operações na tabela configuracoes_globais.
 * Espelha exatamente a lógica que estava em src/config/supabase.js:
 *   getConfiguracaoGlobal, setConfiguracaoGlobalNumero, getCotacaoUSD, setCotacaoUSD
 */

const { query } = require('../db/pool');

async function getConfiguracao(chave) {
  const { rows } = await query(
    `SELECT chave, valor_numero, valor_texto, updated_at
     FROM configuracoes_globais
     WHERE chave = $1`,
    [chave]
  );
  return rows[0] || null;
}

async function setConfiguracaoNumero(chave, valorNumero) {
  const valor =
    valorNumero === '' || valorNumero === undefined || valorNumero === null
      ? null
      : Number(valorNumero);

  const { rows } = await query(
    `INSERT INTO configuracoes_globais (chave, valor_numero)
     VALUES ($1, $2)
     ON CONFLICT (chave) DO UPDATE
       SET valor_numero = EXCLUDED.valor_numero,
           updated_at   = NOW()
     RETURNING chave, valor_numero, updated_at`,
    [chave, valor]
  );
  return rows[0];
}

async function getCotacaoUSD() {
  const cfg = await getConfiguracao('usd_brl');
  const v = Number(cfg?.valor_numero);
  return Number.isFinite(v) && v > 0 ? v : 5.12;
}

module.exports = { getConfiguracao, setConfiguracaoNumero, getCotacaoUSD };
