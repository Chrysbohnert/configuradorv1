-- ============================================================
-- TABELA: metas_vendedores
-- Armazena metas mensais de cada vendedor (propostas + valor)
-- Execute este SQL no Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS metas_vendedores (
  id             BIGSERIAL PRIMARY KEY,
  vendedor_id    INTEGER NOT NULL,
  ano            INTEGER NOT NULL,
  mes            INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  meta_propostas INTEGER NOT NULL DEFAULT 0,
  meta_valor     NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (vendedor_id, ano, mes)
);

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_metas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_metas_updated_at ON metas_vendedores;
CREATE TRIGGER trg_metas_updated_at
  BEFORE UPDATE ON metas_vendedores
  FOR EACH ROW EXECUTE FUNCTION update_metas_updated_at();

-- RLS
ALTER TABLE metas_vendedores ENABLE ROW LEVEL SECURITY;

-- Admins podem ler e escrever tudo
CREATE POLICY "metas_admin_all" ON metas_vendedores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (auth.uid())::text::integer
        AND tipo IN ('admin', 'admin_concessionaria')
    )
  );

-- Vendedores leem apenas as próprias metas
CREATE POLICY "metas_vendedor_read_own" ON metas_vendedores
  FOR SELECT
  USING (vendedor_id = (auth.uid())::text::integer);
