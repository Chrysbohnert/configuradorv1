/**
 * services/territorialService.js
 * Unified territorial API service — composes existing tables into the four
 * frontend profile types: cliente, concessionaria, representante, instaladora.
 *
 * Adapters:
 *   clientes                         => cliente
 *   concessionarias                  => concessionaria
 *   app_users tipo=vendedor          => representante (sourceTipo: 'vendedor')
 *   app_users tipo=vendedor_exterior => representante (sourceTipo: 'vendedor_exterior')
 *   fretes                           => instaladora (read-only in territorial API)
 *
 * Areas: concessionaria and representante map to areas_atuacao tipo_entidade
 * 'concessionaria' and 'representante' respectively. Clientes and instaladoras
 * do not own areas through this service.
 */

const crypto = require('crypto');
const { query, getClient } = require('../db/pool');
const { getAreas, replaceAreas } = require('./areasAtuacaoService');

// ---------- Helpers ----------

const PROFILE_TYPES = ['cliente', 'concessionaria', 'representante', 'instaladora'];
const EDITABLE_TYPES = ['cliente', 'concessionaria', 'representante'];
const AREA_TYPES = new Set(['concessionaria', 'representante']);

function areaTypeOf(profileType) {
  if (profileType === 'concessionaria') return 'concessionaria';
  if (profileType === 'representante') return 'representante';
  return null;
}

function appUserTipos(profileType) {
  if (profileType === 'representante') return ['vendedor', 'vendedor_exterior'];
  return [];
}

function sha256Hex(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// UF -> regiao_preco
const UF_REGIAO = {
  RS: 'rs-com-ie', SC: 'sul-sudeste', PR: 'sul-sudeste',
  SP: 'sul-sudeste', RJ: 'sul-sudeste', MG: 'sul-sudeste', ES: 'sul-sudeste',
  MT: 'centro-oeste', MS: 'centro-oeste', GO: 'centro-oeste', DF: 'centro-oeste',
  AC: 'norte-nordeste', AM: 'norte-nordeste', AP: 'norte-nordeste', PA: 'norte-nordeste',
  RO: 'norte-nordeste', RR: 'norte-nordeste', TO: 'norte-nordeste',
  AL: 'norte-nordeste', BA: 'norte-nordeste', CE: 'norte-nordeste', MA: 'norte-nordeste',
  PB: 'norte-nordeste', PE: 'norte-nordeste', PI: 'norte-nordeste', RN: 'norte-nordeste', SE: 'norte-nordeste',
};

function defaultRegiaoPreco(uf) {
  return UF_REGIAO[(uf || '').toUpperCase()] || 'sul-sudeste';
}

function assertProfileType(tipo) {
  if (!PROFILE_TYPES.includes(tipo)) {
    throw Object.assign(new Error('Tipo inválido'), { status: 400 });
  }
}

function assertEditable(tipo) {
  assertProfileType(tipo);
  if (!EDITABLE_TYPES.includes(tipo)) {
    throw Object.assign(new Error('Este tipo é somente leitura na API territorial'), { status: 400 });
  }
}

async function buildAreasMap() {
  const { rows } = await query(
    `SELECT tipo_entidade, entidade_id, codigo_ibge FROM areas_atuacao ORDER BY tipo_entidade, entidade_id`
  );
  const areasMap = new Map();
  for (const row of rows) {
    const key = `${row.tipo_entidade}:${row.entidade_id}`;
    if (!areasMap.has(key)) areasMap.set(key, []);
    areasMap.get(key).push(row.codigo_ibge);
  }
  return areasMap;
}

// ---------- List editable cadastros ----------

async function listCadastros() {
  const [clientesRes, concessionariasRes, usersRes, areasMap] = await Promise.all([
    query(`SELECT id, nome, documento, telefone AS contato, email, endereco, cidade, uf
           FROM clientes ORDER BY nome ASC`),
    query(`SELECT id, nome, cnpj AS documento, telefone AS contato, email, endereco, cidade, uf, cor
           FROM concessionarias WHERE ativo = true ORDER BY nome ASC`),
    query(`SELECT id, nome, cpf AS documento, telefone AS contato, email, cidade, uf, tipo, cor
           FROM app_users
           WHERE tipo IN ('vendedor', 'vendedor_exterior')
           ORDER BY nome ASC`),
    buildAreasMap(),
  ]);

  const out = [];

  // Clientes
  for (const r of clientesRes.rows) {
    out.push({
      id: String(r.id),
      tipo: 'cliente',
      nome: r.nome || '',
      documento: r.documento || '',
      contato: r.contato || '',
      email: r.email || '',
      endereco: r.endereco || '',
      uf: r.uf || '',
      cidade: r.cidade || '',
      municipioId: null,
      municipioNome: r.cidade || '',
      municipios: [],
    });
  }

  // Concessionarias
  for (const r of concessionariasRes.rows) {
    const aKey = `concessionaria:${r.id}`;
    out.push({
      id: String(r.id),
      tipo: 'concessionaria',
      nome: r.nome || '',
      documento: r.documento || '',
      contato: r.contato || '',
      email: r.email || '',
      endereco: r.endereco || '',
      uf: r.uf || '',
      cidade: r.cidade || '',
      municipioId: null,
      municipioNome: r.cidade || '',
      municipios: areasMap.get(aKey) || [],
      cor: r.cor || null,
    });
  }

  // Representantes (app_users vendedor / vendedor_exterior folded into one)
  for (const r of usersRes.rows) {
    const aKey = `representante:${r.id}`;
    out.push({
      id: String(r.id),
      tipo: 'representante',
      sourceTipo: r.tipo,
      nome: r.nome || '',
      documento: r.documento || '',
      contato: r.contato || '',
      email: r.email || '',
      endereco: '',
      uf: r.uf || '',
      cidade: r.cidade || '',
      municipioId: null,
      municipioNome: r.cidade || '',
      municipios: areasMap.get(aKey) || [],
      cor: r.cor || null,
    });
  }

  return out;
}

// ---------- List instaladoras (read-only, from fretes) ----------

async function listInstaladoras() {
  const { rows } = await query(
    `SELECT id, oficina AS nome, cidade, uf FROM fretes ORDER BY oficina ASC`
  );
  return rows.map((r) => ({
    id: String(r.id),
    tipo: 'instaladora',
    nome: r.nome || '',
    documento: '',
    contato: '',
    email: '',
    endereco: '',
    uf: r.uf || '',
    cidade: r.cidade || '',
    municipioId: null,
    municipioNome: r.cidade || '',
    municipios: [],
  }));
}

// ---------- Map dataset ----------

async function getMapDataset() {
  const [cadastros, instaladoras] = await Promise.all([
    listCadastros(),
    listInstaladoras(),
  ]);

  const { rows: vendas } = await query(`
    SELECT
      p.id,
      p.cliente_nome AS cliente,
      p.cliente_cidade AS cidade,
      p.cliente_uf AS uf,
      to_char(COALESCE(p.data_resultado_venda, p.data, p.created_at), 'YYYY-MM') AS periodo,
      COALESCE(p.valor_total, 0)::numeric AS valor
    FROM propostas p
    WHERE p.resultado_venda = 'efetivada'
      AND p.status <> 'excluido'
    ORDER BY periodo DESC, p.cliente_nome ASC
  `);

  return {
    cadastros,
    instaladoras,
    vendas: vendas.map((v) => ({
      id: String(v.id),
      cliente: v.cliente || 'Cliente',
      cidade: v.cidade || '',
      uf: v.uf || '',
      municipioId: null,
      periodo: v.periodo || '',
      valor: Number(v.valor) || 0,
    })),
  };
}

// ---------- Get single ----------

async function getCadastro(tipo, id) {
  assertProfileType(tipo);

  if (tipo === 'cliente') {
    const { rows } = await query(`SELECT * FROM clientes WHERE id = $1`, [id]);
    const r = rows[0];
    if (!r) return null;
    return {
      id: String(r.id), tipo: 'cliente',
      nome: r.nome || '', documento: r.documento || '', contato: r.telefone || '',
      email: r.email || '', endereco: r.endereco || '', uf: r.uf || '', cidade: r.cidade || '',
      municipioId: null, municipioNome: r.cidade || '', municipios: [],
    };
  }

  if (tipo === 'concessionaria') {
    const { rows } = await query(`SELECT * FROM concessionarias WHERE id = $1`, [id]);
    const r = rows[0];
    if (!r) return null;
    const areas = await getAreas('concessionaria', String(r.id));
    return {
      id: String(r.id), tipo: 'concessionaria',
      nome: r.nome || '', documento: r.cnpj || '', contato: r.telefone || '',
      email: r.email || '', endereco: r.endereco || '', uf: r.uf || '', cidade: r.cidade || '',
      municipioId: null, municipioNome: r.cidade || '',
      municipios: areas.map((a) => a.codigo_ibge),
      cor: r.cor || null,
    };
  }

  if (tipo === 'instaladora') {
    const { rows } = await query(`SELECT * FROM fretes WHERE id = $1`, [id]);
    const r = rows[0];
    if (!r) return null;
    return {
      id: String(r.id), tipo: 'instaladora',
      nome: r.oficina || '', documento: '', contato: '', email: '', endereco: '',
      uf: r.uf || '', cidade: r.cidade || '', municipioId: null, municipioNome: r.cidade || '',
      municipios: [],
    };
  }

  if (tipo === 'representante') {
    const tipos = appUserTipos('representante');
    const { rows } = await query(
      `SELECT * FROM app_users WHERE id = $1 AND tipo = ANY($2::text[])`,
      [id, tipos]
    );
    const r = rows[0];
    if (!r) return null;
    const areas = await getAreas('representante', String(r.id));
    return {
      id: String(r.id), tipo: 'representante', sourceTipo: r.tipo,
      nome: r.nome || '', documento: r.cpf || '', contato: r.telefone || '',
      email: r.email || '', endereco: '', uf: r.uf || '', cidade: r.cidade || '',
      municipioId: null, municipioNome: r.cidade || '',
      municipios: areas.map((a) => a.codigo_ibge),
      cor: r.cor || null,
    };
  }

  return null;
}

// ---------- Create ----------

async function createCadastro(tipo, data) {
  assertEditable(tipo);

  if (tipo === 'cliente') {
    const { rows } = await query(
      `INSERT INTO clientes (nome, documento, telefone, email, endereco, cidade, uf)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.nome, data.documento || null, data.contato || null, data.email || null,
       data.endereco || null, data.cidade || null, data.uf || null]
    );
    return { id: String(rows[0].id), tipo: 'cliente' };
  }

  if (tipo === 'concessionaria') {
    const id = crypto.randomUUID();
    const regiao_preco = data.regiao_preco || defaultRegiaoPreco(data.uf);
    const { rows } = await query(
      `INSERT INTO concessionarias (id, nome, cnpj, telefone, email, endereco, cidade, uf, regiao_preco, ativo, cor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10) RETURNING *`,
      [id, data.nome, data.documento || null, data.contato || null, data.email || null,
       data.endereco || null, data.cidade || null, data.uf || null, regiao_preco, data.cor || null]
    );
    return { id: String(rows[0].id), tipo: 'concessionaria' };
  }

  if (tipo === 'representante') {
    if (!data.password || data.password.length < 6) {
      throw Object.assign(new Error('Senha obrigatória (mínimo 6 caracteres)'), { status: 400 });
    }
    if (!data.email) {
      throw Object.assign(new Error('E-mail obrigatório'), { status: 400 });
    }

    const { rows: existing } = await query(
      `SELECT id FROM app_users WHERE LOWER(email) = $1`, [data.email.toLowerCase().trim()]
    );
    if (existing.length) throw Object.assign(new Error('E-mail já cadastrado'), { status: 409 });

    const senhaHash = sha256Hex(data.password);
    const { rows } = await query(
      `INSERT INTO app_users (nome, email, senha, tipo, telefone, cpf, cidade, uf, cor)
       VALUES ($1, $2, $3, 'vendedor', $4, $5, $6, $7, $8) RETURNING id, tipo`,
      [data.nome, data.email.toLowerCase().trim(), senhaHash,
       data.contato || null, data.documento || null, data.cidade || null, data.uf || null, data.cor || null]
    );
    return { id: String(rows[0].id), tipo: 'representante', sourceTipo: rows[0].tipo };
  }

  throw Object.assign(new Error('Tipo inválido'), { status: 400 });
}

// ---------- Update ----------

async function updateCadastro(tipo, id, data) {
  assertEditable(tipo);

  if (tipo === 'cliente') {
    const { rows } = await query(
      `UPDATE clientes SET nome = COALESCE($1, nome), documento = COALESCE($2, documento),
       telefone = COALESCE($3, telefone), email = COALESCE($4, email),
       endereco = COALESCE($5, endereco), cidade = COALESCE($6, cidade), uf = COALESCE($7, uf)
       WHERE id = $8 RETURNING *`,
      [data.nome, data.documento, data.contato, data.email, data.endereco, data.cidade, data.uf, id]
    );
    if (!rows.length) throw Object.assign(new Error('Não encontrado'), { status: 404 });
    return { id: String(rows[0].id), tipo: 'cliente' };
  }

  if (tipo === 'concessionaria') {
    const sets = [];
    const params = [];
    const fields = { nome: data.nome, cnpj: data.documento, telefone: data.contato, email: data.email,
      endereco: data.endereco, cidade: data.cidade, uf: data.uf, cor: data.cor };
    if (data.regiao_preco) fields.regiao_preco = data.regiao_preco;
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined) { params.push(v); sets.push(`${k} = $${params.length}`); }
    });
    if (!sets.length) throw Object.assign(new Error('Nenhum campo'), { status: 400 });
    params.push(id);
    const { rows } = await query(
      `UPDATE concessionarias SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params
    );
    if (!rows.length) throw Object.assign(new Error('Não encontrado'), { status: 404 });
    return { id: String(rows[0].id), tipo: 'concessionaria' };
  }

  if (tipo === 'representante') {
    const sets = [];
    const params = [];
    const fields = { nome: data.nome, cpf: data.documento, telefone: data.contato, email: data.email,
      cidade: data.cidade, uf: data.uf, cor: data.cor };
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined) { params.push(v); sets.push(`${k} = $${params.length}`); }
    });
    if (!sets.length) throw Object.assign(new Error('Nenhum campo'), { status: 400 });
    params.push(id);
    const { rows } = await query(
      `UPDATE app_users SET ${sets.join(', ')} WHERE id = $${params.length} AND tipo IN ('vendedor', 'vendedor_exterior') RETURNING id, tipo`,
      params
    );
    if (!rows.length) throw Object.assign(new Error('Não encontrado'), { status: 404 });
    return { id: String(rows[0].id), tipo: 'representante', sourceTipo: rows[0].tipo };
  }

  throw Object.assign(new Error('Tipo inválido'), { status: 400 });
}

// ---------- Delete ----------

async function deleteCadastro(tipo, id) {
  assertEditable(tipo);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const dbAreaType = areaTypeOf(tipo);
    if (dbAreaType) {
      await client.query(
        `DELETE FROM areas_atuacao WHERE tipo_entidade = $1 AND entidade_id = $2`,
        [dbAreaType, String(id)]
      );
    }

    let deleted = false;
    if (tipo === 'cliente') {
      const { rowCount } = await client.query(`DELETE FROM clientes WHERE id = $1`, [id]);
      deleted = rowCount > 0;
    } else if (tipo === 'concessionaria') {
      const { rowCount } = await client.query(`DELETE FROM concessionarias WHERE id = $1`, [id]);
      deleted = rowCount > 0;
    } else if (tipo === 'representante') {
      const { rowCount } = await client.query(
        `DELETE FROM app_users WHERE id = $1 AND tipo IN ('vendedor', 'vendedor_exterior')`,
        [id]
      );
      deleted = rowCount > 0;
    }

    if (!deleted) {
      throw Object.assign(new Error('Não encontrado'), { status: 404 });
    }

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------- Save areas (delegates to existing replaceAreas) ----------

async function saveAreas(tipo, id, areas, { transfer = false } = {}) {
  if (!AREA_TYPES.has(tipo)) {
    throw Object.assign(new Error('Este tipo não possui áreas de atuação'), { status: 400 });
  }

  const dbType = areaTypeOf(tipo);
  return replaceAreas(dbType, String(id), areas, { transfer });
}

module.exports = {
  PROFILE_TYPES,
  EDITABLE_TYPES,
  AREA_TYPES,
  listCadastros,
  listInstaladoras,
  getMapDataset,
  getCadastro,
  createCadastro,
  updateCadastro,
  deleteCadastro,
  saveAreas,
};
