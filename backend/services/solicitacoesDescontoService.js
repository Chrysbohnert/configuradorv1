/**
 * services/solicitacoesDescontoService.js
 * Operações na tabela solicitacoes_desconto.
 */

const { query } = require('../db/pool');

async function criar(dados) {
  const { rows } = await query(
    `INSERT INTO solicitacoes_desconto
      (vendedor_id, vendedor_nome, vendedor_email, equipamento_descricao,
       valor_base, desconto_atual, desconto_desejado, justificativa, tipo_solicitante, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pendente')
     RETURNING *`,
    [
      dados.vendedor_id,
      dados.vendedor_nome,
      dados.vendedor_email || null,
      dados.equipamento_descricao,
      dados.valor_base,
      dados.desconto_atual != null ? dados.desconto_atual : 0,
      dados.desconto_desejado || null,
      dados.justificativa || null,
      dados.tipo_solicitante || 'vendedor'
    ]
  );
  return rows[0];
}

async function listarPendentes() {
  const { rows } = await query(
    `SELECT id, vendedor_nome, vendedor_id, vendedor_email,
            equipamento_descricao, valor_base, desconto_atual,
            desconto_desejado, justificativa, tipo_solicitante, status, created_at
     FROM solicitacoes_desconto
     WHERE status = 'pendente'
     ORDER BY created_at DESC`
  );
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await query(
    `SELECT * FROM solicitacoes_desconto WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function buscarPorVendedor(vendedorId) {
  const { rows } = await query(
    `SELECT * FROM solicitacoes_desconto 
     WHERE vendedor_id = $1 
     ORDER BY created_at DESC`,
    [vendedorId]
  );
  return rows;
}

async function aprovar(id, descontoAprovado, aprovadorId, aprovadorNome, observacao) {
  const { rows } = await query(
    `UPDATE solicitacoes_desconto
     SET status = 'aprovado',
         desconto_aprovado = $1,
         aprovador_id = $2,
         aprovador_nome = $3,
         observacao_gestor = $4,
         respondido_at = NOW(),
         updated_at = NOW()
     WHERE id = $5 AND status = 'pendente'
     RETURNING *`,
    [descontoAprovado, aprovadorId, aprovadorNome, observacao || null, id]
  );
  return rows[0] || null;
}

async function negar(id, aprovadorId, aprovadorNome, observacao) {
  const { rows } = await query(
    `UPDATE solicitacoes_desconto
     SET status = 'negado',
         aprovador_id = $1,
         aprovador_nome = $2,
         observacao_gestor = $3,
         respondido_at = NOW(),
         updated_at = NOW()
     WHERE id = $4 AND status = 'pendente'
     RETURNING *`,
    [aprovadorId, aprovadorNome, observacao || null, id]
  );
  return rows[0] || null;
}

module.exports = { criar, listarPendentes, buscarPorId, buscarPorVendedor, aprovar, negar };
