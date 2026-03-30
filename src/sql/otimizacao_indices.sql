-- =====================================================
-- OTIMIZAÇÃO DE PERFORMANCE - ÍNDICES ESTRATÉGICOS
-- DESCRIÇÃO: Índices para acelerar queries mais frequentes
-- EXECUTAR: Copiar e colar no Supabase SQL Editor
-- =====================================================

-- ===== TABELA: users =====
-- Queries frequentes: filtro por tipo, região, concessionária
CREATE INDEX IF NOT EXISTS idx_users_tipo ON public.users(tipo);
CREATE INDEX IF NOT EXISTS idx_users_regiao ON public.users(regiao);
CREATE INDEX IF NOT EXISTS idx_users_concessionaria_id ON public.users(concessionaria_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ===== TABELA: guindastes =====
-- Queries frequentes: filtro por subgrupo, grupo, busca de protótipos
CREATE INDEX IF NOT EXISTS idx_guindastes_subgrupo ON public.guindastes(subgrupo);
CREATE INDEX IF NOT EXISTS idx_guindastes_grupo ON public.guindastes(grupo);
CREATE INDEX IF NOT EXISTS idx_guindastes_is_prototipo ON public.guindastes(is_prototipo);
CREATE INDEX IF NOT EXISTS idx_guindastes_codigo_referencia ON public.guindastes(codigo_referencia);

-- ===== TABELA: propostas =====
-- Queries frequentes: filtro por vendedor, data, número
CREATE INDEX IF NOT EXISTS idx_propostas_vendedor_id ON public.propostas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_propostas_data_desc ON public.propostas(data DESC);
CREATE INDEX IF NOT EXISTS idx_propostas_numero ON public.propostas(numero_proposta);
CREATE INDEX IF NOT EXISTS idx_propostas_vendedor_data ON public.propostas(vendedor_id, data DESC);

-- ===== TABELA: fretes =====
-- Queries frequentes: filtro por UF, cidade, oficina
CREATE INDEX IF NOT EXISTS idx_fretes_uf ON public.fretes(uf);
CREATE INDEX IF NOT EXISTS idx_fretes_cidade ON public.fretes(cidade);
CREATE INDEX IF NOT EXISTS idx_fretes_oficina ON public.fretes(oficina);
CREATE INDEX IF NOT EXISTS idx_fretes_uf_cidade ON public.fretes(uf, cidade);

-- ===== TABELA: precos_guindaste_regiao =====
-- Queries frequentes: busca por guindaste e região
CREATE INDEX IF NOT EXISTS idx_precos_guindaste_regiao_guindaste ON public.precos_guindaste_regiao(guindaste_id);
CREATE INDEX IF NOT EXISTS idx_precos_guindaste_regiao_regiao ON public.precos_guindaste_regiao(regiao);
CREATE INDEX IF NOT EXISTS idx_precos_guindaste_regiao_combo ON public.precos_guindaste_regiao(guindaste_id, regiao);

-- ===== TABELA: concessionaria_precos =====
-- Queries frequentes: busca por concessionária e guindaste
CREATE INDEX IF NOT EXISTS idx_concessionaria_precos_concessionaria ON public.concessionaria_precos(concessionaria_id);
CREATE INDEX IF NOT EXISTS idx_concessionaria_precos_guindaste ON public.concessionaria_precos(guindaste_id);

-- ===== TABELA: precos_compra_concessionaria_por_regiao =====
-- Queries frequentes: busca por guindaste e região
CREATE INDEX IF NOT EXISTS idx_precos_compra_guindaste ON public.precos_compra_concessionaria_por_regiao(guindaste_id);
CREATE INDEX IF NOT EXISTS idx_precos_compra_regiao ON public.precos_compra_concessionaria_por_regiao(regiao);

-- ===== TABELA: eventos_logistica =====
-- Queries frequentes: filtro por data
CREATE INDEX IF NOT EXISTS idx_eventos_logistica_data ON public.eventos_logistica(data);

-- ===== TABELA: graficos_carga =====
-- Queries frequentes: busca por nome
CREATE INDEX IF NOT EXISTS idx_graficos_carga_nome ON public.graficos_carga(nome);

-- ===== TABELA: clientes =====
-- Queries frequentes: busca por nome
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);

-- ===== TABELA: caminhoes =====
-- Queries frequentes: ordenação por data de criação
CREATE INDEX IF NOT EXISTS idx_caminhoes_created_at_desc ON public.caminhoes(created_at DESC);

-- NOTA: payment_plans_published e prototype_payment_plans_published são VIEWS, não tabelas
-- Views não suportam índices. Os índices devem ser criados nas tabelas base (payment_plan_items, etc)

-- ===== VERIFICAÇÃO =====
DO $$
BEGIN
  RAISE NOTICE '✅ Índices de otimização criados com sucesso!';
  RAISE NOTICE '📊 Performance de queries deve melhorar significativamente.';
  RAISE NOTICE '💡 Dica: Execute ANALYZE após criar índices para atualizar estatísticas.';
END $$;

-- Atualizar estatísticas do banco (recomendado após criar índices)
ANALYZE;
