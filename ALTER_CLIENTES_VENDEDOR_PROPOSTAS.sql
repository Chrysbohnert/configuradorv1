-- ============================================================
-- ALTERAÇÕES MANUAIS NECESSÁRIAS NO POSTGRES DE PRODUÇÃO
-- Execute este script manualmente (fora do fluxo automático).
-- Reaproveita a tabela `clientes` já existente:
--   id, nome, email, telefone, documento, endereco, observacoes,
--   created_at, updated_at, inscricao_estadual
-- ============================================================

-- 1) Vínculo cliente -> vendedor responsável (reaproveita app_users)
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS vendedor_id INTEGER REFERENCES app_users(id) ON DELETE SET NULL;

-- 2) Região do cliente (mesmo formato de string já usado em
--    user.regioes_operacao / regiaoClienteSelecionada, ex:
--    'Norte-Nordeste', 'Sul-Sudeste', 'Centro-Oeste',
--    'Rio Grande do Sul', 'Comércio Exterior')
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS regiao VARCHAR(100);

-- 3) Tipo de venda (mesmo valor usado em PaymentPolicy.tipoCliente / pagamentoData.tipoPagamento)
--    'cliente' = venda direta | 'revenda' = venda para revenda
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS tipo_venda VARCHAR(20)
  CHECK (tipo_venda IN ('cliente', 'revenda'));

-- 4) Participação de revenda (mesmo valor usado em PaymentPolicy.participacaoRevenda /
--    pagamentoData.participacaoRevenda) — só é relevante quando tipo_venda = 'cliente'
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS participacao_revenda VARCHAR(10)
  CHECK (participacao_revenda IN ('sim', 'nao'));

-- 5) Tipo de cliente / IE (mesmo valor usado em PaymentPolicy.tipoIE)
--    'produtor' = Produtor Rural (equivale a revendaTemIE='sim' / rs-com-ie)
--    'cnpj_cpf' = CNPJ/CPF       (equivale a revendaTemIE='nao' / rs-sem-ie)
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(20)
  CHECK (tipo_cliente IN ('produtor', 'cnpj_cpf'));

-- Índices para busca/filtro por vendedor e nome
CREATE INDEX IF NOT EXISTS idx_clientes_vendedor_id ON clientes(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(LOWER(nome));
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(documento);

-- ============================================================
-- 6) Vínculo proposta -> cliente cadastrado (evita duplicar clientes
--    a cada proposta; reaproveita cadastro existente)
-- ============================================================
ALTER TABLE propostas
  ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_propostas_cliente_id ON propostas(cliente_id);

-- ============================================================
-- FIM. Nenhum dado existente é removido ou alterado.
-- Todas as colunas novas são opcionais (nullable) e não quebram
-- registros já existentes em `clientes` ou `propostas`.
-- ============================================================
