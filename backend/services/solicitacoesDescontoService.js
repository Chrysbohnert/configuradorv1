/**
 * services/solicitacoesDescontoService.js
 * Operações na tabela solicitacoes_desconto.
 */

const { query } = require('../db/pool');
const { randomUUID } = require('crypto');

async function criar(dados) {
  const valorBase = Number(dados.valor_base) || 0;
  const valorFinal = dados.valor_final_desejado != null ? Number(dados.valor_final_desejado) : null;

  // Se veio valor final desejado, calcular desconto em R$ e %
  let descontoValor = 0;
  let percentualCalc = 0;
  if (valorFinal != null && valorBase > 0) {
    descontoValor = valorBase - valorFinal;
    percentualCalc = (descontoValor / valorBase) * 100;
  }

  // Montar justificativa descritiva (inclui dados extras que não têm coluna própria)
  const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  let justificativaFinal = '';

  // Prefixo: tipo do solicitante
  if (dados.tipo_solicitante && dados.tipo_solicitante !== 'vendedor') {
    justificativaFinal = `[${dados.tipo_solicitante}]`;
  }

  // Corpo: detalhes do desconto
  if (valorFinal != null && valorBase > 0) {
    justificativaFinal += ` Valor original: ${fmt(valorBase)} | Valor solicitado: ${fmt(valorFinal)} | Desconto: ${fmt(descontoValor)} | Percentual: ${percentualCalc.toFixed(2)}%`;
  } else if (dados.desconto_desejado) {
    justificativaFinal += ` Desconto desejado: ${dados.desconto_desejado}%`;
  }

  // Sufixo: justificativa livre do usuário
  if (dados.justificativa) {
    justificativaFinal += ` | ${dados.justificativa}`;
  }

  justificativaFinal = justificativaFinal.trim();

  // INSERT usa APENAS colunas garantidas da tabela original
  const id = randomUUID();
  const { rows } = await query(
    `INSERT INTO solicitacoes_desconto
      (id, vendedor_id, vendedor_nome, vendedor_email, equipamento_descricao,
       valor_base, desconto_atual, justificativa, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendente')
     RETURNING *`,
    [
      id,
      dados.vendedor_id,
      dados.vendedor_nome,
      dados.vendedor_email || null,
      dados.equipamento_descricao,
      valorBase,
      dados.desconto_atual != null ? Number(dados.desconto_atual) : 0,
      justificativaFinal || null
    ]
  );
  return rows[0];
}

async function listarPendentes() {
  const { rows } = await query(
    `SELECT id, vendedor_nome, vendedor_id, vendedor_email,
            equipamento_descricao, valor_base, desconto_atual,
            justificativa, status, created_at
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
  // descontoAprovado = valor final aprovado em R$ (não percentual)
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
