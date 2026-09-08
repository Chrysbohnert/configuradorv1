const ExcelJS = require('exceljs');
const { query, getClient } = require('../db/pool');
const { normalizeNcm } = require('../utils/ncm');

const VARIACAO_RELEVANTE_PERCENT = 10;

function cellValue(cell) {
  if (cell && typeof cell === 'object') {
    if (cell.result !== undefined) return cell.result;
    if (cell.text !== undefined) return cell.text;
  }
  return cell ?? '';
}

function normalizeHeader(header) {
  return String(cellValue(header))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\./g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function parseNumber(input) {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const raw = String(cellValue(input)).trim().replace(/R\$/gi, '').replace(/\s/g, '');
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstValue(row, aliases) {
  for (const alias of aliases) {
    if (Object.hasOwn(row, alias) && String(cellValue(row[alias])).trim() !== '') return cellValue(row[alias]);
  }
  return '';
}

function parseCsvRows(buffer) {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ';' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

function mapRows(headers, sourceRows) {
  if (!headers.includes('REFERENCIA')) {
    const error = new Error('A coluna REFERÊNCIA é obrigatória');
    error.status = 400;
    throw error;
  }

  const byReference = new Map();
  sourceRows.forEach((values) => {
    const row = {};
    headers.forEach((header, column) => {
      if (header) row[header] = values[column];
    });
    const referencia = String(firstValue(row, ['REFERENCIA'])).replace(/\.0$/, '').trim();
    if (!referencia) return;
    byReference.set(referencia, {
      referencia,
      descricao: String(firstValue(row, ['DESCRICAO', 'DESCRICAO DO PRODUTO', 'PRODUTO'])).trim() || null,
      ncm: normalizeNcm(String(firstValue(row, ['NCM'])).replace(/\.0$/, '')) || null,
      custo_mp: parseNumber(firstValue(row, ['CUSTO MP', 'VALOR MP', 'MP'])),
      custo_mo: parseNumber(firstValue(row, ['CUSTO MO', 'VALOR MO', 'MO'])),
    });
  });

  const items = Array.from(byReference.values());
  if (items.length === 0) {
    const error = new Error('Nenhuma REFERÊNCIA válida foi encontrada na planilha');
    error.status = 400;
    throw error;
  }
  return items;
}

async function parseWorkbook(buffer, filename = 'importacao.xlsx') {
  if (/\.csv$/i.test(filename)) {
    const rows = parseCsvRows(buffer);
    if (rows.length < 2) {
      const error = new Error('O CSV não possui itens para importar');
      error.status = 400;
      throw error;
    }
    return mapRows(rows[0].map(normalizeHeader), rows.slice(1));
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet('Produtos') || workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) {
    const error = new Error('A planilha não possui itens para importar');
    error.status = 400;
    throw error;
  }
  const headers = worksheet.getRow(1).values.slice(1).map(normalizeHeader);
  const rows = [];
  worksheet.eachRow((excelRow, index) => {
    if (index === 1) return;
    rows.push(headers.map((_, column) => excelRow.getCell(column + 1).value));
  });
  return mapRows(headers, rows);
}

function calculateVariation(previous, next) {
  if (previous === null || previous === undefined || next === null || next === undefined) return null;
  const oldValue = Number(previous);
  const newValue = Number(next);
  if (!Number.isFinite(oldValue) || !Number.isFinite(newValue)) return null;
  if (oldValue === 0) return newValue === 0 ? 0 : null;
  return Math.abs(((newValue - oldValue) / oldValue) * 100);
}

function buildAlert(reference, field, previous, next) {
  const variation = calculateVariation(previous, next);
  const changedFromZero = Number(previous) === 0 && Number(next) !== 0;
  if (!changedFromZero && (variation === null || variation < VARIACAO_RELEVANTE_PERCENT)) return null;
  return {
    referencia: reference,
    campo: field,
    valor_anterior: previous === null || previous === undefined ? null : Number(previous),
    valor_novo: next === null || next === undefined ? null : Number(next),
    variacao_percentual: variation === null ? null : Number(variation.toFixed(2)),
  };
}

async function importSnapshot({ buffer, filename, user }) {
  const items = await parseWorkbook(buffer, filename);
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { rows: lotRows } = await client.query(
      `INSERT INTO public.erp_import_lotes
         (arquivo, usuario_id, usuario_nome, status, atual, total_importado)
       VALUES ($1, $2, $3, 'processando', FALSE, $4)
       RETURNING *`,
      [filename, user?.id || null, user?.nome || user?.email || null, items.length]
    );
    const lot = lotRows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO public.erp_import_itens
           (lote_id, referencia, descricao, ncm, custo_mp, custo_mo)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [lot.id, item.referencia, item.descricao, item.ncm, item.custo_mp, item.custo_mo]
      );
    }

    const references = items.map((item) => item.referencia);
    const { rows: existing } = await client.query(
      `SELECT id, codigo_referencia, custo_mp, custo_mo
       FROM public.guindastes
       WHERE codigo_referencia = ANY($1::text[])`,
      [references]
    );
    const existingByReference = new Map(existing.map((item) => [String(item.codigo_referencia), item]));
    const alerts = [];

    for (const item of items) {
      const crane = existingByReference.get(item.referencia);
      if (!crane) continue;
      const mpAlert = buildAlert(item.referencia, 'custo_mp', crane.custo_mp, item.custo_mp);
      const moAlert = buildAlert(item.referencia, 'custo_mo', crane.custo_mo, item.custo_mo);
      if (mpAlert) alerts.push(mpAlert);
      if (moAlert) alerts.push(moAlert);
      await client.query(
        `UPDATE public.guindastes
         SET custo_mp = $1, custo_mo = $2, updated_at = NOW()
         WHERE id = $3`,
        [item.custo_mp, item.custo_mo, crane.id]
      );
    }

    const { rows: missingRows } = await client.query(
      `SELECT codigo_referencia
       FROM public.guindastes
       WHERE codigo_referencia IS NOT NULL
         AND BTRIM(codigo_referencia) <> ''
         AND NOT (codigo_referencia = ANY($1::text[]))
       ORDER BY codigo_referencia`,
      [references]
    );

    await client.query(`UPDATE public.erp_import_lotes SET atual = FALSE, updated_at = NOW() WHERE atual = TRUE`);
    const { rows: completedRows } = await client.query(
      `UPDATE public.erp_import_lotes
       SET status = 'concluido', atual = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [lot.id]
    );
    await client.query('COMMIT');

    return {
      lote: completedRows[0],
      total_importado: items.length,
      guindastes_existentes_atualizados: existing.length,
      produtos_novos_disponiveis: items.length - existing.length,
      referencias_cadastro_nao_encontradas: missingRows.map((row) => row.codigo_referencia),
      alertas_variacao: alerts,
      limite_variacao_percentual: VARIACAO_RELEVANTE_PERCENT,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function findCurrent() {
  const { rows: lots } = await query(
    `SELECT id, arquivo, importado_em, usuario_id, usuario_nome, status, atual, total_importado
     FROM public.erp_import_lotes
     WHERE atual = TRUE AND status = 'concluido'
     ORDER BY importado_em DESC
     LIMIT 1`
  );
  if (!lots[0]) return null;
  const { rows: items } = await query(
    `SELECT id, lote_id, referencia, descricao, ncm, custo_mp, custo_mo, created_at
     FROM public.erp_import_itens
     WHERE lote_id = $1
     ORDER BY referencia`,
    [lots[0].id]
  );
  return { lote: lots[0], itens: items };
}

module.exports = { importSnapshot, findCurrent, parseWorkbook, calculateVariation };
