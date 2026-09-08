/**
 * services/configuracoesService.js
 * Operações na tabela configuracoes_globais.
 * Espelha exatamente a lógica que estava em src/config/supabase.js:
 *   getConfiguracaoGlobal, setConfiguracaoGlobalNumero, getCotacaoUSD, setCotacaoUSD
 */

const { query } = require('../db/pool');

function formatarDataBCB(date) {
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  const ano = date.getFullYear();
  return `${mes}-${dia}-${ano}`;
}

async function fetchPTAXVenda() {
  const hoje = new Date();
  const dataFinal = formatarDataBCB(hoje);
  const dataInicial = formatarDataBCB(new Date(hoje.setDate(hoje.getDate() - 10)));

  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${dataInicial}'&@dataFinalCotacao='${dataFinal}'&$top=100&$format=json&$select=cotacaoVenda,dataHoraCotacao`;

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`PTAX respondeu HTTP ${res.status}`);

  const json = await res.json();
  const valores = (json.value || []).filter((v) => Number(v.cotacaoVenda) > 0);
  if (!valores.length) return null;

  const ultimo = valores[valores.length - 1];
  return {
    valor: Number(ultimo.cotacaoVenda),
    dataReferencia: typeof ultimo.dataHoraCotacao === 'string'
      ? ultimo.dataHoraCotacao.slice(0, 10)
      : null,
    dataHora: ultimo.dataHoraCotacao,
  };
}

function parseValorTexto(cfg) {
  try {
    return JSON.parse(cfg?.valor_texto || '{}');
  } catch {
    return {};
  }
}

async function getConfiguracao(chave) {
  const { rows } = await query(
    `SELECT chave, valor_numero, valor_texto, updated_at
     FROM configuracoes_globais
     WHERE chave = $1`,
    [chave]
  );
  return rows[0] || null;
}

async function setConfiguracaoNumero(chave, valorNumero, valorTexto) {
  const alterarNumero = valorNumero !== undefined;
  const alterarTexto = valorTexto !== undefined;

  const colunas = ['chave'];
  const valores = [chave];

  if (alterarNumero) {
    const v =
      valorNumero === '' || valorNumero === undefined || valorNumero === null
        ? null
        : Number(valorNumero);
    colunas.push('valor_numero');
    valores.push(v);
  }

  if (alterarTexto) {
    colunas.push('valor_texto');
    valores.push(valorTexto);
  }

  const setClauses = ['updated_at = NOW()'];
  if (alterarNumero) setClauses.push('valor_numero = EXCLUDED.valor_numero');
  if (alterarTexto) setClauses.push('valor_texto = EXCLUDED.valor_texto');

  const { rows } = await query(
    `INSERT INTO configuracoes_globais (${colunas.join(', ')})
     VALUES (${valores.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (chave) DO UPDATE
       SET ${setClauses.join(', ')}
     RETURNING chave, valor_numero, valor_texto, updated_at`,
    valores
  );
  return rows[0];
}

async function atualizarCotacaoPTAX(chave = 'usd_brl', force = false) {
  const cfg = await getConfiguracao(chave);
  const meta = parseValorTexto(cfg);

  if (meta.modo === 'manual' && !force) {
    return cfg;
  }

  try {
    const ptax = await fetchPTAXVenda();
    if (!ptax || ptax.valor <= 0) {
      return cfg || { chave, valor_numero: 5.12, valor_texto: '{}', updated_at: null };
    }

    const novoTexto = JSON.stringify({
      ...meta,
      modo: 'auto',
      data_referencia: ptax.dataReferencia,
    });

    const { rows } = await query(
      `INSERT INTO configuracoes_globais (chave, valor_numero, valor_texto)
       VALUES ($1, $2, $3)
       ON CONFLICT (chave) DO UPDATE
         SET valor_numero = EXCLUDED.valor_numero,
             valor_texto  = EXCLUDED.valor_texto,
             updated_at   = NOW()
       RETURNING chave, valor_numero, valor_texto, updated_at`,
      [chave, ptax.valor, novoTexto]
    );
    return rows[0];
  } catch (err) {
    console.error('[PTAX] falha ao consultar cotação:', err.message);
    return cfg || { chave, valor_numero: 5.12, valor_texto: '{}', updated_at: null };
  }
}

async function getCotacaoUSD() {
  const cfg = await getConfiguracao('usd_brl');
  const v = Number(cfg?.valor_numero);
  return Number.isFinite(v) && v > 0 ? v : 5.12;
}

module.exports = {
  getConfiguracao,
  setConfiguracaoNumero,
  getCotacaoUSD,
  atualizarCotacaoPTAX,
};
